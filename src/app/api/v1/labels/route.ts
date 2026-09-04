import { z } from "zod";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, labelJson, problem } from "@/lib/api/auth";
import { BuyError, buyLabel } from "@/lib/ship/service";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

const body = z.object({ shipment_id: z.string().uuid(), rate_id: z.string().uuid() });

/** POST /api/v1/labels — buys a rate. Send an Idempotency-Key header; retries with the same key return the same label. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const idem = req.headers.get("idempotency-key");
  if (!idem) return problem(400, "idempotency_key_required", "Send an Idempotency-Key header (any unique string per purchase).");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs shipment_id and rate_id.");
  try {
    const label = await buyLabel(ctx.account, { shipmentId: parsed.data.shipment_id, rateQuoteId: parsed.data.rate_id, idempotencyKey: `api:${ctx.account.id}:${idem}` });
    await deliverWebhooks(ctx.account.id, "label.created", { label_id: label.id, tracking_number: label.trackingNumber, carrier: label.carrier, service: label.serviceCode, price_cents: label.priceCents });
    return NextResponse.json(labelJson(label, appBase(req)), { status: 201 });
  } catch (err) {
    if (err instanceof BuyError) {
      const status = err.code === "rate_expired" || err.code === "already_labeled" ? 409 : err.code === "address_invalid" ? 422 : err.code === "provider_unavailable" ? 502 : 400;
      return problem(status, err.code, err.message, status === 502 ? { retry_after: 10 } : {});
    }
    throw err;
  }
}
