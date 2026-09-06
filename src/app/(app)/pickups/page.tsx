import type { Metadata } from "next";
import { PickupsView } from "@/components/pickups/PickupsView";
import { listPickupCandidates, listPickups } from "@/lib/pickups/actions";

export const metadata: Metadata = { title: "Pickups · Ship with Snap" };

export default async function PickupsPage({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const [pickups, candidates, sp] = await Promise.all([listPickups(), listPickupCandidates(), searchParams]);
  return (
    <main className="flex flex-1 flex-col">
      <PickupsView initial={pickups} candidates={candidates} preselect={sp.label ?? null} />
    </main>
  );
}
