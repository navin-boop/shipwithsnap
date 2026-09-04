import { SettingsNav } from "@/components/settings/SettingsNav";

// Spec: design/Settings.dc.html — 300px section list on the left, one section at a time on the right.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex flex-col px-6 py-7 sm:px-10 lg:border-r-2 lg:border-ink">
        <h1 className="disp pb-6 text-[40px]">Settings</h1>
        <SettingsNav />
      </aside>
      <section className="flex flex-col gap-7 px-6 py-7 sm:px-12">{children}</section>
    </main>
  );
}
