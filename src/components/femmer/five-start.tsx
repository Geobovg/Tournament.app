"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FivePerson } from "@/lib/femmer/data";
import { startFiveAction } from "@/lib/femmer/actions";
import { FIVE_START_OVERALL, FIVE_STARTERS, fivePositions, type FivePosition } from "@/lib/femmer/rules";
import { buttonClass, cardClass } from "../ui";
import { FiveCardTile } from "./five-card";

const initial: ActionState = {};
// Forslaget når et kort velges: en keeper, en bak, to på midten og en spiss, i den rekkefølgen.
const suggested: FivePosition[] = ["GK", "D", "M", "M", "A"];

/** Første gang: eget kort er alltid med, resten velges blant alle de andre, og hvert kort får en posisjon. */
export function FiveStart({ people, ownPersonId }: { people: FivePerson[]; ownPersonId: string | null }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(startFiveAction, initial);
  const own = ownPersonId ? people.find((person) => person.personId === ownPersonId) ?? null : null;
  const needed = FIVE_STARTERS - (own ? 1 : 0);
  const [picked, setPicked] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, FivePosition>>(() => (own ? { [own.personId]: "A" } : {}));
  const others = people.filter((person) => person.personId !== own?.personId);
  const team = [...(own ? [own.personId] : []), ...picked];
  const toggle = (personId: string) => {
    if (picked.includes(personId)) { setPicked(picked.filter((id) => id !== personId)); return; }
    if (picked.length >= needed) return;
    const taken = Object.entries(positions).filter(([id]) => team.includes(id)).map(([, position]) => position);
    const count = (list: FivePosition[], position: FivePosition) => list.filter((entry) => entry === position).length;
    const next = suggested.find((position) => count(taken, position) < count(suggested, position)) ?? "M";
    setPicked([...picked, personId]);
    setPositions({ ...positions, [personId]: positions[personId] ?? next });
  };

  if (others.length < needed) return <section className={cardClass}><p>{t.start.notEnough}</p></section>;
  const byId = new Map(people.map((person) => [person.personId, person]));

  return <form action={action} className="grid gap-5">
    <section className={`${cardClass} grid gap-2`}>
      <h2 className="text-xl font-black">{t.start.title}</h2>
      <p className="text-muted">{own ? t.start.ownCard : t.start.noOwnCard} {t.start.allStart(FIVE_START_OVERALL)}</p>
      <p className="text-sm text-muted">{t.start.positions}</p>
      <p className="font-bold text-lime-300">{t.start.picked(picked.length, needed)}</p>
    </section>

    {team.length ? <section className={`${cardClass} grid gap-3`}>
      <h3 className="font-black">{t.start.yourTeam}</h3>
      <div className="flex flex-wrap gap-4">{team.map((id) => {
        const person = byId.get(id)!;
        return <div key={id} className="grid justify-items-center gap-2">
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} position={positions[id] ?? null} label={id === own?.personId ? t.start.you : undefined} size="sm" />
          <div className="flex gap-0.5">{fivePositions.map((position) => <button key={position} type="button" onClick={() => setPositions({ ...positions, [id]: position })} className={`rounded px-1.5 py-0.5 text-[10px] font-black ${positions[id] === position ? "bg-lime-300 text-slate-950" : "bg-white/10"}`}>{t.squad.roles[position]}</button>)}</div>
        </div>;
      })}</div>
    </section> : null}

    <div className="flex flex-wrap gap-3">
      {others.map((person) => {
        const selected = picked.includes(person.personId);
        return <button key={person.personId} type="button" onClick={() => toggle(person.personId)} aria-pressed={selected} className="text-left">
          <FiveCardTile name={person.name} slug={person.slug} overall={FIVE_START_OVERALL} selected={selected} dimmed={!selected && picked.length >= needed} />
        </button>;
      })}
    </div>
    {picked.map((id) => <input key={id} type="hidden" name="person_id" value={id} />)}
    {team.map((id) => <input key={`p-${id}`} type="hidden" name="position" value={positions[id] ?? "M"} />)}
    {state.error ? <p className="text-red-400">{state.error}</p> : null}
    <div className="sticky bottom-4 z-10 flex justify-end"><button type="submit" disabled={pending || picked.length !== needed} className={`${buttonClass} shadow-xl`}>{t.start.submit}</button></div>
  </form>;
}
