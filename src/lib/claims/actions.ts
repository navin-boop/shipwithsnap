"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  cancelClaimFor,
  claimErrorMessage,
  fileClaimFor,
  listClaimableLabelsFor,
  listClaimsFor,
  refreshClaimFor,
  type ClaimView,
} from "./service";

export type { ClaimView } from "./service";

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  return session.user;
}

export async function listClaims(): Promise<ClaimView[]> {
  return listClaimsFor((await requireAccount()).accountId);
}

export async function listClaimableLabels() {
  return listClaimableLabelsFor((await requireAccount()).accountId);
}

const fileInput = z.object({ name: z.string(), dataUrl: z.string().regex(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/) });

const input = z.object({
  labelId: z.string().uuid(),
  type: z.enum(["damage", "loss", "theft"]),
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(10, "Describe what happened (at least a sentence)."),
  contactEmail: z.string().trim().email("Enter a contact email."),
  recipientName: z.string().trim().max(80).optional(),
  evidence: z.array(fileInput).max(5).optional(),
  invoices: z.array(fileInput).max(5).optional(),
  supporting: z.array(fileInput).max(5).optional(),
});

export type ClaimResult = { ok: true; claim: ClaimView } | { ok: false; error: string };

export async function fileClaim(raw: z.input<typeof input>): Promise<ClaimResult> {
  const user = await requireAccount();
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the form." };
  const d = p.data;
  const b64 = (files?: Array<{ dataUrl: string }>) => files?.map((f) => f.dataUrl.split(",")[1]);
  try {
    const claim = await fileClaimFor(user.accountId, { ...d, evidence: b64(d.evidence), invoices: b64(d.invoices), supporting: b64(d.supporting) });
    revalidatePath("/claims");
    return { ok: true, claim };
  } catch (err) {
    return { ok: false, error: claimErrorMessage(err) };
  }
}

export async function refreshClaim(id: string): Promise<ClaimResult> {
  const user = await requireAccount();
  try {
    const claim = await refreshClaimFor(user.accountId, id);
    revalidatePath("/claims");
    return { ok: true, claim };
  } catch (err) {
    return { ok: false, error: claimErrorMessage(err) };
  }
}

export async function cancelClaim(id: string): Promise<ClaimResult> {
  const user = await requireAccount();
  try {
    const claim = await cancelClaimFor(user.accountId, id);
    revalidatePath("/claims");
    return { ok: true, claim };
  } catch (err) {
    return { ok: false, error: claimErrorMessage(err) };
  }
}
