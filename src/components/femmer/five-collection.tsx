import { getT } from "@/i18n/server";
import type { FiveCard, FivePerson } from "@/lib/femmer/data";
import { FIVE_START_OVERALL, FIVE_XP_PER_LEVEL } from "@/lib/femmer/rules";
import { FiveCardTile } from "./five-card";

/** Alle personlige kort i appen, med de man har samlet først. */
export async function FiveCollection({ cards, people }: { cards: FiveCard[]; people: FivePerson[] }) {
  const t = (await getT()).femmer;
  const owned = new Map(cards.map((card) => [card.personId, card]));
  const missing = people.filter((person) => !owned.has(person.personId));
  return <div className="grid gap-4">
    <p className="font-bold">{t.cards.owned(owned.size, people.length)}</p>
    <div className="flex flex-wrap gap-3">
      {cards.map((card) => <div key={card.id} className="grid gap-1">
        <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} footer={<div className="h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-lime-300" style={{ width: `${(card.xp / FIVE_XP_PER_LEVEL) * 100}%` }} /></div>} />
        <p className="w-[118px] text-[11px] leading-tight text-muted sm:w-[140px]">{t.cards.xp(card.xp, FIVE_XP_PER_LEVEL)}<br />{t.cards.stats(card.appearances, card.goals, card.assists)}</p>
      </div>)}
      {missing.map((person) => <div key={person.personId} className="grid gap-1">
        <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} dimmed />
        <p className="text-[11px] text-muted">{t.cards.notOwned}</p>
      </div>)}
    </div>
  </div>;
}
