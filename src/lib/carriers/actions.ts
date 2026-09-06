"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { CustomsDefaults, RateRules } from "@/lib/db/schema";
import { getShippingProvider, ProviderError, type CarrierMetadataInfo, type CarrierTypeInfo } from "@/lib/shipping";

// Settings → Carriers: your own UPS/FedEx/DHL accounts, service filters, auto-pick rules, customs defaults.

async function requireOwner() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  if (session.user.role !== "owner") throw new Error("Only an owner can change this");
  return session.user;
}

export type CarrierAccountView = { id: string; carrier: string; type: string; description: string | null; enabled: boolean; createdAt: string };

export async function listCarrierAccounts(): Promise<CarrierAccountView[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const rows = await db().query.carrierAccounts.findMany({ where: eq(schema.carrierAccounts.accountId, session.user.accountId), orderBy: schema.carrierAccounts.createdAt });
  return rows.map((r) => ({ id: r.id, carrier: r.carrier, type: r.type, description: r.description, enabled: r.enabled, createdAt: r.createdAt.toISOString() }));
}

const SUPPORTED_TYPES = ["UpsAccount", "FedexAccount", "DhlExpressAccount", "UpsMailInnovationsAccount", "UpsSurepostAccount", "FedexSmartpostAccount"];

/** Carrier types customers can connect themselves (credentials go straight to EasyPost). */
export async function listCarrierTypes(): Promise<CarrierTypeInfo[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  try {
    const all = await getShippingProvider().listCarrierTypes();
    const mine = all.filter((t) => SUPPORTED_TYPES.includes(t.type));
    return mine.length ? mine : all.slice(0, 12);
  } catch (err) {
    // EasyPost only lists carrier types for production keys, so this is empty in test mode.
    console.warn("carrier types unavailable:", err instanceof Error ? err.message : err);
    return [];
  }
}

export type CarrierResult = { ok: true } | { ok: false; error: string };

const connectInput = z.object({ type: z.string().min(1), description: z.string().trim().max(80).optional(), credentials: z.record(z.string(), z.string().trim().max(200)) });

export async function connectCarrierAccount(raw: z.input<typeof connectInput>): Promise<CarrierResult> {
  const user = await requireOwner();
  const p = connectInput.safeParse(raw);
  if (!p.success) return { ok: false, error: "Fill in the account details." };
  const creds = Object.fromEntries(Object.entries(p.data.credentials).filter(([, v]) => v !== ""));
  if (!Object.keys(creds).length) return { ok: false, error: "Enter your carrier account details." };
  try {
    const a = await getShippingProvider().createCarrierAccount({ type: p.data.type, description: p.data.description || null, credentials: creds, reference: user.accountId });
    await db().insert(schema.carrierAccounts).values({ accountId: user.accountId, carrier: a.readable.replace(/Account$/, "").trim(), type: a.type, description: a.description, providerCarrierAccountId: a.providerCarrierAccountId });
    revalidatePath("/settings/carriers");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ProviderError ? err.message : "The carrier rejected those details." };
  }
}

export async function toggleCarrierAccount(id: string, enabled: boolean): Promise<CarrierResult> {
  const user = await requireOwner();
  await db().update(schema.carrierAccounts).set({ enabled }).where(and(eq(schema.carrierAccounts.id, id), eq(schema.carrierAccounts.accountId, user.accountId)));
  revalidatePath("/settings/carriers");
  return { ok: true };
}

export async function removeCarrierAccount(id: string): Promise<CarrierResult> {
  const user = await requireOwner();
  const row = await db().query.carrierAccounts.findFirst({ where: and(eq(schema.carrierAccounts.id, id), eq(schema.carrierAccounts.accountId, user.accountId)) });
  if (!row) return { ok: false, error: "Not found." };
  try {
    await getShippingProvider().deleteCarrierAccount(row.providerCarrierAccountId);
  } catch (err) {
    if (!(err instanceof ProviderError && /not found/i.test(err.message))) return { ok: false, error: err instanceof ProviderError ? err.message : "Couldn't disconnect — try again." };
  }
  await db().delete(schema.carrierAccounts).where(eq(schema.carrierAccounts.id, row.id));
  revalidatePath("/settings/carriers");
  return { ok: true };
}

/** Services + predefined packages per carrier, from EasyPost's carrier metadata. */
export async function getCarrierMetadata(): Promise<CarrierMetadataInfo[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  try {
    return await getShippingProvider().carrierMetadata(["usps", "ups", "fedex"]);
  } catch {
    return [];
  }
}

const rulesInput = z.object({
  mode: z.enum(["cheapest", "fastest", "cheapest_within_days", "preferred_carrier"]),
  maxDays: z.number().int().min(1).max(10).optional(),
  preferredCarrier: z.string().max(20).optional(),
  hiddenServices: z.array(z.string()).max(200).optional(),
  hiddenCarriers: z.array(z.string()).max(10).optional(),
});

export async function updateRateRules(raw: RateRules): Promise<CarrierResult> {
  const user = await requireOwner();
  const p = rulesInput.safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the rule." };
  await db().update(schema.accounts).set({ rateRules: p.data }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings/carriers");
  revalidatePath("/ship");
  return { ok: true };
}

export async function updateCustomsDefaults(raw: CustomsDefaults): Promise<CarrierResult> {
  const user = await requireOwner();
  const p = z.object({ signer: z.string().trim().max(80).nullable().optional(), eelPfc: z.string().trim().max(40).nullable().optional(), contentsType: z.string().max(40).nullable().optional(), originCountry: z.string().length(2).nullable().optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the customs defaults." };
  await db().update(schema.accounts).set({ customsDefaults: p.data }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings/international");
  return { ok: true };
}
