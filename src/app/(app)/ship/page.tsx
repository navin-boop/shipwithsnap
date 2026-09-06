import type { Metadata } from "next";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { ShipFlow } from "@/components/ship/ShipFlow";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDefaultShipFrom } from "@/lib/ship/service";
import { getDefaultPaymentMethod } from "@/lib/billing/service";
import { billingEnabled } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Ship · Ship with Snap" };

export default async function ShipPage() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) });
  const [from, [{ n }], presets, shipFromOptions] = await Promise.all([
    account ? getDefaultShipFrom(account) : null,
    db().select({ n: count() }).from(schema.labels).where(and(eq(schema.labels.accountId, accountId), isNull(schema.labels.voidedAt))),
    db().query.parcelPresets.findMany({ where: eq(schema.parcelPresets.accountId, accountId), orderBy: schema.parcelPresets.createdAt }),
    db().query.addresses.findMany({ where: and(eq(schema.addresses.accountId, accountId), eq(schema.addresses.kind, "ship_from")), orderBy: desc(schema.addresses.lastUsedAt) }),
  ]);
  const card = billingEnabled() ? await getDefaultPaymentMethod(accountId) : null;
  return (
    <main className="flex flex-1 flex-col">
      <ShipFlow
        initialFrom={from}
        shipFromOptions={shipFromOptions}
        afterBuy={(account?.afterBuy as "print" | "download" | "nothing") ?? "print"}
        labelCount={Number(n)}
        presets={presets}
        rateRules={account?.rateRules ?? { mode: "cheapest" }}
        customsDefaults={account?.customsDefaults ?? {}}
        accountName={account?.name ?? ""}
        cardLabel={card ? `${card.brand} ·· ${card.last4}` : null}
        billingOn={billingEnabled()}
        billingLocked={account?.billingLockedReason ?? null}
      />
    </main>
  );
}
