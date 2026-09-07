import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { currentUser } from "@/lib/auth/session-user";

export const metadata: Metadata = { title: "Confirm your email · Ship with Snap", robots: { index: false, follow: false } };

export default async function VerifyPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/ship");

  return (
    <AuthPanel mode="verify">
      <VerifyEmailForm email={user.email} />
    </AuthPanel>
  );
}
