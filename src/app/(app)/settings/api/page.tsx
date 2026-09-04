import { desc, eq } from "drizzle-orm";
import { ApiPanel, SectionHeader } from "@/components/settings/Forms";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function ApiSettings() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const [keys, endpoints] = await Promise.all([
    db().query.apiKeys.findMany({ where: eq(schema.apiKeys.accountId, accountId), orderBy: desc(schema.apiKeys.createdAt) }),
    db().query.webhookEndpoints.findMany({ where: eq(schema.webhookEndpoints.accountId, accountId), orderBy: desc(schema.webhookEndpoints.createdAt) }),
  ]);
  return (
    <>
      <SectionHeader title="API & webhooks" blurb="Buy labels and read tracking from your own systems. Keys and secrets are shown once, at creation." />
      <ApiPanel keys={keys} endpoints={endpoints} />
    </>
  );
}
