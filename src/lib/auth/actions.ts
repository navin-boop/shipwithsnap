"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";
import { createAccountWithOwner, signIn, signOut } from "@/lib/auth";
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

  await createAccountWithOwner({ email, name: null, passwordHash: await hash(password, 12), shipFromZip });
  // Throws NEXT_REDIRECT on success — let it propagate.
  await signIn("credentials", { email, password, redirectTo: "/ship" });
}

export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keep(formData, "email");
  const parsed = logInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/ship" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "That email and password don't match.", values };
    throw err; // NEXT_REDIRECT
  }
}

export async function logInWithGoogle() {
  await signIn("google", { redirectTo: "/ship" });
}

export async function logOut() {
  await signOut({ redirectTo: "/login" });
}
