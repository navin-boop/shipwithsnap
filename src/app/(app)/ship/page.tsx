import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ShipFlow } from "@/components/ship/ShipFlow";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDefaultShipFrom } from "@/lib/ship/service";

export const metadata: Metadata = { title: "Ship · Ship with Snap" };

export default async function ShipPage() {
  const session = await auth();
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session!.user.accountId) });
  const from = account ? await getDefaultShipFrom(account) : null;
  return (
    <main className="flex flex-1 flex-col">
      <ShipFlow initialFrom={from} />
    </main>
  );
}
