import { redirect } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { auth } from "@/lib/auth";

/** Everything under (app) requires a signed-in user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppNav />
      {children}
      <AppFooter />
    </div>
  );
}
