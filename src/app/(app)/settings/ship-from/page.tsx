import { and, desc, eq } from "drizzle-orm";
import { SectionHeader, ShipFromList } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function ShipFromSettings() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const [account, addresses] = await Promise.all([
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) }),
    db().query.addresses.findMany({ where: and(eq(schema.addresses.accountId, accountId), eq(schema.addresses.kind, "ship_from")), orderBy: desc(schema.addresses.lastUsedAt) }),
  ]);
  return (
    <>
      <SectionHeader title="Ship-from addresses" blurb="Warehouses and pickup points you ship from. The default is used for rates until you change it." />
      <ShipFromList addresses={addresses} defaultId={account?.defaultShipFromId ?? null} />
    </>
  );
}
