/**
 * The signed-in user's row, or null.
 *
 * A JWT session outlives the row it points at: delete an account and every browser holding a
 * cookie still presents a valid-looking session for a user that no longer exists. Pages must
 * decide on the row, not the cookie — otherwise /ship sends them to /verify, /verify sends them
 * to /login, and /login sends them back to /ship forever.
 */
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { User } from "@/lib/db/schema";

export async function currentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return (await db().query.users.findFirst({ where: eq(schema.users.id, session.user.id) })) ?? null;
}
