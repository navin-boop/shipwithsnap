"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LOGIN_BLOCKED_MESSAGE, clearLoginFailures, loginAllowed, recordFailedLogin } from "./throttle";
import { CODE_TTL_MINUTES, checkFailureMessage, checkVerificationCode, issueVerificationCode } from "./verification";
import { auth, createAccountWithOwner, signIn, signOut } from "@/lib/auth";
import { notifyVerificationCode, notifyWelcome } from "@/lib/email/notify";
import { db, schema } from "@/lib/db";

export type AuthFormState =
  | { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }
  | undefined;

/** Non-secret fields to repopulate the form after a failed submit. */
function keep(formData: FormData, ...names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) out[n] = String(formData.get(n) ?? "");
  return out;
}

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(12, "12 characters or more."),
  shipFromZip: z.string().trim().regex(/^\d{5}$/, "ZIP needs 5 digits."),
});

const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keep(formData, "email", "shipFromZip");
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { email, password, shipFromZip } = parsed.data;

  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    return { fieldErrors: { email: "There's already an account for this email. Log in instead." }, values };
  }

  const { user } = await createAccountWithOwner({ email, name: null, passwordHash: await hash(password, 12), shipFromZip });

  // Mail the code before signing in: the /verify screen is where they land, and it is useless
  // without one. A mail failure must not strand a created account, so it is logged, not thrown.
  const issued = await issueVerificationCode(user.id);
  if (issued.ok) await notifyVerificationCode({ email, code: issued.code, expiresInMinutes: CODE_TTL_MINUTES });

  // Throws NEXT_REDIRECT on success — let it propagate.
  await signIn("credentials", { email, password, redirectTo: "/verify" });
}

/** Checks the six-digit code, then sends the welcome mail the sign-up deliberately held back. */
export async function verifyEmailCode(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Your session expired. Log in again." };

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!code) return { fieldErrors: { code: "Enter the six-digit code." } };

  const result = await checkVerificationCode(session.user.id, code);
  if (!result.ok) return { fieldErrors: { code: checkFailureMessage(result) } };

  if (!result.alreadyVerified) {
    const user = await db().query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
    if (user) await notifyWelcome({ email: user.email, name: user.name });
  }
  redirect("/ship");
}

/** A fresh code, retiring the old one. Rate-limited in the service, not here. */
export async function resendVerificationCode(): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Your session expired. Log in again." };
  const user = await db().query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
  if (!user) return { ok: false, message: "Your session expired. Log in again." };
  if (user.emailVerifiedAt) return { ok: true, message: "This address is already verified." };

  const issued = await issueVerificationCode(user.id);
  if (!issued.ok) return { ok: false, message: `Hold on ${issued.retryInSeconds}s before asking for another code.` };
  await notifyVerificationCode({ email: user.email, code: issued.code, expiresInMinutes: CODE_TTL_MINUTES });
  return { ok: true, message: `New code sent to ${user.email}.` };
}

export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keep(formData, "email");
  const parsed = logInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  // Guessing a password should cost something. See auth/throttle.ts for the limits.
  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!loginAllowed(parsed.data.email, ip)) return { error: LOGIN_BLOCKED_MESSAGE, values };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/ship" });
  } catch (err) {
    if (err instanceof AuthError) {
      recordFailedLogin(parsed.data.email, ip);
      return { error: "That email and password don't match.", values };
    }
    clearLoginFailures(parsed.data.email); // NEXT_REDIRECT means the sign-in succeeded
    throw err;
  }
}

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().trim().min(1, "Enter your name."),
  password: z.string().min(12, "12 characters or more."),
});

/** Turns an invite into a user on the inviting account, then signs them in. */
export async function acceptInvite(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keep(formData, "name");
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { token, name, password } = parsed.data;
  const invite = await db().query.invites.findFirst({ where: eq(schema.invites.token, token) });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return { error: "This invite has expired — ask for a new link.", values };
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, invite.email) });
  if (existing) return { error: "There's already an account for this email. Log in instead.", values };
  await db().insert(schema.users).values({ accountId: invite.accountId, email: invite.email, name, role: invite.role, passwordHash: await hash(password, 12) });
  await db().update(schema.invites).set({ acceptedAt: new Date() }).where(eq(schema.invites.id, invite.id));
  await signIn("credentials", { email: invite.email, password, redirectTo: "/ship" });
}

export async function logInWithGoogle() {
  await signIn("google", { redirectTo: "/ship" });
}

export async function logOut() {
  await signOut({ redirectTo: "/login" });
}
