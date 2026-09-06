import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { claimJson } from "@/lib/api/json";
import { ClaimError, claimErrorMessage, fileClaimFor, listClaimsFor } from "@/lib/claims/service";

const body = z.object({
  label_id: z.string().uuid(),
  type: z.enum(["damage", "loss", "theft"]),
  amount_cents: z.number().int().positive(),
  description: z.string().min(10),
  contact_email: z.string().email(),
  recipient_name: z.string().max(80).optional(),
  /** Base64-encoded files (no data: prefix). */
  evidence: z.array(z.string()).max(5).optional(),
  invoices: z.array(z.string()).max(5).optional(),
  supporting: z.array(z.string()).max(5).optional(),
});

/** GET /api/v1/claims — insurance claims you've filed. */
export async function GET(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ claims: (await listClaimsFor(ctx.account.id)).map(claimJson) });
}

/** POST /api/v1/claims — file a claim on an insured label. Damage and theft need evidence. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Check the request body.", { errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  const d = parsed.data;
  try {
    const claim = await fileClaimFor(ctx.account.id, {
      labelId: d.label_id, type: d.type, amountCents: d.amount_cents, description: d.description, contactEmail: d.contact_email,
      recipientName: d.recipient_name ?? null, evidence: d.evidence, invoices: d.invoices, supporting: d.supporting,
    });
    return NextResponse.json(claimJson(claim), { status: 201 });
  } catch (err) {
    return problem(err instanceof ClaimError ? 422 : 502, err instanceof ClaimError ? "claim_invalid" : "provider_unavailable", claimErrorMessage(err));
  }
}
