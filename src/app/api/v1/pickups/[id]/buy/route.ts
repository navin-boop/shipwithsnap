import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { PickupError, pickupErrorMessage, schedulePickupFor } from "@/lib/pickups/service";
import { pickupJson } from "@/lib/api/json";

const body = z.object({ carrier: z.string().min(1), service: z.string().min(1) });

/** POST /api/v1/pickups/{id}/buy — confirm the pickup with one of the quoted carriers. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs carrier and service, taken from the pickup's rates.");
  try {
    return NextResponse.json(pickupJson(await schedulePickupFor(api.account.id, id, parsed.data.carrier, parsed.data.service)));
  } catch (err) {
    return problem(err instanceof PickupError ? 422 : 502, err instanceof PickupError ? "pickup_unavailable" : "provider_unavailable", pickupErrorMessage(err));
  }
}
