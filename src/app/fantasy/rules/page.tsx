import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";

export default async function FantasyRulesPage() {
  const t = await getT();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {t.fantasy.rules.sections.map((section) => (
        <section key={section.title} className={`${cardClass} grid content-start gap-2`}>
          <h2 className="font-semibold">{section.title}</h2>
          <ul className="grid gap-1.5 text-sm text-muted">{section.items.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
