"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { acceptInvite, type AuthFormState } from "@/lib/auth/actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(acceptInvite, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input name="name" label="Your name" autoComplete="name" defaultValue={state?.values?.name} error={fe.name} required />
      <Input name="password" type="password" label="Choose a password" placeholder="12 characters or more" autoComplete="new-password" error={fe.password} required />
      {state?.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">{pending ? "Joining…" : "Join the team"}</Button>
    </form>
  );
}
