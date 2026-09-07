import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDefaultPaymentMethod } from "@/lib/billing/service";
import { billingEnabled } from "@/lib/billing/stripe";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

/** Everything under (app) requires a signed-in user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // An unverified sign-up has a session but no proven address; send them to finish that first.
  const me = await db().query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
  if (!me?.emailVerifiedAt) redirect("/verify");
  const card = billingEnabled() ? await getDefaultPaymentMethod(session.user.accountId) : null;
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppNav cardLabel={card ? `${card.brand} ·· ${card.last4}` : undefined} />
      {children}
      <AppFooter />
    </div>
  );
}
