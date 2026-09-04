import { eq } from "drizzle-orm";
import { PrintingForm, SectionHeader } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function PrintingSettings() {
  const session = await auth();
  const account = (await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) }))!;
  return (
    <>
      <SectionHeader title="Printing" blurb="Set once. Every label opens in this format." />
      <PrintingForm account={account} />
    </>
  );
}
