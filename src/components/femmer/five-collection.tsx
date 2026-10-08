"use client";

import { useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { INTL_LOCALES } from "@/i18n/locales";
import type { FiveCard, FiveInform, FivePerson } from "@/lib/femmer/data";
import { FIVE_START_OVERALL, FIVE_XP_PER_LEVEL } from "@/lib/femmer/rules";
import { FiveCardTile } from "./five-card";
import { FiveCardDialog } from "./five-card-dialog";

/**
 * Kortene: de man har (trykk for å oppgradere eller bytte posisjon), de man mangler, og alle
 * inform-kortene som er laget, med ukens runde først.
 */
export function FiveCollection({ cards, people, informs, coins }: { cards: FiveCard[]; people: FivePerson[]; informs: FiveInform[]; coins: number }) {
  const t = useT().femmer;
  const locale = useLocale();
  const [details, setDetails] = useState<string | null>(null);
  const ownedPeople = new Set(cards.filter((card) => !card.informId).map((card) => card.personId));
  const ownedInforms = new Set(cards.map((card) => card.informId).filter(Boolean));
  const missing = people.filter((person) => !ownedPeople.has(person.personId));
  const detailCard = cards.find((card) => card.id === details);
  const weeks = [...new Set(informs.map((inform) => inform.weekStart))];
  const date = new Intl.DateTimeFormat(INTL_LOCALES[locale], { day: "numeric", month: "short" });

  return <div className="grid gap-6">
    <section className="grid gap-3">
      <p className="font-bold">{t.cards.owned(ownedPeople.size, people.length)}</p>
      <p className="text-sm text-muted">{t.cards.tapHint}</p>
      <div className="flex flex-wrap gap-3">
        {cards.map((card) => <button key={card.id} type="button" onClick={() => setDetails(card.id)} className="grid gap-1 text-left">
          <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} position={card.position} inform={Boolean(card.informId)} footer={<div className="h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-lime-300" style={{ width: `${(card.xp / FIVE_XP_PER_LEVEL) * 100}%` }} /></div>} />
          <p className="w-[118px] text-[11px] leading-tight text-muted sm:w-[140px]">{t.cards.stats(card.appearances, card.goals, card.assists)}</p>
        </button>)}
        {missing.map((person) => <div key={person.personId} className="grid gap-1">
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} dimmed />
          <p className="text-[11px] text-muted">{t.cards.notOwned}</p>
        </div>)}
      </div>
    </section>

    <section className="grid gap-3">
      <div><h3 className="text-xl font-black">{t.informs.title}</h3><p className="text-sm text-muted">{t.informs.rule}</p></div>
      {weeks.length === 0 ? <p className="text-sm text-muted">{t.informs.none}</p> : null}
      {weeks.map((week) => {
        const round = informs.filter((inform) => inform.weekStart === week);
        return <div key={week} className="grid gap-2">
          <p className="text-sm font-black">{round[0]?.current ? t.informs.thisWeek : t.informs.week(date.format(new Date(week)))}</p>
          <div className="flex flex-wrap gap-3">{round.map((inform) => <div key={inform.id} className="grid gap-1">
            <FiveCardTile name={inform.name} slug={inform.slug} overall={inform.overall} inform label={`#${inform.rank}`} dimmed={!ownedInforms.has(inform.id)} />
            <p className="text-[11px] text-muted">{t.informs.points(inform.points, inform.boost)}</p>
          </div>)}</div>
        </div>;
      })}
    </section>
    {detailCard ? <FiveCardDialog card={detailCard} coins={coins} onClose={() => setDetails(null)} /> : null}
  </div>;
}
