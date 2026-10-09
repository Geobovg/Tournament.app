"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { finishSubWindowAction, makeManagerSubstitutionAction } from "@/lib/career-actions";
import {
  canReplace,
  MAX_SUBSTITUTIONS,
  squadAtSubWindow,
  subReadySides,
  substitutionGain,
  SUB_WINDOW_MAX_MS,
  suggestSubstitutions,
  type ManagerPlayerSnapshot,
  type MatchSide,
  type SquadMember,
  type SubstitutionSuggestion,
} from "@/lib/manager-match";
import type { Dictionary } from "@/i18n/dictionaries";
import { useT } from "@/i18n/client";
import { buttonClass } from "./ui";

const initial: ActionState = {};

/** Samme regel som i hendelseslista: etternavnet alene når hele navnet er for langt. */
function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex < 0) return trimmed;
  const surname = trimmed.slice(spaceIndex + 1);
  return surname.length >= 3 ? surname : trimmed;
}

/** Kondisjonen i prosent: full for en innbytter, rundt 70 % på 70′ og 40 % ved slutt for den som har spilt alt. */
function staminaOf(fatigue: number): number {
  return Math.round(Math.max(0, 100 - fatigue * 6));
}

function staminaTone(stamina: number): string {
  if (stamina >= 85) return "bg-success";
  if (stamina >= 65) return "bg-yellow-400";
  return "bg-danger";
}

function reasonText(suggestion: SubstitutionSuggestion, t: Dictionary): string {
  const reasons = t.match.subs.reasons;
  switch (suggestion.reason) {
    case "booked": return reasons.booked;
    case "stronger": return reasons.stronger(suggestion.in.overall - suggestion.out.overall);
    case "fresh": return reasons.fresh;
    case "samePosition": return reasons.samePosition;
  }
}

function GainBadge({ gain }: { gain: number }) {
  const rounded = Math.round(gain);
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${rounded > 0 ? "bg-success/20 text-success" : rounded < 0 ? "bg-danger/15 text-danger" : "bg-surface-raised text-muted"}`}>
      {rounded > 0 ? `+${rounded}` : rounded}
    </span>
  );
}

function StarterChip({ member, disabled, onPick }: { member: SquadMember; disabled: boolean; onPick: () => void }) {
  const stamina = staminaOf(member.fatigueNow);
  const effective = Math.round(member.player.overall - member.fatigueNow);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="grid min-w-0 gap-1 rounded-lg border border-border bg-surface p-1.5 text-left transition hover:border-accent/60 active:scale-95 disabled:opacity-60"
    >
      <span className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-black text-muted">{member.player.position}</span>
        <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums">
          {member.booked ? <span className="inline-block h-2.5 w-2 rounded-[1px] bg-yellow-400" /> : null}
          {effective < member.player.overall ? (
            <>
              <span className="text-muted line-through decoration-1">{member.player.overall}</span>
              <span className="text-danger">{effective}</span>
            </>
          ) : (
            <span>{member.player.overall}</span>
          )}
        </span>
      </span>
      <span className="truncate text-xs font-semibold">{shortName(member.player.name)}</span>
      <span className="h-1 overflow-hidden rounded-full bg-black/20" aria-label={`${stamina}%`}>
        <span className={`block h-full rounded-full ${staminaTone(stamina)}`} style={{ width: `${stamina}%` }} />
      </span>
    </button>
  );
}

/**
 * Byttevinduet på 70′. Kjappe bytter med ett trykk øverst, eller trykk på en sliten spiller og så
 * på den som skal inn. «Ferdig» hopper over resten av vinduet.
 */
export function SubWindowPanel({ matchId, events, side, remainingMs }: { matchId: string; events: unknown; side: MatchSide; remainingMs: number }) {
  const t = useT();
  const [subState, subAction, substituting] = useActionState(makeManagerSubstitutionAction, initial);
  const [finishState, finishAction, finishing] = useActionState(finishSubWindowAction, initial);
  const [selectedOut, setSelectedOut] = useState<string | null>(null);

  const squad = useMemo(() => squadAtSubWindow(events, side), [events, side]);
  const suggestions = useMemo(() => suggestSubstitutions(events, side), [events, side]);
  const ready = useMemo(() => subReadySides(events).includes(side), [events, side]);
  if (!squad) return null;

  const left = Math.max(0, MAX_SUBSTITUTIONS - squad.used);
  const busy = substituting || finishing;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const outgoing = selectedOut ? squad.starters.find((member) => member.player.id === selectedOut) ?? null : null;
  // De som passer på plassen først, og innenfor dem de som hjelper mest.
  const options = outgoing
    ? squad.bench
        .map((player) => ({ player, gain: substitutionGain(outgoing, player), fits: canReplace(outgoing.player, player) }))
        .sort((first, second) => Number(second.fits) - Number(first.fits) || second.gain - first.gain)
    : [];

  const substitute = (outId: string, inId: string) => {
    const data = new FormData();
    data.set("match_id", matchId);
    data.set("out_id", outId);
    data.set("in_id", inId);
    setSelectedOut(null);
    // Kalles fra et klikk, ikke et skjema, så den må pakkes i en transition selv.
    startTransition(() => subAction(data));
  };
  const finish = () => {
    const data = new FormData();
    data.set("match_id", matchId);
    startTransition(() => finishAction(data));
  };

  return (
    <section className="event-pop grid grid-cols-1 gap-3 overflow-hidden rounded-xl border border-accent bg-accent-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-accent">{t.match.subs.title}</p>
          <p className="mt-0.5 text-sm font-semibold">{left ? t.match.subs.left(left) : t.match.subs.allUsed}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: MAX_SUBSTITUTIONS }, (_, index) => (
              <span key={index} className={`grid h-6 w-6 place-items-center rounded-full border text-xs font-black ${index < squad.used ? "border-accent bg-accent text-white" : "border-accent/50 text-accent/60"}`}>⇄</span>
            ))}
          </span>
          <span className="min-w-10 text-right text-2xl font-black tabular-nums">{seconds}</span>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-black/15">
        <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${Math.min(100, (remainingMs / SUB_WINDOW_MAX_MS) * 100)}%` }} />
      </div>

      {ready ? (
        <p className="py-2 text-center text-sm font-semibold text-muted">{t.match.subs.waiting}</p>
      ) : outgoing ? (
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">{t.match.subs.pickIn(shortName(outgoing.player.name))}</p>
            <button type="button" onClick={() => setSelectedOut(null)} className="text-xs font-bold text-accent">{t.match.subs.cancel}</button>
          </div>
          {options.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map(({ player, gain, fits }) => (
                <button
                  key={player.id}
                  type="button"
                  disabled={busy}
                  onClick={() => substitute(outgoing.player.id, player.id)}
                  className={`grid min-w-0 gap-1 rounded-lg border p-2 text-left transition active:scale-95 disabled:opacity-60 ${fits ? "border-success/60 bg-surface hover:bg-success/10" : "border-border bg-surface/70 hover:border-accent/60"}`}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-muted">{player.position} · {player.overall}</span>
                    <GainBadge gain={gain} />
                  </span>
                  <span className="truncate text-sm font-semibold">{shortName(player.name)}</span>
                  <span className="text-[10px] font-bold text-success">{t.match.subs.fresh}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">{t.match.subs.benchEmpty}</p>
          )}
        </div>
      ) : left ? (
        <div className="grid grid-cols-1 gap-3">
          <p className="text-xs text-muted">{t.match.subs.hint}</p>
          {suggestions.length ? (
            <div className="grid grid-cols-1 gap-1.5">
              <p className="text-[10px] font-bold tracking-[.16em] text-muted">{t.match.subs.suggestions.toUpperCase()}</p>
              {suggestions.map((suggestion) => (
                <SuggestionRow key={`${suggestion.outId}-${suggestion.inId}`} suggestion={suggestion} disabled={busy} onSwap={() => substitute(suggestion.outId, suggestion.inId)} t={t} />
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-1.5">
            <p className="text-[10px] font-bold tracking-[.16em] text-muted">{t.match.subs.pickOut.toUpperCase()}</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {squad.starters.map((member) => (
                <StarterChip key={member.player.id} member={member} disabled={busy || !squad.bench.length} onPick={() => setSelectedOut(member.player.id)} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {ready ? null : (
        <button type="button" onClick={finish} disabled={busy} className={buttonClass}>
          {squad.used ? t.match.subs.done : t.match.subs.skip} ▶
        </button>
      )}
      {subState.error || finishState.error ? <p className="text-center text-sm text-danger">{subState.error ?? finishState.error}</p> : null}
    </section>
  );
}

function SuggestionRow({ suggestion, disabled, onSwap, t }: { suggestion: SubstitutionSuggestion; disabled: boolean; onSwap: () => void; t: Dictionary }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSwap}
      className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface p-2 text-left transition hover:border-accent active:scale-[.98] disabled:opacity-60"
    >
      <PlayerSwap incoming={suggestion.in} outgoing={suggestion.out} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm"><b>{shortName(suggestion.in.name)}</b> <span className="text-muted">{t.match.subs.inFor(shortName(suggestion.out.name))}</span></span>
        <span className="block truncate text-xs text-muted">{reasonText(suggestion, t)}</span>
      </span>
      <GainBadge gain={suggestion.gain} />
      <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-black text-white">{t.match.subs.swap}</span>
    </button>
  );
}

function PlayerSwap({ incoming, outgoing }: { incoming: ManagerPlayerSnapshot; outgoing: ManagerPlayerSnapshot }) {
  return (
    <span className="grid shrink-0 grid-cols-[auto_auto] items-center gap-x-1 text-[10px] font-black leading-tight tabular-nums">
      <span className="text-success">▲</span><span>{incoming.position} {incoming.overall}</span>
      <span className="text-danger">▼</span><span className="text-muted">{outgoing.position} {outgoing.overall}</span>
    </span>
  );
}
