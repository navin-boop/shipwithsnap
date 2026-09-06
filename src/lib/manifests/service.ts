import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

// End-of-day manifests (EasyPost ScanForms): one barcode the carrier scans instead of every package.

export type ManifestView = { id: string; carrier: string; status: string; labelCount: number; formUrl: string | null; message: string | null; createdAt: string };
export type ManifestCandidate = { labelId: string; carrier: string; serviceName: string; trackingNumber: string; name: string; purchasedAt: string };

export class ManifestError extends Error {}

export const manifestView = (s: schema.ScanForm): ManifestView => ({
  id: s.id, carrier: s.carrier, status: s.status, labelCount: s.labelCount,
  formUrl: s.formUrl ? `/api/manifests/${s.id}/file` : null, message: s.message, createdAt: s.createdAt.toISOString(),
});

export async function listManifestsFor(accountId: string): Promise<ManifestView[]> {
  const rows = await db().query.scanForms.findMany({ where: eq(schema.scanForms.accountId, accountId), orderBy: desc(schema.scanForms.createdAt), limit: 60 });
  return rows.map(manifestView);
}

/** Labels not yet on a manifest and not yet scanned, grouped by carrier on the page. */
export async function listManifestCandidatesFor(accountId: string): Promise<ManifestCandidate[]> {
  const rows = await db()
    .select({ labelId: schema.labels.id, carrier: schema.labels.carrier, serviceName: schema.labels.serviceName, trackingNumber: schema.labels.trackingNumber, name: schema.addresses.name, purchasedAt: schema.labels.purchasedAt })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .innerJoin(schema.addresses, eq(schema.addresses.id, schema.shipments.shipToId))
    .where(and(eq(schema.labels.accountId, accountId), isNull(schema.labels.voidedAt), isNull(schema.labels.scanFormId), eq(schema.shipments.status, "label_created")))
    .orderBy(desc(schema.labels.purchasedAt))
    .limit(500);
  return rows.map((r) => ({ ...r, name: r.name ?? "—", purchasedAt: r.purchasedAt.toISOString() }));
}

export async function createManifestFor(accountId: string, labelIds: string[]): Promise<ManifestView> {
  if (!labelIds.length) throw new ManifestError("Pick at least one package.");
  const labels = await db().query.labels.findMany({ where: and(eq(schema.labels.accountId, accountId), inArray(schema.labels.id, labelIds), isNull(schema.labels.voidedAt), isNull(schema.labels.scanFormId)) });
  if (!labels.length) throw new ManifestError("Those labels are already on a manifest.");
  const carriers = new Set(labels.map((l) => l.carrier));
  if (carriers.size > 1) throw new ManifestError("A manifest covers one carrier — pick packages from a single carrier.");
  const shipments = await db().query.shipments.findMany({ where: inArray(schema.shipments.id, labels.map((l) => l.shipmentId)) });
  const providerIds = shipments.map((s) => s.providerShipmentId).filter((x): x is string => !!x);
  const carrier = labels[0].carrier;

  const r = await getShippingProvider().createScanForm(providerIds);
  const [row] = await db()
    .insert(schema.scanForms)
    .values({ accountId, providerScanFormId: r.providerScanFormId, carrier, status: r.status, formUrl: r.formUrl, trackingNumbers: r.trackingCodes.length ? r.trackingCodes : labels.map((l) => l.trackingNumber), labelCount: labels.length, message: r.message })
    .returning();
  if (r.status !== "failed") await db().update(schema.labels).set({ scanFormId: row.id }).where(inArray(schema.labels.id, labels.map((l) => l.id)));
  if (r.status === "failed") throw new ManifestError(r.message ?? "The carrier couldn't build a manifest for those packages.");
  await deliverWebhooks(accountId, "manifest.created", { manifest_id: row.id, carrier, label_count: labels.length });
  return manifestView(row);
}

/** ScanForms are created asynchronously at the carrier; refresh one that is still "creating". */
export async function refreshManifestFor(accountId: string, id: string): Promise<ManifestView> {
  const row = await db().query.scanForms.findFirst({ where: and(eq(schema.scanForms.id, id), eq(schema.scanForms.accountId, accountId)) });
  if (!row?.providerScanFormId) throw new ManifestError("Manifest not found.");
  const r = await getShippingProvider().getScanForm(row.providerScanFormId);
  const [updated] = await db().update(schema.scanForms).set({ status: r.status, formUrl: r.formUrl ?? row.formUrl, message: r.message }).where(eq(schema.scanForms.id, row.id)).returning();
  return manifestView(updated);
}

export function manifestErrorMessage(err: unknown): string {
  if (err instanceof ManifestError) return err.message;
  if (err instanceof ProviderError) return err.message;
  return "Couldn't reach the carrier — try again.";
}
