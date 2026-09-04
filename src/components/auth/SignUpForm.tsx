"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { signUp, type AuthFormState } from "@/lib/auth/actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Input name="email" type="email" label="Work email" placeholder="you@yourstore.com" autoComplete="email" defaultValue={v.email} error={fe.email} required />
      <Input name="password" type="password" label="Password" placeholder="12 characters or more" autoComplete="new-password" error={fe.password} required />
      <Input name="shipFromZip" inputMode="numeric" label="Ship-from ZIP" placeholder="11201" autoComplete="postal-code" defaultValue={v.shipFromZip} error={fe.shipFromZip} required />
      {state?.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create free account"}
      </Button>
      <p className="text-xs leading-[1.5] text-muted">
        By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  );
}
