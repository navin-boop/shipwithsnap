import { lt, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { pollStaleTrackers } from "@/lib/tracking/service";
import { retryPendingWebhooks } from "@/lib/webhooks/outbound";

export const maxDuration = 60;

/**
 * Scheduled by vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Polls quiet trackers, retries webhook deliveries, and sweeps abandoned draft shipments.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const tracking = await pollStaleTrackers();
  const webhooks = await retryPendingWebhooks();
  const staleDrafts = await db()
    .delete(schema.shipments)
    .where(and(eq(schema.shipments.status, "draft"), lt(schema.shipments.createdAt, new Date(Date.now() - 24 * 3600 * 1000))))
    .returning({ id: schema.shipments.id });

  return NextResponse.json({ ok: true, tracking, webhooksRetried: webhooks, draftsDeleted: staleDrafts.length });
}
