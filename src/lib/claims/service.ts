import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import type { ClaimType } from "@/lib/shipping/options";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

// Insurance claims on EasyPost-insured labels (lost, damaged, stolen).

export type ClaimView = {
  id: string; trackingNumber: string; type: string; status: string; statusDetail: string | null; requestedCents: number; approvedCents: number | null;
  description: string; contactEmail: string; history: Array<{ status: string; statusDetail?: string | null; at: string }>; createdAt: string; labelId: string | null;
};

export class ClaimError extends Error {}

export const claimView = (c: schema.Claim): ClaimView => ({
  id: c.id, trackingNumber: c.trackingNumber, type: c.type, status: c.status, statusDetail: c.statusDetail, requestedCents: c.requestedCents, approvedCents: c.approvedCents,
  description: c.description, contactEmail: c.contactEmail, history: c.history, createdAt: c.createdAt.toISOString(), labelId: c.labelId,
});

export async function listClaimsFor(accountId: string): Promise<ClaimView[]> {
  const rows = await db().query.claims.findMany({ where: eq(schema.claims.accountId, accountId), orderBy: desc(schema.claims.createdAt), limit: 100 });
  return rows.map(claimView);
}

/** Insured labels that could carry a claim. */
export async function listClaimableLabelsFor(accountId: string) {
  const rows = await db()
    .select({ labelId: schema.labels.id, trackingNumber: schema.labels.trackingNumber, carrier: schema.labels.carrier, serviceName: schema.labels.serviceName, insuredCents: schema.labels.insuredCents, name: schema.addresses.name, status: schema.shipments.status, voidedAt: schema.labels.voidedAt })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .innerJoin(schema.addresses, eq(schema.addresses.id, schema.shipments.shipToId))
    .where(eq(schema.labels.accountId, accountId))
    .orderBy(desc(schema.labels.purchasedAt))
    .limit(300);
  return rows
    .filter((r) => !r.voidedAt && r.insuredCents > 0)
    .map((r) => ({ labelId: r.labelId, trackingNumber: r.trackingNumber, carrier: r.carrier, serviceName: r.serviceName, insuredCents: r.insuredCents, status: r.status, name: r.name ?? "—" }));
}

export type FileClaimInput = {
  labelId: string;
  type: ClaimType;
  amountCents: number;
  description: string;
  contactEmail: string;
  recipientName?: string | null;
  /** Base64 payloads (no data: prefix). */
  evidence?: string[];
  invoices?: string[];
  supporting?: string[];
};

export async function fileClaimFor(accountId: string, d: FileClaimInput): Promise<ClaimView> {
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, d.labelId), eq(schema.labels.accountId, accountId)) });
  if (!label) throw new ClaimError("Label not found.");
  if (!label.insuredCents) throw new ClaimError("This label wasn't insured, so there is nothing to claim.");
  if (d.amountCents > label.insuredCents) throw new ClaimError(`You can claim up to the insured value ($${(label.insuredCents / 100).toFixed(2)}).`);
  if (d.type !== "loss" && !(d.supporting?.length || d.evidence?.length)) throw new ClaimError("Damage and theft claims need a photo or document as evidence.");

  const r = await getShippingProvider().createClaim({
    trackingCode: label.trackingNumber, type: d.type, amountCents: d.amountCents, description: d.description, contactEmail: d.contactEmail,
    recipientName: d.recipientName ?? null, reference: label.id,
    attachments: { evidence: d.evidence, invoices: d.invoices, supporting: d.supporting },
  });
  const [row] = await db()
    .insert(schema.claims)
    .values({ accountId, labelId: label.id, providerClaimId: r.providerClaimId, trackingNumber: label.trackingNumber, type: d.type, requestedCents: d.amountCents, approvedCents: r.approvedCents, status: r.status, statusDetail: r.statusDetail, description: d.description, contactEmail: d.contactEmail, history: r.history })
    .returning();
  await deliverWebhooks(accountId, "claim.submitted", { claim_id: row.id, tracking_number: label.trackingNumber, type: d.type, requested_cents: d.amountCents });
  return claimView(row);
}

export async function refreshClaimFor(accountId: string, id: string): Promise<ClaimView> {
  const row = await db().query.claims.findFirst({ where: and(eq(schema.claims.id, id), eq(schema.claims.accountId, accountId)) });
  if (!row?.providerClaimId) throw new ClaimError("Claim not found.");
  const r = await getShippingProvider().getClaim(row.providerClaimId);
  const [updated] = await db().update(schema.claims).set({ status: r.status, statusDetail: r.statusDetail, approvedCents: r.approvedCents, history: r.history, updatedAt: new Date() }).where(eq(schema.claims.id, row.id)).returning();
  return claimView(updated);
}

export async function cancelClaimFor(accountId: string, id: string): Promise<ClaimView> {
  const row = await db().query.claims.findFirst({ where: and(eq(schema.claims.id, id), eq(schema.claims.accountId, accountId)) });
  if (!row?.providerClaimId) throw new ClaimError("Claim not found.");
  const r = await getShippingProvider().cancelClaim(row.providerClaimId);
  const [updated] = await db().update(schema.claims).set({ status: r.status, statusDetail: r.statusDetail, history: r.history, updatedAt: new Date() }).where(eq(schema.claims.id, row.id)).returning();
  return claimView(updated);
}

export function claimErrorMessage(err: unknown): string {
  if (err instanceof ClaimError) return err.message;
  if (err instanceof ProviderError) return err.message;
  return "Couldn't reach the insurer — try again.";
}
