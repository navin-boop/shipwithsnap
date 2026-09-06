"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Account } from "@/lib/db/schema";
import {
  BillingError,
  createSetupIntent,
  removePaymentMethod,
  savePaymentMethod,
  setDefaultPaymentMethod,
} from "./service";

async function requireOwner(): Promise<Account> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  if (session.user.role !== "owner") throw new Error("Only an owner can manage billing");
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session.user.accountId) });
  if (!account) throw new Error("Account not found");
  return account;
}

export type BillingResult = { ok: true; message?: string } | { ok: false; error: string };

const message = (err: unknown) => (err instanceof BillingError ? err.message : "Something went wrong — try again.");

/** Opens the card form: Stripe Elements confirms this SetupIntent in the browser. */
export async function startAddCard(): Promise<{ ok: true; clientSecret: string } | { ok: false; error: string }> {
  try {
    const account = await requireOwner();
    const { clientSecret } = await createSetupIntent(account);
    return { ok: true, clientSecret };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Called once Elements reports the SetupIntent succeeded. */
export async function finishAddCard(paymentMethodId: string): Promise<BillingResult> {
  const p = z.string().trim().min(3).max(120).safeParse(paymentMethodId);
  if (!p.success) return { ok: false, error: "That card could not be saved." };
  try {
    const account = await requireOwner();
    await savePaymentMethod(account, p.data);
    // A newly added card clears a decline lock; a dispute or unpaid adjustment still stands.
    if (account.billingLockedReason === "card_declined") {
      await db().update(schema.accounts).set({ billingLockedReason: null }).where(eq(schema.accounts.id, account.id));
    }
    revalidatePath("/billing");
    revalidatePath("/ship");
    return { ok: true, message: "Card saved." };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function makeDefaultCard(id: string): Promise<BillingResult> {
  try {
    await setDefaultPaymentMethod(await requireOwner(), id);
    revalidatePath("/billing");
    return { ok: true, message: "Default card updated." };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function deleteCard(id: string): Promise<BillingResult> {
  try {
    await removePaymentMethod(await requireOwner(), id);
    revalidatePath("/billing");
    revalidatePath("/ship");
    return { ok: true, message: "Card removed." };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function updateReceiptSettings(input: { receiptEmails: boolean; receiptEmail: string }): Promise<BillingResult> {
  const p = z.object({ receiptEmails: z.boolean(), receiptEmail: z.string().trim().email("Enter a valid email.").or(z.literal("")) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  try {
    const account = await requireOwner();
    await db().update(schema.accounts).set({ receiptEmails: p.data.receiptEmails, receiptEmail: p.data.receiptEmail || null }).where(eq(schema.accounts.id, account.id));
    revalidatePath("/billing");
    return { ok: true, message: "Saved." };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
