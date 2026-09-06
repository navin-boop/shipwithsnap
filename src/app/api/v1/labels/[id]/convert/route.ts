import { z } from "zod";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, labelJson, problem } from "@/lib/api/auth";
import { convertLabel } from "@/lib/ship/service";
import { ProviderError } from "@/lib/shipping";

const body = z.object({ format: z.enum(["pdf_4x6", "pdf_letter", "zpl"]) });

/** POST /api/v1/labels/{id}/convert — re-render an existing label in another format. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs format: pdf_4x6, pdf_letter or zpl.");
  try {
    return NextResponse.json(labelJson(await convertLabel(api.account, id, parsed.data.format), appBase(req)));
  } catch (err) {
    if (err instanceof ProviderError) return problem(err.message.includes("not found") ? 404 : 502, err.code, err.message);
    throw err;
  }
}
