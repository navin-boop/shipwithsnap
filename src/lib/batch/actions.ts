"use server";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Parcel } from "@/lib/db/schema";
import { buyLabel, getDefaultShipFrom, quoteShipment } from "@/lib/ship/service";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { deliverWebhooks } from "@/lib/webhooks/outbound";
import { ordersFromCsv } from "./csv";

const DEFAULT_PARCEL: Parcel = { type: "box", lengthIn: 12, widthIn: 9, heightIn: 4, weightOz: 16 };

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session.user.accountId) });
  if (!account) throw new Error("Account not found");
  return { account, userId: session.user.id };
}

async function csvStore(accountId: string) {
  const existing = await db().query.stores.findFirst({ where: and(eq(schema.stores.accountId, accountId), eq(schema.stores.platform, "csv")) });
  if (existing) return existing;
  const [s] = await db().insert(schema.stores).values({ accountId, platform: "csv", name: "CSV uploads" }).returning();
  return s;
}

export type ImportResult = { ok: true; imported: number; skipped: number; errors: string[] } | { ok: false; error: string };

/** Upload a CSV of orders. Rows with an order number already imported are skipped. */
export async function importCsv(formData: FormData): Promise<ImportResult> {
  const { account } = await requireAccount();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose a CSV file." };
  if (file.size > 2_000_000) return { ok: false, error: "That file is over 2 MB — split it up." };
  const { orders, errors } = ordersFromCsv(await file.text());
  if (!orders.length) return { ok: false, error: errors[0] ?? "No orders found in that file." };
  const store = await csvStore(account.id);
  const inserted = await db()
    .insert(schema.orders)
    .values(orders.map((o) => ({ accountId: account.id, storeId: store.id, externalId: o.externalId, number: o.number, shipTo: o.shipTo, items: o.items, parcel: o.parcel })))
    .onConflictDoNothing({ target: [schema.orders.storeId, schema.orders.externalId] })
    .returning({ id: schema.orders.id });
  await db().update(schema.stores).set({ lastSyncedAt: new Date() }).where(eq(schema.stores.id, store.id));
  revalidatePath("/batch");
  return { ok: true, imported: inserted.length, skipped: orders.length - inserted.length, errors };
}

export type RatedRow = {
  orderId: string;
  shipmentId: string | null;
  quotes: Array<{ id: string; carrier: string; serviceName: string; priceCents: number; retailCents: number | null; estDays: number | null }>;
  chosenQuoteId: string | null;
  note: string | null;
  error: string | null;
};

/** Verify each order's address, create a shipment, rate it, pre-pick the cheapest. */
export async function rateOrders(orderIds: string[]): Promise<{ ok: true; rows: RatedRow[] } | { ok: false; error: string }> {
  const { account, userId } = await requireAccount();
  const ids = z.array(z.string().uuid()).min(1).max(200).safeParse(orderIds);
  if (!ids.success) return { ok: false, error: "Select at least one order." };
  const from = await getDefaultShipFrom(account);
  if (!from) return { ok: false, error: "Add a ship-from address on the Ship page first." };
  const orders = await db().query.orders.findMany({ where: and(eq(schema.orders.accountId, account.id), inArray(schema.orders.id, ids.data), isNull(schema.orders.fulfilledAt)) });
  const provider = getShippingProvider();

  const rows: RatedRow[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < orders.length; i += CONCURRENCY) {
    const slice = orders.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (o): Promise<RatedRow> => {
        try {
          const v = await provider.verifyAddress({ ...o.shipTo, country: o.shipTo.country ?? "US" });
          if (!v.ok || !v.address) return { orderId: o.id, shipmentId: null, quotes: [], chosenQuoteId: null, note: null, error: v.errors?.[0] ?? "Address could not be verified." };
          const parcel = o.parcel ?? DEFAULT_PARCEL;
          const quote = await quoteShipment(account, { to: { ...v.address, name: o.shipTo.name, email: o.shipTo.email ?? null, phone: o.shipTo.phone ?? null }, toResidential: v.residential ?? null, fromId: from.id, parcel, extras: {}, createdBy: userId, orderId: o.id });
          const cheapest = quote.rates[0];
          return { orderId: o.id, shipmentId: quote.shipmentId, quotes: quote.rates.map((r) => ({ id: r.id, carrier: r.carrier, serviceName: r.serviceName, priceCents: r.priceCents, retailCents: r.retailCents, estDays: r.estDays })), chosenQuoteId: cheapest?.id ?? null, note: o.parcel ? null : "No weight in the file — assumed 1 lb, 12×9×4", error: cheapest ? null : "No rates for this package." };
        } catch (err) {
          return { orderId: o.id, shipmentId: null, quotes: [], chosenQuoteId: null, note: null, error: err instanceof ProviderError ? err.message : "Rating failed." };
        }
      }),
    );
    rows.push(...results);
  }
  return { ok: true, rows };
}

export type BuyBatchResult = { ok: true; batchId: string; okCount: number; failed: Array<{ orderId: string; error: string }> } | { ok: false; error: string };

/** Buy every rated row (design/BuyLabelFlow.dc.html "Batch = this ×N"): parallel, partial-failure safe. */
export async function buyBatch(rows: Array<{ orderId: string; shipmentId: string; rateQuoteId: string }>): Promise<BuyBatchResult> {
  const { account, userId } = await requireAccount();
  if (!rows.length) return { ok: false, error: "Nothing to buy." };
  const [batch] = await db().insert(schema.batches).values({ accountId: account.id, status: "buying", createdBy: userId }).returning();
  await db().update(schema.shipments).set({ batchId: batch.id }).where(inArray(schema.shipments.id, rows.map((r) => r.shipmentId)));

  const failed: Array<{ orderId: string; error: string }> = [];
  let okCount = 0;
  const CONCURRENCY = 4;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          await buyLabel(account, { shipmentId: r.shipmentId, rateQuoteId: r.rateQuoteId, idempotencyKey: `batch:${batch.id}:${r.shipmentId}` });
          await db().update(schema.orders).set({ shipmentId: r.shipmentId, fulfilledAt: new Date() }).where(eq(schema.orders.id, r.orderId));
          okCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Buy failed";
          failed.push({ orderId: r.orderId, error: msg });
          await db().update(schema.shipments).set({ batchError: msg }).where(eq(schema.shipments.id, r.shipmentId));
        }
      }),
    );
  }
  const status = failed.length ? (okCount ? "partial" : "partial") : "done";
  await db().update(schema.batches).set({ status, counts: { ok: okCount, failed: failed.length }, updatedAt: new Date() }).where(eq(schema.batches.id, batch.id));
  await deliverWebhooks(account.id, failed.length ? "batch.partial" : "batch.completed", { batch_id: batch.id, ok: okCount, failed: failed.length });
  revalidatePath("/batch");
  revalidatePath("/shipments");
  return { ok: true, batchId: batch.id, okCount, failed };
}

export async function deleteOrders(orderIds: string[]): Promise<{ ok: boolean }> {
  const { account } = await requireAccount();
  await db().delete(schema.orders).where(and(eq(schema.orders.accountId, account.id), inArray(schema.orders.id, orderIds), isNull(schema.orders.fulfilledAt)));
  revalidatePath("/batch");
  return { ok: true };
}

export async function listOpenOrders(accountId: string) {
  return db().query.orders.findMany({ where: and(eq(schema.orders.accountId, accountId), isNull(schema.orders.fulfilledAt)), orderBy: desc(schema.orders.createdAt), limit: 200 });
}
