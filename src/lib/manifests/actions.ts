"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  return session.user;
}

export async function listManifests(): Promise<ManifestView[]> {
  return listManifestsFor((await requireAccount()).accountId);
}

export async function listManifestCandidates(): Promise<ManifestCandidate[]> {
  return listManifestCandidatesFor((await requireAccount()).accountId);
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
