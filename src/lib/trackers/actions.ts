"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  addTrackerFor,
  listTrackersFor,
  refreshTrackerFor,
  removeTrackerFor,
  trackerErrorMessage,
  type TrackerView,
} from "./service";

export type { TrackerEventView, TrackerView } from "./service";

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  return session.user;
}

export async function listTrackers(): Promise<TrackerView[]> {
  return listTrackersFor((await requireAccount()).accountId);
}

const input = z.object({
  trackingNumber: z.string().trim().min(6).max(40),
  carrier: z.string().trim().max(20).optional(),
  nickname: z.string().trim().max(60).optional(),
});

export type TrackerResult = { ok: true; tracker: TrackerView } | { ok: false; error: string };

export async function addTracker(raw: z.input<typeof input>): Promise<TrackerResult> {
  const user = await requireAccount();
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Enter a tracking number." };
  try {
    const tracker = await addTrackerFor(user.accountId, p.data);
    revalidatePath("/track");
    return { ok: true, tracker };
  } catch (err) {
    return { ok: false, error: trackerErrorMessage(err) };
  }
}

export async function refreshTracker(id: string): Promise<TrackerResult> {
  const user = await requireAccount();
  try {
    const tracker = await refreshTrackerFor(user.accountId, id);
    revalidatePath("/track");
    return { ok: true, tracker };
  } catch (err) {
    return { ok: false, error: trackerErrorMessage(err) };
  }
}

export async function removeTracker(id: string): Promise<{ ok: boolean }> {
  const user = await requireAccount();
  await removeTrackerFor(user.accountId, id);
  revalidatePath("/track");
  return { ok: true };
}
