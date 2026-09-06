import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { trackerJson } from "@/lib/api/json";
import { addTrackerFor, listTrackersFor, trackerErrorMessage } from "@/lib/trackers/service";

const body = z.object({ tracking_number: z.string().trim().min(6).max(40), carrier: z.string().max(20).optional(), nickname: z.string().max(60).optional() });

/** GET /api/v1/trackers — every package you're tracking. */
export async function GET(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ trackers: (await listTrackersFor(ctx.account.id)).map(trackerJson) });
}

/** POST /api/v1/trackers — track any package, whether or not the label came from us. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs tracking_number.");
  try {
    const t = await addTrackerFor(ctx.account.id, { trackingNumber: parsed.data.tracking_number, carrier: parsed.data.carrier, nickname: parsed.data.nickname });
    return NextResponse.json(trackerJson(t), { status: 201 });
  } catch (err) {
    return problem(502, "provider_unavailable", trackerErrorMessage(err));
  }
}
