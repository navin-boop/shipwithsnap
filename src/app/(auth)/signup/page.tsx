import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel, OrDivider } from "@/components/auth/AuthPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { auth, isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account · Ship with Snap" };

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/ship");
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
