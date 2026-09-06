import type { Metadata } from "next";
import { ManifestsView } from "@/components/manifests/ManifestsView";
import { listManifestCandidates, listManifests } from "@/lib/manifests/actions";

export const metadata: Metadata = { title: "Manifests · Ship with Snap" };

export default async function ManifestsPage() {
  const [manifests, candidates] = await Promise.all([listManifests(), listManifestCandidates()]);
  return (
    <main className="flex flex-1 flex-col">
      <ManifestsView initial={manifests} candidates={candidates} />
    </main>
  );
}
