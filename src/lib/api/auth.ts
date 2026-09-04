import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { Account, ApiKey } from "@/lib/db/schema";

/** RFC 9457 problem+json, as in design/API.dc.html. */
export function problem(status: number, code: string, detail: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ type: `https://shipwithsnap.com/errors/${code}`, title: code, status, detail, ...extra }, { status, headers: { "content-type": "application/problem+json" } });
}

export type ApiContext = { account: Account; key: ApiKey };

/** Resolves `Authorization: Bearer sk_…` to an account, touching last_used_at. */
export async function authenticateApi(req: Request): Promise<ApiContext | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(sk_(?:live|test)_[A-Za-z0-9_-]+)$/.exec(header);
  if (!m) return problem(401, "unauthorized", "Send your API key as `Authorization: Bearer sk_…`.");
  const keyHash = createHash("sha256").update(m[1]).digest("hex");
  const key = await db().query.apiKeys.findFirst({ where: and(eq(schema.apiKeys.keyHash, keyHash), isNull(schema.apiKeys.revokedAt)) });
  if (!key) return problem(401, "unauthorized", "Unknown or revoked API key.");
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, key.accountId) });
  if (!account) return problem(401, "unauthorized", "Unknown account.");
  db().update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, key.id)).catch(() => {});
  return { account, key };
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function labelJson(l: typeof schema.labels.$inferSelect, base: string) {
  return {
    id: l.id,
    shipment_id: l.shipmentId,
    carrier: l.carrier,
    service: l.serviceCode,
    service_name: l.serviceName,
    tracking_number: l.trackingNumber,
    tracking_url: `${base}/t/${l.trackingToken}`,
    price_cents: l.priceCents,
    retail_cents: l.retailCents,
    format: l.format,
    file_url: `${base}/api/v1/labels/${l.id}/file`,
    voided_at: l.voidedAt?.toISOString() ?? null,
    refund_status: l.refundStatus,
    purchased_at: l.purchasedAt.toISOString(),
  };
}

export function appBase(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}
