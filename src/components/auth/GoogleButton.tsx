import { logInWithGoogle } from "@/lib/auth/actions";
import { GoogleIcon } from "./AuthPanel";

/** 52px outline button; rendered only when Google keys are configured. */
export function GoogleButton() {
  return (
    <form action={logInWithGoogle}>
      <button
        type="submit"
        className="flex h-[52px] w-full items-center justify-center gap-3 border-2 border-ink text-[13px] font-semibold uppercase tracking-[0.8px] hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
    </form>
  );
}
