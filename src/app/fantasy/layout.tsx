import { FantasyNav } from "@/components/fantasy-nav";
import { ModePageHeading } from "@/components/mode-menu";
import { getT } from "@/i18n/server";

export default async function FantasyLayout({ children }: LayoutProps<"/fantasy">) {
  const t = await getT();
  return (
    <div className="grid gap-6">
      <ModePageHeading title={t.fantasy.title} description={t.fantasy.description} />
      <FantasyNav />
      {children}
    </div>
  );
}
