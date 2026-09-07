import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { currentUser } from "@/lib/auth/session-user";

export const metadata: Metadata = { title: "Confirm your email · Ship with Snap", robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  // sent=0 means the code was generated but the email did not go out. Saying "check your inbox"
  // then would send someone hunting through a spam folder for a message that does not exist.
  const mailFailed = (await searchParams).sent === "0";
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/ship");

  return (
    <AuthPanel mode="verify">
      <VerifyEmailForm email={user.email} mailFailed={mailFailed} />
    </AuthPanel>
  );
}
