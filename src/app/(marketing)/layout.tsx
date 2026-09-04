import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingNav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
