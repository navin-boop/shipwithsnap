import type { Metadata } from "next";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatAddressLine } from "@/lib/ship/address";

export const metadata: Metadata = { title: "Address book · Ship with Snap" };

// Spec: design/AddressBook.dc.html — everyone you've shipped to, verified once.
export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  const { q = "" } = await searchParams;
  const accountId = session!.user.accountId;
  const rows = await db()
    .select({
      a: schema.addresses,
      shipments: count(schema.shipments.id),
      last: sql<Date | null>`max(${schema.shipments.createdAt})`,
    })
    .from(schema.addresses)
    .leftJoin(schema.shipments, and(eq(schema.shipments.shipToId, schema.addresses.id), sql`${schema.shipments.status} <> 'draft'`))
    .where(and(eq(schema.addresses.accountId, accountId), eq(schema.addresses.kind, "ship_to"), q ? or(ilike(schema.addresses.name, `%${q}%`), ilike(schema.addresses.city, `%${q}%`), ilike(schema.addresses.street1, `%${q}%`)) : undefined))
    .groupBy(schema.addresses.id)
    .orderBy(desc(schema.addresses.lastUsedAt))
    .limit(200);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-6 pb-[18px] pt-7 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="disp text-[40px]">Address book</h1>
          <p className="text-sm text-muted">Everyone you&apos;ve shipped to, verified once. Start typing a name on the Ship page to reuse one.</p>
        </div>
        <form className="flex h-10 w-full items-center gap-2 border-[1.5px] border-ink px-3 sm:w-[280px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input name="q" defaultValue={q} placeholder="Search name, street, city" className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted" />
        </form>
      </div>
      <div className="hidden grid-cols-[1.3fr_2fr_1fr_0.8fr_0.8fr] items-center border-b border-ink border-t-2 px-10 py-2.5 md:grid">
        <div className="lbl">Name</div><div className="lbl">Address</div><div className="lbl">Type</div><div className="lbl text-right">Shipments</div><div className="lbl text-right">Last shipped</div>
      </div>
      <div className="flex flex-col">
        {rows.map(({ a, shipments, last }) => (
          <div key={a.id} className="grid grid-cols-1 gap-y-1 border-b border-hairline px-6 py-3.5 text-sm sm:px-10 md:grid-cols-[1.3fr_2fr_1fr_0.8fr_0.8fr] md:items-center">
            <div className="font-semibold">{a.name ?? a.company ?? "—"}</div>
            <div>{formatAddressLine(a)}</div>
            <div className="lbl">{a.residential === null ? "Unknown" : a.residential ? "Residential" : "Commercial"}</div>
            <div className="md:text-right">{Number(shipments)}</div>
            <div className="text-muted md:text-right">{last ? new Date(last).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
          </div>
        ))}
        {!rows.length && <div className="px-6 py-12 text-sm text-muted sm:px-10">{q ? "No addresses match." : "No recipients yet — they're saved automatically when you ship."}</div>}
      </div>
      <div className="mt-auto flex items-center justify-between border-t-2 border-ink px-6 py-4 text-[13px] text-muted sm:px-10">
        <div>{rows.length} address{rows.length === 1 ? "" : "es"}</div>
      </div>
    </main>
  );
}
