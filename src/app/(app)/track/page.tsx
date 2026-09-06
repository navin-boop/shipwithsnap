import type { Metadata } from "next";
import { TrackView } from "@/components/trackers/TrackView";
import { listTrackers } from "@/lib/trackers/actions";

export const metadata: Metadata = { title: "Track a package · Ship with Snap" };

export default async function TrackPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TrackView initial={await listTrackers()} />
    </main>
  );
}
