"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { resendVerificationCode, verifyEmailCode, type AuthFormState } from "@/lib/auth/actions";

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(verifyEmailCode, undefined);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [resending, startResend] = useTransition();
  const error = state?.fieldErrors?.code ?? state?.error;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="disp text-[34px] leading-[1.05]">Check your email.</h1>
        <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">
          We sent a six-digit code to <span className="font-extrabold text-ink">{email}</span>. Enter it below to finish setting up your account.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5" noValidate>
        <Input
          name="code"
          label="Verification code"
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={error}
          size="lg"
          className="[&_input]:text-center [&_input]:tracking-[12px]"
          required
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Verify email"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={resending}
          onClick={() => startResend(async () => setNotice(await resendVerificationCode()))}
          className="self-start text-[14px] font-extrabold text-coral underline underline-offset-2 disabled:opacity-50"
        >
          {resending ? "Sending…" : "Send a new code"}
        </button>
        {notice && <p className={notice.ok ? "text-xs font-bold text-teal" : "text-xs font-bold text-danger"}>{notice.message}</p>}
        <p className="text-xs leading-[1.5] text-muted">
          Codes last 15 minutes. Check your spam folder if it hasn&apos;t arrived within a minute.
        </p>
      </div>
    </div>
  );
}
