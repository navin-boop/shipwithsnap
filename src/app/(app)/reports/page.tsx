import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/ReportsView";
import { auth } from "@/lib/auth";
import { buildReport, type Range } from "@/lib/reports/queries";

export const metadata: Metadata = { title: "Reports · Ship with Snap" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await auth();
  const { range } = await searchParams;
  const r = (["7d", "30d", "90d"].includes(range ?? "") ? range : "30d") as Range;
  const report = await buildReport(session!.user.accountId, r);
  return (
    <main className="flex flex-1 flex-col">
      <ReportsView report={report} />
    </main>
  );
}
