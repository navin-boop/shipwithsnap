import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { pickupJson } from "@/lib/api/json";
import { listPickupsFor, PickupError, pickupErrorMessage, requestPickupFor } from "@/lib/pickups/service";

const body = z.object({
  label_id: z.string().uuid(),
  min_datetime: z.string().datetime({ offset: true }),
  max_datetime: z.string().datetime({ offset: true }),
  instructions: z.string().max(200).optional(),
});

/** GET /api/v1/pickups — pickups you've requested or scheduled. */
export async function GET(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ pickups: (await listPickupsFor(ctx.account.id)).map(pickupJson) });
}

/** POST /api/v1/pickups — ask the carriers what a pickup would cost; buy one with /pickups/{id}/buy. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs label_id, min_datetime and max_datetime (ISO 8601 with offset).");
  try {
    const p = await requestPickupFor(ctx.account.id, {
      labelId: parsed.data.label_id,
      minDatetime: new Date(parsed.data.min_datetime),
      maxDatetime: new Date(parsed.data.max_datetime),
      instructions: parsed.data.instructions ?? null,
    });
    return NextResponse.json(pickupJson(p), { status: 201 });
  } catch (err) {
    return problem(err instanceof PickupError ? 422 : 502, err instanceof PickupError ? "pickup_unavailable" : "provider_unavailable", pickupErrorMessage(err));
  }
}
