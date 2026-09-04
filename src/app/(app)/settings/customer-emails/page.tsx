import { eq } from "drizzle-orm";
import { CustomerEmailsForm, SectionHeader } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function CustomerEmailSettings() {
  const session = await auth();
  const account = (await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) }))!;
  return (
    <>
      <SectionHeader title="Customer emails" blurb="What your customers receive as their package moves. Your store name, your reply-to." />
      <CustomerEmailsForm prefs={account.customerEmails} />
    </>
  );
}
