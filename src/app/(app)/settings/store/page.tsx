import { eq } from "drizzle-orm";
import { SectionHeader, StoreForm } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function StoreSettings() {
  const session = await auth();
  const account = (await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) }))!;
  // Don't ship the base64 to the client; the form loads the logo from /api/logo.
  const { logoData, ...rest } = account;
  return (
    <>
      <SectionHeader title="Store" blurb="How your store appears to customers on labels, emails and the tracking page." />
      <StoreForm account={{ ...rest, logoData: null }} hasLogo={!!logoData} />
    </>
  );
}
