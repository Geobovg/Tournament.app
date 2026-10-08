"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FivePerson } from "@/lib/femmer/data";
import { startFiveAction } from "@/lib/femmer/actions";
import { FIVE_START_OVERALL, FIVE_STARTERS } from "@/lib/femmer/rules";
import { buttonClass, cardClass } from "../ui";
import { FiveCardTile } from "./five-card";

const initial: ActionState = {};

/** Første gang: eget kort er alltid med, og resten av startfemmeren velges blant alle de andre. */
export function FiveStart({ people, ownPersonId }: { people: FivePerson[]; ownPersonId: string | null }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(startFiveAction, initial);
  const [picked, setPicked] = useState<string[]>([]);
  const own = ownPersonId ? people.find((person) => person.personId === ownPersonId) ?? null : null;
  const needed = FIVE_STARTERS - (own ? 1 : 0);
  const others = people.filter((person) => person.personId !== own?.personId);
  const toggle = (personId: string) => setPicked((current) => current.includes(personId) ? current.filter((id) => id !== personId) : current.length < needed ? [...current, personId] : current);

  if (others.length < needed) return <section className={cardClass}><p>{t.start.notEnough}</p></section>;

  return <form action={action} className="grid gap-5">
    <section className={`${cardClass} grid gap-2`}>
      <h2 className="text-xl font-black">{t.start.title}</h2>
      <p className="text-muted">{own ? t.start.ownCard : t.start.noOwnCard} {t.start.allStart(FIVE_START_OVERALL)}</p>
      <p className="font-bold text-lime-300">{t.start.picked(picked.length, needed)}</p>
    </section>
    {own ? <div className="flex items-center gap-4"><FiveCardTile name={own.name} slug={own.slug} overall={FIVE_START_OVERALL} label={t.start.you} selected /><p className="text-sm text-muted">{t.start.ownCard}</p></div> : null}
    <div className="flex flex-wrap gap-3">
      {others.map((person) => {
        const selected = picked.includes(person.personId);
        return <button key={person.personId} type="button" onClick={() => toggle(person.personId)} aria-pressed={selected} className="text-left">
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} selected={selected} dimmed={!selected && picked.length >= needed} />
        </button>;
      })}
    </div>
    {picked.map((id) => <input key={id} type="hidden" name="person_id" value={id} />)}
    {state.error ? <p className="text-red-400">{state.error}</p> : null}
    <div className="sticky bottom-4 z-10 flex justify-end"><button type="submit" disabled={pending || picked.length !== needed} className={`${buttonClass} shadow-xl`}>{t.start.submit}</button></div>
  </form>;
}
