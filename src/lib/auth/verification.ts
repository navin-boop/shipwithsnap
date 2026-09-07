/**
 * Sign-up email verification: a six-digit code, mailed to the address being claimed.
 *
 * The rules, and why:
 *   - only a SHA-256 hash of the code is stored, so a leaked row is not a working code;
 *   - one live code per user — issuing a new one consumes the old, so an old email can't be
 *     used after a resend;
 *   - a code dies after MAX_ATTEMPTS wrong guesses, which makes brute-forcing 10^6 codes
 *     pointless rather than merely slow;
 *   - resends are on a cooldown, so the endpoint can't be used to mail-bomb an address.
 *
 * Account-scoped plain functions per the service.ts convention — no session, no "use server".
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Compare digests, not codes, and in constant time — a timing oracle here leaks the code. */
function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Cryptographically random, and zero-padded so every code is exactly six digits — without the
 * padding, one draw in ten produces a short code that will not match a six-box input.
 * Exported for the test that proves the padding is there.
 */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: "cooldown"; retryInSeconds: number };

/**
 * Mint a code for a user, retiring any earlier one. Returns the plaintext exactly once — the
 * caller mails it and forgets it; nothing else can ever read it back.
 */
export async function issueVerificationCode(userId: string): Promise<IssueResult> {
  const latest = await db().query.emailVerifications.findFirst({
    where: eq(schema.emailVerifications.userId, userId),
    orderBy: desc(schema.emailVerifications.createdAt),
  });
  if (latest && !latest.consumedAt) {
    const age = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (age < RESEND_COOLDOWN_SECONDS) return { ok: false, reason: "cooldown", retryInSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - age) };
  }

  const code = generateCode();
  await db().batch([
    // Retire every outstanding code first, so a resend really does invalidate the old email.
    db()
      .update(schema.emailVerifications)
      .set({ consumedAt: new Date() })
      .where(and(eq(schema.emailVerifications.userId, userId), isNull(schema.emailVerifications.consumedAt))),
    db().insert(schema.emailVerifications).values({
      userId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    }),
  ]);
  return { ok: true, code };
}

export type CheckResult =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "wrong"; attemptsLeft?: number };

/** Check a submitted code and, when it matches, mark the address verified. */
export async function checkVerificationCode(userId: string, submitted: string): Promise<CheckResult> {
  const user = await db().query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return { ok: false, reason: "no_code" };
  if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

  const code = submitted.replace(/\D/g, "");
  const row = await db().query.emailVerifications.findFirst({
    where: and(eq(schema.emailVerifications.userId, userId), isNull(schema.emailVerifications.consumedAt)),
    orderBy: desc(schema.emailVerifications.createdAt),
  });
  if (!row) return { ok: false, reason: "no_code" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (code.length !== CODE_LENGTH || !sameHash(row.codeHash, hashCode(code))) {
    const [updated] = await db()
      .update(schema.emailVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(schema.emailVerifications.id, row.id))
      .returning();
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return { ok: false, reason: left === 0 ? "too_many_attempts" : "wrong", attemptsLeft: left };
  }

  const now = new Date();
  await db().batch([
    db().update(schema.emailVerifications).set({ consumedAt: now }).where(eq(schema.emailVerifications.id, row.id)),
    db().update(schema.users).set({ emailVerifiedAt: now }).where(eq(schema.users.id, userId)),
  ]);
  return { ok: true, alreadyVerified: false };
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db().query.users.findFirst({ where: eq(schema.users.id, userId) });
  return Boolean(user?.emailVerifiedAt);
}

/** Plain-language message for each failure, so the UI never has to build one. */
export function checkFailureMessage(result: Extract<CheckResult, { ok: false }>): string {
  switch (result.reason) {
    case "no_code":
      return "That code has already been used. Send a new one.";
    case "expired":
      return `That code has expired — codes last ${CODE_TTL_MINUTES} minutes. Send a new one.`;
    case "too_many_attempts":
      return "Too many wrong tries. Send a new code to start again.";
    case "wrong":
      return result.attemptsLeft === 1 ? "That code isn't right. One try left before you'll need a new code." : "That code isn't right.";
  }
}
