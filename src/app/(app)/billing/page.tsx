import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { BillingView, type CardView } from "@/components/billing/BillingView";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { listLedger, listPaymentMethods, monthSummary } from "@/lib/billing/service";
import { billingEnabled, publishableKey } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Billing · Ship with Snap" };

// Spec: design/Wallet.dc.html (file name is historical — this is the Billing screen).
export default async function BillingPage() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const [account, cards, ledger, summary] = await Promise.all([
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) }),
    listPaymentMethods(accountId),
    listLedger(accountId),
    monthSummary(accountId),
  ]);

  const now = new Date();
  const cardViews: CardView[] = cards.map((c) => ({
    id: c.id,
    brand: c.brand,
    last4: c.last4,
    exp: `${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`,
    nameOnCard: c.nameOnCard,
    isDefault: c.isDefault,
    expired: c.expYear < now.getFullYear() || (c.expYear === now.getFullYear() && c.expMonth < now.getMonth() + 1),
  }));

  return (
    <main className="flex flex-1 flex-col">
      <BillingView
        cards={cardViews}
        ledger={ledger}
        summary={summary}
        publishableKey={publishableKey()}
        billingEnabled={billingEnabled()}
        lockedReason={account?.billingLockedReason ?? null}
        receiptEmails={account?.receiptEmails ?? true}
        receiptEmail={account?.receiptEmail ?? ""}
        isOwner={session!.user.role === "owner"}
      />
    </main>
  );
}
