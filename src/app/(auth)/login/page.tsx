import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel, OrDivider } from "@/components/auth/AuthPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LogInForm } from "@/components/auth/LogInForm";
import { auth, isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Ship with Snap" };

export default async function LogInPage() {
  const session = await auth();
  if (session?.user) redirect("/ship");
  return (
    <AuthPanel mode="login">
      {isGoogleEnabled && (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      )}
      <LogInForm />
    </AuthPanel>
  );
}
