import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { normalizeDetail } from "@/lib/shipping/easypost";
import { findLabelsByTracker, ingestTrackingEvents } from "@/lib/tracking/service";

// Spec: design/TrackingFlow.dc.html — verify HMAC, dedupe on event id, 200 fast, then process.
// EasyPost signs the raw body with the webhook secret: X-Hmac-Signature: hmac-sha256-hex=<hex>.

function verify(raw: string, header: string | null): boolean {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow unsigned locally
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const given = header.replace(/^hmac-sha256-hex=/, "");
  return given.length === expected.length && timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

type EasyPostEvent = {
  id: string;
  description: string;
  result?: {
    id?: string;
    tracking_code?: string;
    status?: string;
    est_delivery_date?: string | null;
    tracking_details?: Parameters<typeof normalizeDetail>[0][];
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-hmac-signature"))) return new NextResponse("Bad signature", { status: 401 });

  let event: EasyPostEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  if (!event.id) return new NextResponse("Missing id", { status: 400 });

  // Idempotency: drop replays.
  const seen = await db().insert(schema.inboundEvents).values({ id: event.id, provider: "easypost" }).onConflictDoNothing().returning({ id: schema.inboundEvents.id });
  if (!seen.length) return NextResponse.json({ ok: true, duplicate: true });

  if (event.description === "tracker.updated" && event.result?.id) {
    const r = event.result;
    const labels = await findLabelsByTracker(r.id!, r.tracking_code ?? "");
    const events = (r.tracking_details ?? []).map(normalizeDetail);
    for (const label of labels) {
      await ingestTrackingEvents(label, events, "webhook", r.est_delivery_date ? r.est_delivery_date.slice(0, 10) : null);
    }
  }

  await db().update(schema.inboundEvents).set({ processedAt: new Date() }).where(eq(schema.inboundEvents.id, event.id));
  return NextResponse.json({ ok: true });
}
