import { eq } from "drizzle-orm";
import { CustomsDefaultsForm } from "@/components/settings/CarrierForms";
import { SectionHeader } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function InternationalSettings() {
  const session = await auth();
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) });
  return (
    <>
      <SectionHeader title="International" blurb="Defaults for the customs declaration on every shipment leaving the country." />
      <CustomsDefaultsForm defaults={account?.customsDefaults ?? {}} />
    </>
  );
}
