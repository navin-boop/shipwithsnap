import { z } from "zod";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { manifestJson } from "@/lib/api/json";
import { createManifestFor, listManifestsFor, ManifestError, manifestErrorMessage } from "@/lib/manifests/service";

const body = z.object({ label_ids: z.array(z.string().uuid()).min(1).max(1000) });

/** GET /api/v1/manifests — end-of-day manifests (SCAN forms) you've built. */
export async function GET(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ manifests: (await listManifestsFor(ctx.account.id)).map((m) => manifestJson(m, appBase(req))) });
}

/** POST /api/v1/manifests — one barcode covering a stack of labels from a single carrier. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs label_ids: an array of label ids from one carrier.");
  try {
    return NextResponse.json(manifestJson(await createManifestFor(ctx.account.id, parsed.data.label_ids), appBase(req)), { status: 201 });
  } catch (err) {
    return problem(err instanceof ManifestError ? 422 : 502, err instanceof ManifestError ? "manifest_invalid" : "provider_unavailable", manifestErrorMessage(err));
  }
}
