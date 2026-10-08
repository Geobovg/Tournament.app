"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FivePerson } from "@/lib/femmer/data";
import { startFiveAction } from "@/lib/femmer/actions";
import { FIVE_START_OVERALL, FIVE_STARTERS, fivePositions, type FivePosition } from "@/lib/femmer/rules";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";

const initial: ActionState = {};

/**
 * Første gang, i to steg. Steg 1: eget kort er alltid med, og resten velges blant alle de andre.
 * Steg 2: hvert kort i startoppstillingen får en posisjon. Knappene ligger øverst, så de aldri
 * havner bak musikkspilleren nederst på skjermen.
 */
export function FiveStart({ people, ownPersonId }: { people: FivePerson[]; ownPersonId: string | null }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(startFiveAction, initial);
  const own = ownPersonId ? people.find((person) => person.personId === ownPersonId) ?? null : null;
  const needed = FIVE_STARTERS - (own ? 1 : 0);
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<"players" | "positions">("players");
  const [positions, setPositions] = useState<Record<string, FivePosition>>({});
  const others = people.filter((person) => person.personId !== own?.personId);
  const team = [...(own ? [own.personId] : []), ...picked];
  const byId = new Map(people.map((person) => [person.personId, person]));
  const toggle = (personId: string) => setPicked((current) => current.includes(personId) ? current.filter((id) => id !== personId) : current.length < needed ? [...current, personId] : current);
  const missing = team.filter((id) => !positions[id]).length;

  if (others.length < needed) return <section className={cardClass}><p>{t.start.notEnough}</p></section>;

  if (step === "players") return <div className="grid gap-5">
    <section className={`${cardClass} grid gap-3`}>
      <p className="text-xs font-black tracking-widest text-fuchsia-300">{t.start.step(1)}</p>
      <h2 className="text-xl font-black">{t.start.title}</h2>
      <p className="text-muted">{own ? t.start.ownCard : t.start.noOwnCard} {t.start.allStart(FIVE_START_OVERALL)}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={picked.length !== needed} onClick={() => setStep("positions")} className={buttonClass}>{t.start.confirmPlayers}</button>
        <p className="font-bold text-lime-300">{t.start.picked(picked.length, needed)}</p>
      </div>
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
  </div>;

  return <form action={action} className="grid gap-5">
    {picked.map((id) => <input key={id} type="hidden" name="person_id" value={id} />)}
    {team.map((id) => <input key={`p-${id}`} type="hidden" name="position" value={positions[id] ?? ""} />)}
    <section className={`${cardClass} grid gap-3 border-2 border-fuchsia-400/60`}>
      <p className="text-xs font-black tracking-widest text-fuchsia-300">{t.start.step(2)}</p>
      <h2 className="text-2xl font-black">{t.start.positionsTitle}</h2>
      <p className="text-muted">{t.start.positionsText}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || missing > 0} className={buttonClass}>{t.start.submit}</button>
        <button type="button" onClick={() => setStep("players")} className={secondaryButtonClass}>{t.start.back}</button>
        <p className={`font-bold ${missing ? "text-amber-300" : "text-lime-300"}`}>{missing ? t.start.positionsLeft(missing) : t.start.positionsDone}</p>
      </div>
      {state.error ? <p className="text-red-400">{state.error}</p> : null}
    </section>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {team.map((id) => {
        const person = byId.get(id)!;
        const chosen = positions[id] ?? null;
        return <section key={id} className={`flex gap-3 rounded-2xl border-2 p-3 ${chosen ? "border-lime-300/50 bg-lime-300/5" : "border-amber-300/70 bg-amber-300/10"}`}>
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} position={chosen} label={id === own?.personId ? t.start.you : undefined} size="sm" />
          <div className="grid flex-1 content-start gap-2">
            <p className="font-black">{person.name}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {fivePositions.map((position) => <button key={position} type="button" onClick={() => setPositions({ ...positions, [id]: position })} aria-pressed={chosen === position} className={`rounded-lg px-2 py-2 text-sm font-black transition ${chosen === position ? "bg-lime-300 text-slate-950" : "bg-white/10 hover:bg-white/20"}`}>{t.squad.positionNames[position]}</button>)}
            </div>
          </div>
        </section>;
      })}
    </div>
  </form>;
}
