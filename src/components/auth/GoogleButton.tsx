import { logInWithGoogle } from "@/lib/auth/actions";
import { GoogleIcon } from "./AuthPanel";

/** Outline pill; rendered only when Google keys are configured. */
export function GoogleButton() {
  return (
    <form action={logInWithGoogle}>
      <button
        type="submit"
        className="flex h-[52px] w-full items-center justify-center gap-3 rounded-pill border-2 border-ink bg-surface font-display text-[15px] font-extrabold hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
    </form>
  );
}
