import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Confirm your email · Ship with Snap", robots: { index: false, follow: false } };

export default async function VerifyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db().query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/ship");

  return (
    <AuthPanel mode="verify">
      <VerifyEmailForm email={user.email} />
    </AuthPanel>
  );
}
