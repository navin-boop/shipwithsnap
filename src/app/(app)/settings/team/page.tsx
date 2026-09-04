import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { SectionHeader, TeamPanel } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function TeamSettings() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const [members, invites] = await Promise.all([
    db().query.users.findMany({ where: eq(schema.users.accountId, accountId), orderBy: asc(schema.users.createdAt) }),
    db().query.invites.findMany({ where: and(eq(schema.invites.accountId, accountId), isNull(schema.invites.acceptedAt), gt(schema.invites.expiresAt, new Date())) }),
  ]);
  return (
    <>
      <SectionHeader title="Team" blurb="Invite packers and bookkeepers. Roles: owner, shipper (buys labels), viewer (reports only)." />
      <TeamPanel members={members} invites={invites} me={session!.user.id} />
    </>
  );
}
