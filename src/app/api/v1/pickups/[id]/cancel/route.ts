import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { cancelPickupFor, PickupError, pickupErrorMessage } from "@/lib/pickups/service";
import { pickupJson } from "@/lib/api/json";

/** POST /api/v1/pickups/{id}/cancel — call off a scheduled pickup. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { id } = await ctx.params;
  try {
    return NextResponse.json(pickupJson(await cancelPickupFor(api.account.id, id)));
  } catch (err) {
    return problem(err instanceof PickupError ? 404 : 502, err instanceof PickupError ? "not_found" : "provider_unavailable", pickupErrorMessage(err));
  }
}
