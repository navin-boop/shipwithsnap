import type { Metadata } from "next";
import { ClaimsView } from "@/components/claims/ClaimsView";
import { auth } from "@/lib/auth";
import { listClaimableLabels, listClaims } from "@/lib/claims/actions";

export const metadata: Metadata = { title: "Claims · Ship with Snap" };

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const [session, claims, claimable, sp] = await Promise.all([auth(), listClaims(), listClaimableLabels(), searchParams]);
  return (
    <main className="flex flex-1 flex-col">
      <ClaimsView initial={claims} claimable={claimable} preselect={sp.label ?? null} defaultEmail={session?.user.email ?? ""} />
    </main>
  );
}
