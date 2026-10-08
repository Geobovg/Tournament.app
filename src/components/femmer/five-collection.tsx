"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { FiveCard, FivePerson } from "@/lib/femmer/data";
import { FIVE_START_OVERALL, FIVE_XP_PER_LEVEL } from "@/lib/femmer/rules";
import { FiveCardTile } from "./five-card";
import { FiveCardDialog } from "./five-card-dialog";

/**
 * Kortene: de man har (trykk for å bytte posisjon) og de man mangler.
 */
export function FiveCollection({ cards, people }: { cards: FiveCard[]; people: FivePerson[] }) {
  const t = useT().femmer;
  const [details, setDetails] = useState<string | null>(null);
  const ownedPeople = new Set(cards.map((card) => card.personId));
  const missing = people.filter((person) => !ownedPeople.has(person.personId));
  const detailCard = cards.find((card) => card.id === details);

  return <div className="grid gap-6">
    <section className="grid gap-3">
      <p className="font-bold">{t.cards.owned(ownedPeople.size, people.length)}</p>
      <p className="text-sm text-muted">{t.cards.tapHint}</p>
      <div className="flex flex-wrap gap-3">
        {cards.map((card) => <button key={card.id} type="button" onClick={() => setDetails(card.id)} className="grid gap-1 text-left">
          <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} position={card.position} footer={<div className="h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-lime-300" style={{ width: `${(card.xp / FIVE_XP_PER_LEVEL) * 100}%` }} /></div>} />
          <p className="w-[118px] text-[11px] leading-tight text-muted sm:w-[140px]">{t.cards.stats(card.appearances, card.goals, card.assists)}</p>
        </button>)}
        {missing.map((person) => <div key={person.personId} className="grid gap-1">
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} dimmed />
          <p className="text-[11px] text-muted">{t.cards.notOwned}</p>
        </div>)}
      </div>
    </section>

    {detailCard ? <FiveCardDialog card={detailCard} onClose={() => setDetails(null)} /> : null}
  </div>;
}
