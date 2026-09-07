import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notifyWelcome } from "@/lib/email/notify";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; accountId: string; role: string };
  }
}

/**
 * Auth.js v5. JWT sessions (no session table) so the Credentials provider works.
 * Our own `accounts` (= organisations) and `users` tables are the source of truth;
 * Google sign-in upserts into them. Google is only offered when its keys are configured.
 */
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await db().query.users.findFirst({ where: eq(schema.users.email, email) });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      const sub = profile?.sub;
      if (!email || !sub || !profile?.email_verified) return false;

      const existing = await db().query.users.findFirst({ where: eq(schema.users.email, email) });
      if (existing) {
        if (!existing.googleSub) {
          await db().update(schema.users).set({ googleSub: sub }).where(eq(schema.users.id, existing.id));
        }
        return true;
      }
      await createAccountWithOwner({ email, name: profile.name ?? null, googleSub: sub });
      return true;
    },
    async jwt({ token, user }) {
      // On sign-in, attach our ids to the token; later requests read them from the JWT only.
      if (user?.email) {
        const dbUser = await db().query.users.findFirst({ where: eq(schema.users.email, user.email) });
        if (dbUser) {
          token.uid = dbUser.id;
          token.accountId = dbUser.accountId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.accountId = token.accountId as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});

export const isGoogleEnabled = googleEnabled;

/** Creates an account (organisation) with its first user as owner. Used by sign-up and Google first sign-in. */
export async function createAccountWithOwner(input: {
  email: string;
  name: string | null;
  passwordHash?: string;
  googleSub?: string;
  shipFromZip?: string;
}) {
  // Google has already proven the address it hands us, so those accounts skip the code entirely.
  // Password sign-ups stay unverified until they enter one.
  const emailVerifiedAt = input.googleSub ? new Date() : null;
  const accountName = input.name ?? input.email.split("@")[0];
  const [account] = await db()
    .insert(schema.accounts)
    .values({ name: accountName, shipFromZip: input.shipFromZip })
    .returning();
  const [user] = await db()
    .insert(schema.users)
    .values({
      accountId: account.id,
      email: input.email,
      name: input.name,
      role: "owner",
      passwordHash: input.passwordHash,
      googleSub: input.googleSub,
      emailVerifiedAt,
    })
    .returning();
  // Welcome mail waits for a proven address; the verification flow sends it once the code lands.
  if (emailVerifiedAt) await notifyWelcome({ email: user.email, name: user.name });
  return { account, user };
}
