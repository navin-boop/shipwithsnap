import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel, OrDivider } from "@/components/auth/AuthPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { isGoogleEnabled } from "@/lib/auth";
import { currentUser } from "@/lib/auth/session-user";

export const metadata: Metadata = { title: "Create account · Ship with Snap" };

export default async function SignUpPage() {
  if (await currentUser()) redirect("/ship");
  return (
    <AuthPanel mode="signup">
      {isGoogleEnabled && (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      )}
      <SignUpForm />
    </AuthPanel>
  );
}
