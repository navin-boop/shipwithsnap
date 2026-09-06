"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession, requireWriter } from "@/lib/auth/require";
import {
  cancelPickupFor,
  listPickupCandidatesFor,
  listPickupsFor,
  pickupErrorMessage,
  requestPickupFor,
  schedulePickupFor,
  type PickupView,
} from "./service";

export type { PickupView } from "./service";

/** Writes spend money or change carrier state, so viewers are excluded. Reads are open to them. */
async function requireAccount() {
  return requireWriter();
}

async function requireReader() {
  return requireSession();
}

export async function listPickups(): Promise<PickupView[]> {
  return listPickupsFor((await requireReader()).accountId);
}

export async function listPickupCandidates() {
  return listPickupCandidatesFor((await requireReader()).accountId);
}

const requestInput = z.object({
  labelId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromTime: z.string().regex(/^\d{2}:\d{2}$/),
  toTime: z.string().regex(/^\d{2}:\d{2}$/),
  instructions: z.string().trim().max(200).optional(),
});

export type PickupActionResult = { ok: true; pickup: PickupView } | { ok: false; error: string };

export async function requestPickup(input: z.input<typeof requestInput>): Promise<PickupActionResult> {
  const user = await requireAccount();
  const p = requestInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Pick a date and a time window." };
  try {
    const pickup = await requestPickupFor(user.accountId, {
      labelId: p.data.labelId,
      minDatetime: new Date(`${p.data.date}T${p.data.fromTime}:00`),
      maxDatetime: new Date(`${p.data.date}T${p.data.toTime}:00`),
      instructions: p.data.instructions || null,
    });
    revalidatePath("/pickups");
    return { ok: true, pickup };
  } catch (err) {
    return { ok: false, error: pickupErrorMessage(err) };
  }
}

export async function schedulePickup(pickupId: string, carrier: string, serviceCode: string): Promise<PickupActionResult> {
  const user = await requireAccount();
  try {
    const pickup = await schedulePickupFor(user.accountId, pickupId, carrier, serviceCode);
    revalidatePath("/pickups");
    return { ok: true, pickup };
  } catch (err) {
    return { ok: false, error: pickupErrorMessage(err) };
  }
}

export async function cancelPickup(pickupId: string): Promise<PickupActionResult> {
  const user = await requireAccount();
  try {
    const pickup = await cancelPickupFor(user.accountId, pickupId);
    revalidatePath("/pickups");
    return { ok: true, pickup };
  } catch (err) {
    return { ok: false, error: pickupErrorMessage(err) };
  }
}
