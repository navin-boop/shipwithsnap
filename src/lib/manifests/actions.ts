"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireWriter } from "@/lib/auth/require";
import {
  createManifestFor,
  listManifestCandidatesFor,
  listManifestsFor,
  manifestErrorMessage,
  refreshManifestFor,
  type ManifestCandidate,
  type ManifestView,
} from "./service";

export type { ManifestCandidate, ManifestView } from "./service";

/** Writes spend money or change carrier state, so viewers are excluded. Reads are open to them. */
async function requireAccount() {
  return requireWriter();
}

async function requireReader() {
  return requireSession();
}

export async function listManifests(): Promise<ManifestView[]> {
  return listManifestsFor((await requireReader()).accountId);
}

export async function listManifestCandidates(): Promise<ManifestCandidate[]> {
  return listManifestCandidatesFor((await requireReader()).accountId);
}

export type ManifestResult = { ok: true; manifest: ManifestView } | { ok: false; error: string };

export async function createManifest(labelIds: string[]): Promise<ManifestResult> {
  const user = await requireAccount();
  try {
    const manifest = await createManifestFor(user.accountId, labelIds);
    revalidatePath("/manifests");
    return { ok: true, manifest };
  } catch (err) {
    return { ok: false, error: manifestErrorMessage(err) };
  }
}

export async function refreshManifest(id: string): Promise<ManifestResult> {
  const user = await requireAccount();
  try {
    const manifest = await refreshManifestFor(user.accountId, id);
    revalidatePath("/manifests");
    return { ok: true, manifest };
  } catch (err) {
    return { ok: false, error: manifestErrorMessage(err) };
  }
}
