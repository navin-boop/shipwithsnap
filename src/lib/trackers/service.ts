import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { ingestTrackerDetails } from "@/lib/tracking/service";

// Track any package — ours or not — via EasyPost Trackers.

export type TrackerEventView = { status: string; statusDetail: string | null; description: string; city: string | null; state: string | null; occurredAt: string };
export type TrackerView = {
  id: string; trackingNumber: string; carrier: string; status: string; statusDetail: string | null; estDeliveryDate: string | null; signedBy: string | null; nickname: string | null;
  lastTrackedAt: string | null; createdAt: string; events: TrackerEventView[];
};

export class TrackerError extends Error {}

export async function trackerView(t: schema.Tracker): Promise<TrackerView> {
  const events = await db().query.trackingEvents.findMany({ where: eq(schema.trackingEvents.trackerId, t.id), orderBy: desc(schema.trackingEvents.occurredAt), limit: 50 });
  return {
    id: t.id, trackingNumber: t.trackingNumber, carrier: t.carrier, status: t.status, statusDetail: t.statusDetail, estDeliveryDate: t.estDeliveryDate, signedBy: t.signedBy, nickname: t.nickname,
    lastTrackedAt: t.lastTrackedAt?.toISOString() ?? null, createdAt: t.createdAt.toISOString(),
    events: events.map((e) => ({ status: e.status, statusDetail: e.statusDetail, description: e.description, city: e.city, state: e.state, occurredAt: e.occurredAt.toISOString() })),
  };
}

export async function listTrackersFor(accountId: string): Promise<TrackerView[]> {
  const rows = await db().query.trackers.findMany({ where: eq(schema.trackers.accountId, accountId), orderBy: desc(schema.trackers.createdAt), limit: 100 });
  return Promise.all(rows.map(trackerView));
}

export async function addTrackerFor(accountId: string, input: { trackingNumber: string; carrier?: string | null; nickname?: string | null }): Promise<TrackerView> {
  const trackingNumber = input.trackingNumber.replace(/\s+/g, "");
  const existing = await db().query.trackers.findFirst({ where: and(eq(schema.trackers.accountId, accountId), eq(schema.trackers.trackingNumber, trackingNumber)) });
  if (existing) return refreshTrackerFor(accountId, existing.id);

  const d = await getShippingProvider().createTracker(trackingNumber, input.carrier || null);
  const [row] = await db()
    .insert(schema.trackers)
    .values({ accountId, trackingNumber, carrier: d.carrier, providerTrackerId: d.providerTrackerId, status: d.status, statusDetail: d.statusDetail, estDeliveryDate: d.estDeliveryDate, signedBy: d.signedBy, nickname: input.nickname || null })
    .returning();
  await ingestTrackerDetails(row, d, "poll");
  return trackerView((await db().query.trackers.findFirst({ where: eq(schema.trackers.id, row.id) }))!);
}

export async function refreshTrackerFor(accountId: string, id: string): Promise<TrackerView> {
  const row = await db().query.trackers.findFirst({ where: and(eq(schema.trackers.id, id), eq(schema.trackers.accountId, accountId)) });
  if (!row?.providerTrackerId) throw new TrackerError("Tracker not found.");
  await ingestTrackerDetails(row, await getShippingProvider().trackerDetails(row.providerTrackerId), "poll");
  return trackerView((await db().query.trackers.findFirst({ where: eq(schema.trackers.id, row.id) }))!);
}

export async function removeTrackerFor(accountId: string, id: string): Promise<void> {
  await db().delete(schema.trackers).where(and(eq(schema.trackers.id, id), eq(schema.trackers.accountId, accountId)));
}

export function trackerErrorMessage(err: unknown): string {
  if (err instanceof TrackerError) return err.message;
  if (err instanceof ProviderError) return err.code === "unknown" ? err.message : "Couldn't reach the carrier — try again.";
  return "Couldn't start tracking that number.";
}
