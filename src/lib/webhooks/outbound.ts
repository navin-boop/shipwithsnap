import { createHmac, randomUUID } from "node:crypto";
import { and, eq, lte, or, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// Spec: design/API.dc.html — outbound webhooks signed with HMAC-SHA256, retried over 24 h.

export const WEBHOOK_EVENTS = [
  "label.created",
  "label.voided",
  "tracking.updated",
  "tracking.delivered",
  "tracking.exception",
  "batch.completed",
  "batch.partial",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const RETRY_MINUTES = [1, 5, 15, 60, 180, 360, 720, 1440];

export function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Queues a delivery for every enabled endpoint subscribed to the event and tries it once now. */
export async function deliverWebhooks(accountId: string, event: WebhookEvent, data: Record<string, unknown>) {
  const endpoints = await db().query.webhookEndpoints.findMany({
    where: and(eq(schema.webhookEndpoints.accountId, accountId), eq(schema.webhookEndpoints.enabled, true)),
  });
  const targets = endpoints.filter((e) => e.events.includes(event));
  if (!targets.length) return;
  const payload = { id: `evt_${randomUUID()}`, type: event, created_at: new Date().toISOString(), data };
  const rows = await db()
    .insert(schema.webhookDeliveries)
    .values(targets.map((e) => ({ endpointId: e.id, event, payload })))
    .returning();
  await Promise.all(rows.map((d) => attempt(d, targets.find((e) => e.id === d.endpointId)!)));
}

async function attempt(delivery: typeof schema.webhookDeliveries.$inferSelect, endpoint: typeof schema.webhookEndpoints.$inferSelect) {
  const body = JSON.stringify(delivery.payload);
  const attempts = delivery.attempts + 1;
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-snap-signature": `sha256=${sign(endpoint.secret, body)}`, "x-snap-event": delivery.event, "x-snap-delivery": delivery.id },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await db().update(schema.webhookDeliveries).set({ attempts, status: "delivered", lastError: null, nextRetryAt: null }).where(eq(schema.webhookDeliveries.id, delivery.id));
  } catch (err) {
    const wait = RETRY_MINUTES[attempts - 1];
    await db()
      .update(schema.webhookDeliveries)
      .set({
        attempts,
        status: wait ? "pending" : "failed",
        lastError: err instanceof Error ? err.message : String(err),
        nextRetryAt: wait ? new Date(Date.now() + wait * 60_000) : null,
      })
      .where(eq(schema.webhookDeliveries.id, delivery.id));
  }
}

/** Cron entry point: retry pending deliveries whose time has come. */
export async function retryPendingWebhooks(limit = 100): Promise<number> {
  const due = await db()
    .select({ d: schema.webhookDeliveries, e: schema.webhookEndpoints })
    .from(schema.webhookDeliveries)
    .innerJoin(schema.webhookEndpoints, eq(schema.webhookEndpoints.id, schema.webhookDeliveries.endpointId))
    .where(and(eq(schema.webhookDeliveries.status, "pending"), or(isNull(schema.webhookDeliveries.nextRetryAt), lte(schema.webhookDeliveries.nextRetryAt, new Date()))))
    .limit(limit);
  await Promise.all(due.map(({ d, e }) => attempt(d, e)));
  return due.length;
}
