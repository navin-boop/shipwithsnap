import { auth } from "@/lib/auth";
import { logOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui";

// Phase 3 replaces this with the Ship flow from design/Main.dc.html.
export default async function ShipPage() {
  const session = await auth();
  return (
    <main className="flex flex-col gap-6 px-10 py-7">
      <h1 className="disp text-[40px]">Ship it cheaper.</h1>
      <p className="text-sm text-muted">
        Signed in as {session?.user.email}. The rate-and-buy flow lands here next.
      </p>
      <form action={logOut}>
        <Button variant="outline" size="sm" type="submit">
          Log out
        </Button>
      </form>
    </main>
  );
}
