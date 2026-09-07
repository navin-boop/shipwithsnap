import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Account } from "@/lib/db/schema";

/**
 * Role gate for server actions.
 *
 * The three roles mean what they say: an owner runs the account, a shipper buys and voids labels,
 * and a viewer looks. Without this, a viewer invited to "just watch the shipments" could buy
 * postage, void labels and file claims — all of which move money.
 *
 * Read paths use `requireSession`; anything that writes or spends uses `requireWriter` or
 * `requireOwner`.
 *
 * `requireWriter` also insists the address has been verified. The layout redirects unverified
 * users to /verify, but a redirect is decoration: server actions are callable directly by anyone
 * with a session cookie, so the gate that actually matters lives here.
 */

export type Role = "owner" | "shipper" | "viewer";
export type SessionUser = { id: string; accountId: string; role: string; email: string };

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Not signed in");
  return session.user as SessionUser;
}

export const UNVERIFIED_MESSAGE = "Confirm your email address before buying labels — check your inbox for the code.";

/** Anyone who may change things: owners and shippers, never viewers, and never unverified. */
export async function requireWriter(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === "viewer") throw new ForbiddenError("Your account is read-only. Ask an owner for shipper access.");
  const row = await db().query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!row?.emailVerifiedAt) throw new ForbiddenError(UNVERIFIED_MESSAGE);
  return user;
}

export async function requireOwnerUser(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "owner") throw new ForbiddenError("Only an owner can do that.");
  return user;
}

/** The writer's account row, for actions that need account settings (rates, billing, labels). */
export async function requireWriterAccount(): Promise<{ account: Account; userId: string; role: string }> {
  const user = await requireWriter();
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, user.accountId) });
  if (!account) throw new ForbiddenError("Account not found");
  return { account, userId: user.id, role: user.role };
}
