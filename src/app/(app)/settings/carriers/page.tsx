import { eq } from "drizzle-orm";
import { CarrierAccountsPanel, RateRulesPanel } from "@/components/settings/CarrierForms";
import { SectionHeader } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { getCarrierMetadata, listCarrierAccounts, listCarrierTypes } from "@/lib/carriers/actions";
import { db, schema } from "@/lib/db";

export default async function CarriersSettings() {
  const session = await auth();
  const [account, accounts, types, metadata] = await Promise.all([
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) }),
    listCarrierAccounts(),
    listCarrierTypes(),
    getCarrierMetadata(),
  ]);
  return (
    <>
      <SectionHeader title="Carriers & rates" blurb="Which carriers you ship with, and which rate we pre-select for you." />
      <CarrierAccountsPanel accounts={accounts} types={types} />
      <div className="border-t-2 border-line pt-7">
        <RateRulesPanel rules={account?.rateRules ?? { mode: "cheapest" }} metadata={metadata} />
      </div>
    </>
  );
}
