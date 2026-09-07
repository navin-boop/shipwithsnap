import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { toAddressInput } from "@/lib/ship/service";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { deliverWebhooks } from "@/lib/webhooks/outbound";
import { notifyPickup } from "@/lib/email/notify";

// Carrier pickups. Account-scoped core, shared by the server actions and the public API.

export type PickupView = {
  id: string;
  status: string;
  carrier: string | null;
  serviceCode: string | null;
  priceCents: number | null;
  confirmation: string | null;
  minDatetime: string;
  maxDatetime: string;
  instructions: string | null;
  address: string;
  labelTracking: string | null;
  rates: Array<{ carrier: string; serviceCode: string; priceCents: number }>;
  messages: string[];
  createdAt: string;
};

export function pickupView(p: schema.Pickup, address: schema.Address | undefined, tracking: string | null): PickupView {
  return {
    id: p.id, status: p.status, carrier: p.carrier, serviceCode: p.serviceCode, priceCents: p.priceCents, confirmation: p.confirmation,
    minDatetime: p.minDatetime.toISOString(), maxDatetime: p.maxDatetime.toISOString(), instructions: p.instructions,
    address: address ? `${address.street1}, ${address.city}, ${address.state} ${address.zip}` : "—",
    labelTracking: tracking, rates: p.rates, messages: p.messages, createdAt: p.createdAt.toISOString(),
  };
}

export class PickupError extends Error {}

export async function listPickupsFor(accountId: string): Promise<PickupView[]> {
  const rows = await db().query.pickups.findMany({ where: eq(schema.pickups.accountId, accountId), orderBy: desc(schema.pickups.createdAt), limit: 100 });
  const addrIds = [...new Set(rows.map((r) => r.addressId))];
  const labelIds = rows.map((r) => r.labelId).filter((x): x is string => !!x);
  const [addrs, labels] = await Promise.all([
    addrIds.length ? db().query.addresses.findMany({ where: inArray(schema.addresses.id, addrIds) }) : [],
    labelIds.length ? db().query.labels.findMany({ where: inArray(schema.labels.id, labelIds) }) : [],
  ]);
  return rows.map((r) => pickupView(r, addrs.find((a) => a.id === r.addressId), labels.find((l) => l.id === r.labelId)?.trackingNumber ?? null));
}

/** Labels bought in the last 7 days that haven't been scanned yet — candidates for a pickup. */
export async function listPickupCandidatesFor(accountId: string) {
  const since = new Date(Date.now() - 7 * 86400_000);
  const rows = await db()
    .select({ labelId: schema.labels.id, trackingNumber: schema.labels.trackingNumber, carrier: schema.labels.carrier, serviceName: schema.labels.serviceName, shipFromId: schema.shipments.shipFromId, purchasedAt: schema.labels.purchasedAt })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .where(and(eq(schema.labels.accountId, accountId), isNull(schema.labels.voidedAt), eq(schema.shipments.status, "label_created")))
    .orderBy(desc(schema.labels.purchasedAt))
    .limit(200);
  return rows
    .filter((r) => r.purchasedAt >= since)
    .map((r) => ({ labelId: r.labelId, trackingNumber: r.trackingNumber, carrier: r.carrier, serviceName: r.serviceName, shipFromId: r.shipFromId }));
}

/** Step 1: ask the carriers for pickup rates for a label's ship-from address and window. */
export async function requestPickupFor(accountId: string, input: { labelId: string; minDatetime: Date; maxDatetime: Date; instructions?: string | null }): Promise<PickupView> {
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, input.labelId), eq(schema.labels.accountId, accountId)) });
  if (!label) throw new PickupError("Label not found.");
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  const from = shipment ? await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipFromId) }) : null;
  if (!shipment?.providerShipmentId || !from) throw new PickupError("Shipment not found.");
  // Carriers dispatch a driver to a person, so the pickup address needs a name and a phone.
  if (!from.phone) throw new PickupError("Add a phone number to your ship-from address first — carriers won't dispatch a driver without one. Settings → Ship-from addresses.");
  if (!from.name && !from.company) throw new PickupError("Add a name or company to your ship-from address so the driver knows who to ask for.");
  if (!(input.maxDatetime > input.minDatetime)) throw new PickupError("The window must end after it starts.");
  if (input.minDatetime.getTime() < Date.now() - 3600_000) throw new PickupError("Pick a window in the future.");

  const r = await getShippingProvider().createPickup({
    address: toAddressInput(from), providerShipmentId: shipment.providerShipmentId,
    minDatetime: input.minDatetime.toISOString(), maxDatetime: input.maxDatetime.toISOString(),
    instructions: input.instructions?.trim() || "Packages are ready for collection.", reference: label.id,
  });
  const [row] = await db()
    .insert(schema.pickups)
    .values({ accountId, addressId: from.id, labelId: label.id, providerPickupId: r.providerPickupId, rates: r.rates, minDatetime: input.minDatetime, maxDatetime: input.maxDatetime, instructions: input.instructions ?? null, status: r.rates.length ? "quoted" : "failed", messages: r.messages, confirmation: r.confirmation })
    .returning();
  if (!r.rates.length) throw new PickupError(r.messages[0] ?? "No carrier offers a pickup for that window. Try another day, or drop it off.");
  return pickupView(row, from, label.trackingNumber);
}

/** Step 2: schedule it with the chosen carrier/service. */
export async function schedulePickupFor(accountId: string, pickupId: string, carrier: string, serviceCode: string): Promise<PickupView> {
  const row = await db().query.pickups.findFirst({ where: and(eq(schema.pickups.id, pickupId), eq(schema.pickups.accountId, accountId)) });
  if (!row?.providerPickupId) throw new PickupError("Pickup not found.");
  const rate = row.rates.find((r) => r.carrier === carrier && r.serviceCode === serviceCode);
  if (!rate) throw new PickupError("That option is no longer available.");
  const r = await getShippingProvider().buyPickup(row.providerPickupId, carrier, serviceCode);
  const [updated] = await db().update(schema.pickups).set({ status: r.status === "scheduled" ? "scheduled" : "failed", carrier, serviceCode, priceCents: rate.priceCents, confirmation: r.confirmation, messages: r.messages }).where(eq(schema.pickups.id, row.id)).returning();
  if (r.status !== "scheduled") throw new PickupError(r.messages[0] ?? "The carrier declined the pickup.");
  await deliverWebhooks(accountId, "pickup.scheduled", { pickup_id: row.id, carrier, confirmation: r.confirmation, price_cents: rate.priceCents });
  await notifyPickup({ accountId, pickupId: row.id, state: "confirmed" });
  const address = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, row.addressId) });
  return pickupView(updated, address, null);
}

export async function cancelPickupFor(accountId: string, pickupId: string): Promise<PickupView> {
  const row = await db().query.pickups.findFirst({ where: and(eq(schema.pickups.id, pickupId), eq(schema.pickups.accountId, accountId)) });
  if (!row?.providerPickupId) throw new PickupError("Pickup not found.");
  if (row.status === "scheduled") await getShippingProvider().cancelPickup(row.providerPickupId);
  const [updated] = await db().update(schema.pickups).set({ status: "canceled" }).where(eq(schema.pickups.id, row.id)).returning();
  if (row.status === "scheduled") {
    await deliverWebhooks(accountId, "pickup.canceled", { pickup_id: row.id, carrier: row.carrier });
    await notifyPickup({ accountId, pickupId: row.id, state: "cancelled" });
  }
  const address = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, row.addressId) });
  return pickupView(updated, address, null);
}

export function pickupErrorMessage(err: unknown): string {
  if (err instanceof PickupError) return err.message;
  if (err instanceof ProviderError) {
    // The carriers' own pickup systems are slow and go down; say so in plain words.
    if (/timeout|deadline exceeded|Client\.Timeout/i.test(err.message)) return "The carrier's pickup system didn't answer in time. Try again in a minute, or drop the package off.";
    if (/eligib/i.test(err.message)) return "That address isn't eligible for a carrier pickup on that day. Try another day, or drop the package off.";
    return err.message;
  }
  return "Couldn't reach the carrier — try again.";
}
