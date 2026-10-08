"use client";

import { useActionState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FiveCard } from "@/lib/femmer/data";
import { setFiveCardPositionAction } from "@/lib/femmer/actions";
import { FIVE_XP_PER_LEVEL, fivePositions, isFivePosition, type FivePosition } from "@/lib/femmer/rules";
import { cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";

type PositionState = ActionState & { chosen?: FivePosition };
const positionInitial: PositionState = {};

/**
 * Knappene for å velge posisjon. Bytter er gratis. Valget huskes her med en gang, så knappene viser
 * riktig posisjon også før siden er hentet på nytt.
 */
export function FivePositionPicker({ cardId, position }: { cardId: string; position: FivePosition | null }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(async (previous: PositionState, formData: FormData): Promise<PositionState> => {
    const result = await setFiveCardPositionAction(previous, formData);
    const chosen = String(formData.get("position") ?? "");
    return result.ok && isFivePosition(chosen) ? { ...result, chosen } : { ...result, chosen: previous.chosen };
  }, positionInitial);
  const current = state.chosen ?? position;
  return <form action={action} className="grid gap-1">
    <input type="hidden" name="card_id" value={cardId} />
    <div className="grid grid-cols-2 gap-1">
      {fivePositions.map((option) => <button key={option} type="submit" name="position" value={option} disabled={pending || option === current} className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${option === current ? "bg-lime-300 text-slate-950" : "bg-white/10 hover:bg-white/20 disabled:opacity-40"}`}>{t.squad.positionNames[option]}</button>)}
    </div>
    <p className="text-[11px] text-muted">{t.cardDialog.positionFree}</p>
    {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
  </form>;
}

/**
 * Detaljer om ett kort: statistikk og posisjon. Vinduet legges rett i <body>,
 * siden det åpnes fra laguttaket, som selv er et skjema (skjemaer kan ikke ligge inni hverandre).
 */
export function FiveCardDialog({ card, onClose }: { card: FiveCard; onClose: () => void }) {
  const t = useT().femmer;
  return createPortal(<div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur" role="dialog" aria-modal onClick={onClose}>
    <div className={`${cardClass} grid w-full max-w-md gap-4`} onClick={(event) => event.stopPropagation()}>
      <div className="flex gap-4">
        <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} position={card.position} size="md" eager />
        <div className="grid content-start gap-1 text-sm">
          <h3 className="text-xl font-black">{card.name}</h3>
          <p className="text-muted">{t.cards.stats(card.appearances, card.goals, card.assists)}</p>
          <p className="text-muted">{t.cards.xp(card.xp, FIVE_XP_PER_LEVEL)}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lime-300" style={{ width: `${(card.xp / FIVE_XP_PER_LEVEL) * 100}%` }} /></div>
        </div>
      </div>
      <section className="grid gap-2"><h4 className="text-sm font-black">{t.cardDialog.position}</h4><FivePositionPicker cardId={card.id} position={card.position} /></section>
      <button type="button" onClick={onClose} className={secondaryButtonClass}>{t.cardDialog.close}</button>
    </div>
  </div>, document.body);
}
