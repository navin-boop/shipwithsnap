import type { Metadata } from "next";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Join a team · Ship with Snap" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db().query.invites.findFirst({ where: and(eq(schema.invites.token, token), isNull(schema.invites.acceptedAt), gt(schema.invites.expiresAt, new Date())) });
  const account = invite ? await db().query.accounts.findFirst({ where: eq(schema.accounts.id, invite.accountId) }) : null;
  return (
    <AuthPanel mode="signup">
      {invite && account ? (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="lbl">You&apos;re invited</div>
            <h1 className="disp text-[32px]">Join {account.name}</h1>
            <p className="text-sm text-muted">as a {invite.role}, using {invite.email}.</p>
          </div>
          <AcceptInviteForm token={token} />
        </>
      ) : (
        <div className="flex flex-col gap-2"><h1 className="disp text-[32px]">This invite has expired.</h1><p className="text-sm text-muted">Ask the account owner for a new link.</p></div>
      )}
    </AuthPanel>
  );
}
