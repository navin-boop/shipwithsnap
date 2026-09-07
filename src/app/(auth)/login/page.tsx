import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel, OrDivider } from "@/components/auth/AuthPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LogInForm } from "@/components/auth/LogInForm";
import { isGoogleEnabled } from "@/lib/auth";
import { currentUser } from "@/lib/auth/session-user";

export const metadata: Metadata = { title: "Log in · Ship with Snap" };

export default async function LogInPage() {
  // Decide on the row, not the cookie: a session pointing at a deleted user must be able to log
  // in again rather than being bounced back into an app it cannot enter.
  if (await currentUser()) redirect("/ship");
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
