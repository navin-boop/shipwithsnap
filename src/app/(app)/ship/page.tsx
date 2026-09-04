import type { Metadata } from "next";
import { and, count, eq, isNull } from "drizzle-orm";
import { ShipFlow } from "@/components/ship/ShipFlow";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDefaultShipFrom } from "@/lib/ship/service";

export const metadata: Metadata = { title: "Ship · Ship with Snap" };

export default async function ShipPage() {
  const session = await auth();
  const accountId = session!.user.accountId;
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) });
  const [from, [{ n }]] = await Promise.all([
    account ? getDefaultShipFrom(account) : null,
    db().select({ n: count() }).from(schema.labels).where(and(eq(schema.labels.accountId, accountId), isNull(schema.labels.voidedAt))),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <ShipFlow initialFrom={from} afterBuy={(account?.afterBuy as "print" | "download" | "nothing") ?? "print"} labelCount={Number(n)} />
    </main>
  );
}
