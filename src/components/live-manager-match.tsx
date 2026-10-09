"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { chooseShotCellAction, completeManagerMatchAction, resolveShotAction } from "@/lib/career-actions";
import { clubCrest } from "@/lib/club-crests";
import { playerPhoto } from "@/lib/player-photos";
import {
  shotGoalChance,
  EXTRA_TIME_END,
  getManagerKickoff,
  getManagerMatchReport,
  getManagerShots,
  getShootout,
  getManagerTimeline,
  keeperIsManager,
  keeperZone,
  KICK_REVEAL_AFTER_MS,
  matchClock,
  matchExtension,
  plannedDurationMs,
  playersById,
  scoreAtMinute,
  shootingOf,
  shootoutScore,
  shotKeeperRating,
  SHOT_CHOICE_MS,
  SHOT_COLUMNS,
  SHOT_CELLS,
  shotMinutesOf,
  subWindowMs,
  type ManagerPlayerSnapshot,
  type MatchSide,
  type ShootoutKick,
  type ShotResult,
  type TimelineEvent,
  type TimelineShot,
} from "@/lib/manager-match";
import type { Dictionary } from "@/i18n/dictionaries";
import { useT } from "@/i18n/client";
import { SubWindowPanel } from "./sub-window-panel";
import { buttonClass, cardClass } from "./ui";
import { useScrollLock } from "./use-scroll-lock";

const initial: ActionState = {};

export type ManagerSideInfo = { userId: string; username: string; clubName: string };
type ManagerMatch = {
  id: string;
  status: string;
  started_at: string | null;
  home_score: number;
  away_score: number;
  events: unknown;
  home: ManagerSideInfo;
  away: ManagerSideInfo;
  serverNow: number;
  shots: ShotResult[];
  /** Hvor du sendes når kampen er ferdig. */
  returnPath: string;
};

/**
 * Kolonnen i hendelseslista er smal, så lange fulle navn brekkes midt i ordet.
 * Etternavnet alene er både penere og det man kjenner spilleren på – «Mbappé», ikke «Kylian Mbappé».
 * Korte navn og Academy-kortene («Academy CB») beholdes som de er.
 */
function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex < 0) return trimmed;
  const surname = trimmed.slice(spaceIndex + 1);
  return surname.length >= 3 ? surname : trimmed;
}

/** Et lite spillerkort i samme stil som kortene i spillermarkedet. */
function EventPlayerCard({ player, large = false }: { player: ManagerPlayerSnapshot | undefined; large?: boolean }) {
  const t = useT();
  const accent = player?.accent ?? "#35d06a";
  const photo = player?.slug ? playerPhoto(player.slug) : null;
  const crest = player?.club ? clubCrest(player.club) : null;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-white/20 text-white shadow-lg ${large ? "h-32 w-24" : "h-[4.75rem] w-14 sm:h-[6.5rem] sm:w-20"}`}
      style={{ background: `radial-gradient(circle at 88% 8%, ${accent}99 0, transparent 34%), linear-gradient(145deg, #08150e 0%, #102b1a 55%, #06110a 100%)` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_22%,rgba(255,255,255,.1)_46%,transparent_60%)]" />
      {photo ? (
        <Image src={photo} alt="" width={128} height={128} className={`absolute bottom-3 left-1/2 -translate-x-1/2 object-contain object-bottom ${large ? "h-24 w-24" : "h-12 w-12 sm:h-16 sm:w-16"}`} />
      ) : (
        <div className={`absolute bottom-4 left-1/2 grid -translate-x-1/2 place-items-center rounded-full border border-white/30 bg-black/25 ${large ? "h-16 w-16 text-2xl" : "h-10 w-10 text-base"}`}>⚽</div>
      )}
      <div className={`absolute left-1 top-1 grid justify-items-center ${large ? "w-8" : "w-5 sm:w-6"}`}>
        <b className={`font-black leading-none ${large ? "text-2xl" : "text-base sm:text-lg"}`}>{player?.overall ?? "–"}</b>
        <span className={`font-black leading-tight ${large ? "text-[11px]" : "text-[8px] sm:text-[9px]"}`}>{player?.position ?? ""}</span>
        {crest ? (
          <span className={`mt-0.5 grid place-items-center overflow-hidden rounded-full bg-white/95 ${large ? "h-6 w-6" : "h-4 w-4"}`}>
            <Image src={crest} alt="" width={24} height={24} className={large ? "h-5 w-5 object-contain" : "h-3 w-3 object-contain"} />
          </span>
        ) : null}
      </div>
      <p className={`absolute inset-x-0 bottom-0 truncate border-t border-white/25 bg-black/45 px-1 py-0.5 text-center font-bold uppercase tracking-wide ${large ? "text-[11px]" : "text-[8px] sm:text-[9px]"}`}>
        {player ? shortName(player.name) : t.match.player}
      </p>
    </div>
  );
}

function phaseText(phase: string, seconds: number, t: Dictionary): string {
  const knockout = t.match.knockout.phase;
  switch (phase) {
    case "halftime": return t.match.phase.halftime(seconds);
    case "substitutions": return t.match.phase.subWindow(seconds);
    case "first_half": return t.match.phase.firstHalf;
    case "second_half": return t.match.phase.secondHalf;
    case "extra_break": return knockout.extraBreak(seconds);
    case "extra_first": return knockout.extraFirst;
    case "extra_halftime": return knockout.extraHalftime(seconds);
    case "extra_second": return knockout.extraSecond;
    case "shootout_break": return knockout.shootoutBreak(seconds);
    case "shootout": return t.match.knockout.status.shootout;
    default: return t.match.phase.fullTime;
  }
}

/**
 * Straffekonkurransen som to rader med prikker, hjemmelaget over og bortelaget under, og sparket
 * som tas akkurat nå under dem. Den er ferdig simulert – man ser bare på at den spilles av.
 */
function ShootoutPanel({ kicks, revealed, pending, players, home, away, finished, countdown }: { kicks: ShootoutKick[]; revealed: ShootoutKick[]; pending: ShootoutKick | null; players: Map<string, ManagerPlayerSnapshot>; home: string; away: string; finished: boolean; countdown: number | null }) {
  const t = useT();
  const copy = t.match.knockout.shootout;
  const score = shootoutScore(revealed);
  const latest = pending ?? revealed[revealed.length - 1] ?? null;
  const rounds = Math.max(5, ...kicks.slice(0, revealed.length + (pending ? 1 : 0)).map((kick) => kick.round));
  const winner = finished ? (score.home > score.away ? home : away) : null;
  const row = (side: MatchSide, name: string) => (
    <div className="grid grid-cols-[minmax(0,6rem)_1fr_auto] items-center gap-2">
      <b className="truncate text-left text-sm">{name}</b>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: rounds }, (_, index) => {
          const kick = revealed.find((entry) => entry.side === side && entry.round === index + 1);
          const current = pending?.side === side && pending.round === index + 1;
          return (
            <span
              key={index}
              className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${kick ? (kick.scored ? "border-success bg-success/80 text-white" : "border-danger bg-danger/80 text-white") : current ? "animate-pulse border-accent" : "border-border"}`}
            >
              {kick ? (kick.scored ? "✓" : "✕") : ""}
            </span>
          );
        })}
      </div>
      <b className="text-lg tabular-nums">{score[side]}</b>
    </div>
  );
  return (
    <section className="grid gap-3 rounded-xl border border-accent bg-accent-soft p-4 text-center">
      <p className="text-xs font-bold tracking-[.2em] text-accent">{copy.title}</p>
      {row("home", home)}
      {row("away", away)}
      {countdown !== null ? null : latest ? (
        <div className={`flex items-center justify-center gap-3 ${pending ? "" : "event-pop"}`} key={`${latest.order}-${pending ? "up" : "done"}`}>
          <EventPlayerCard player={players.get(latest.takerId)} />
          <div className="text-left">
            <p className="text-sm font-bold">{pending ? copy.stepsUp(shortName(latest.taker)) : shortName(latest.taker)}</p>
            {pending ? null : <p className={`text-xs font-black tracking-[.16em] ${latest.scored ? "text-success" : "text-danger"}`}>{latest.scored ? copy.scored : copy.saved}</p>}
          </div>
        </div>
      ) : null}
      {winner ? <p className="text-sm font-bold">{copy.wonOnPenalties(winner)}</p> : null}
    </section>
  );
}

function CardIcon({ card }: { card: "yellow" | "red" }) {
  return <span className={`inline-block h-4 w-3 rounded-[2px] align-middle ${card === "yellow" ? "bg-yellow-400" : "bg-red-500"}`} />;
}

type EventCopy = { title: string; detail: string; playerId: string | undefined; playerName: string; icon: React.ReactNode; tone: string };

function describeEvent(event: TimelineEvent, names: Map<string, ManagerPlayerSnapshot>, shots: ShotResult[], t: Dictionary): EventCopy {
  const copy = t.match.events;
  switch (event.type) {
    case "goal":
      return { title: copy.goal, detail: event.assist ? copy.assist(shortName(event.assist)) : copy.soloGoal, playerId: event.scorerId, playerName: shortName(event.scorer), icon: <span>⚽</span>, tone: "border-success/60 bg-success/10" };
    case "card":
      return {
        title: event.card === "yellow" ? copy.yellowCard : copy.redCard,
        detail: event.card === "yellow" ? copy.yellowDetail : copy.redDetail,
        playerId: event.playerId,
        playerName: shortName(event.player),
        icon: <CardIcon card={event.card} />,
        tone: event.card === "yellow" ? "border-yellow-400/50 bg-yellow-400/10" : "border-danger/60 bg-danger/10",
      };
    case "chance":
      return {
        title: event.outcome === "post" ? copy.post : copy.save,
        detail: event.outcome === "post" ? copy.postDetail : event.keeper ? copy.savedBy(shortName(event.keeper)) : copy.keeperGotHand,
        playerId: event.playerId,
        playerName: shortName(event.player),
        icon: <span>{event.outcome === "post" ? "🎯" : "🧤"}</span>,
        tone: "border-border bg-surface-raised",
      };
    case "shot": {
      const result = shots.find((shot) => shot.minute === event.minute);
      const label = event.kind === "penalty" ? copy.penalty : copy.bigChance;
      const scored = result?.outcome === "goal";
      return {
        title: scored ? copy.shotGoal(label) : result?.outcome === "saved" ? copy.shotSaved(label) : copy.shotMissed(label),
        detail: scored ? copy.scoredDetail : result?.outcome === "saved" ? (event.kind === "penalty" ? copy.penaltySavedDetail : copy.savedDetail) : copy.missedDetail,
        playerId: event.takerId,
        playerName: shortName(event.taker),
        icon: <span>{scored ? "⚽" : result?.outcome === "saved" ? "🧤" : "❌"}</span>,
        tone: scored ? "border-success/60 bg-success/10" : "border-danger/50 bg-danger/10",
      };
    }
    case "substitution": {
      const out = names.get(event.outId)?.name;
      return { title: copy.substitution, detail: copy.playerOff(out ? shortName(out) : t.match.player), playerId: event.inId, playerName: shortName(names.get(event.inId)?.name ?? t.match.player), icon: <span>⇄</span>, tone: "border-border bg-surface-raised" };
    }
  }
}

/**
 * Hjemmelaget til venstre, bortelaget til høyre, med minuttet i en fast midtkolonne.
 * Spillerkortet står innerst mot midten og teksten ytterst, som i forbildet.
 */
function EventRow({ event, players, shots, latest }: { event: TimelineEvent; players: Map<string, ManagerPlayerSnapshot>; shots: ShotResult[]; latest: boolean }) {
  const t = useT();
  const copy = describeEvent(event, players, shots, t);
  const player = copy.playerId ? players.get(copy.playerId) : undefined;
  const home = event.side === "home";
  const content = (
    <div className={`flex min-w-0 items-center gap-2 ${home ? "" : "flex-row-reverse"}`}>
      <div className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 ${copy.tone} ${home ? "text-right" : "text-left"}`}>
        <b className="block break-words text-[11px] font-black uppercase leading-tight sm:text-sm">{copy.playerName}</b>
        <div className={`mt-1 flex items-center gap-1.5 ${home ? "flex-row-reverse" : ""}`}>
          <span className="shrink-0 leading-none">{copy.icon}</span>
          <p className="whitespace-nowrap text-[10px] font-bold tracking-[.06em] text-muted">{copy.title}</p>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">{copy.detail}</p>
      </div>
      <EventPlayerCard player={player} />
    </div>
  );
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)] items-center gap-1 ${latest ? "event-pop" : ""}`}>
      {home ? content : <span />}
      <span className="text-center text-sm font-black tabular-nums text-muted">{event.minute}′</span>
      {home ? <span /> : content}
    </li>
  );
}

/** Målstripa over hendelsene, med hjemmelagets mål over streken og bortelagets under. */
function GoalStrip({ goals, minute, lastMinute }: { goals: { minute: number; side: MatchSide }[]; minute: number; lastMinute: number }) {
  return (
    <div className="relative h-12 px-2">
      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div className="absolute left-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/60 transition-[width] duration-1000" style={{ width: `calc(${Math.min(100, (minute / lastMinute) * 100)}% - 0.5rem)` }} />
      {goals.map((goal, index) => (
        <span
          key={`${goal.minute}-${goal.side}-${index}`}
          className={`absolute -translate-x-1/2 text-xs ${goal.side === "home" ? "top-0" : "bottom-0"}`}
          style={{ left: `${Math.min(98, Math.max(2, (goal.minute / lastMinute) * 100))}%` }}
          title={`${goal.minute}′`}
        >
          ⚽
        </span>
      ))}
    </div>
  );
}

function SideName({ side, you }: { side: ManagerSideInfo; you: boolean }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <b className="block truncate text-lg leading-tight">{side.username}</b>
      {side.clubName ? <p className="truncate text-xs text-muted">{side.clubName}</p> : null}
      {you ? <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">{t.match.you}</span> : null}
    </div>
  );
}

/**
 * Målet sett forfra, delt i tolv ruter. De grønne er plasseringene skytteren er god nok til å
 * sikte på – en svak avslutter får bare de trygge midtrutene, en god også krysset.
 * Keeperen dekker flere ruter jo bedre han er, så valget og det han dekker vises som en hel sone.
 */
function GoalGrid({
  options,
  chanceFor,
  myCells,
  otherCells,
  otherLabel,
  previewZone,
  disabled,
  onPick,
}: {
  options: number[];
  chanceFor: ((cell: number) => number) | null;
  myCells: number[];
  otherCells: number[];
  otherLabel: string | null;
  /** Rutene et valg ville dekket, vist mens man holder over en rute. */
  previewZone: ((cell: number) => number[]) | null;
  disabled: boolean;
  onPick: (cell: number) => void;
}) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = !disabled && previewZone && hovered !== null ? previewZone(hovered) : [];
  return (
    <div className="rounded-xl border-4 border-white/70 bg-black/40 p-1.5" onMouseLeave={() => setHovered(null)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SHOT_COLUMNS}, minmax(0, 1fr))` }}>
        {Array.from({ length: SHOT_CELLS }, (_, cell) => {
          const available = options.includes(cell);
          const mine = myCells.includes(cell) || preview.includes(cell);
          const theirs = otherCells.includes(cell);
          return (
            <button
              key={cell}
              type="button"
              disabled={disabled || !available}
              onMouseEnter={() => setHovered(cell)}
              onClick={() => onPick(cell)}
              aria-label={available ? t.match.grid.aim(cell + 1) : t.match.grid.outOfReach(cell + 1)}
              className={`relative grid h-14 place-items-center gap-0.5 rounded border transition sm:h-16 ${
                mine ? "border-success bg-success/40 ring-2 ring-success" : theirs ? "border-accent bg-accent/30 ring-2 ring-accent" : available ? "border-success/40 bg-success/10 hover:bg-success/25" : "border-danger/40 bg-danger/10"
              } ${disabled || !available ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`h-3 w-3 rounded-full ${mine ? "bg-success" : theirs ? "bg-accent" : available ? "bg-success/70" : "bg-danger/70"}`} />
              {theirs && otherLabel ? (
                <span className="text-[9px] font-bold leading-none text-accent">{otherLabel}</span>
              ) : myCells.includes(cell) ? (
                <span className="text-[9px] font-bold leading-none text-success">{t.match.grid.yours}</span>
              ) : chanceFor && available ? (
                <span className="text-[10px] font-bold leading-none text-white/75">{Math.round(chanceFor(cell) * 100)}%</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LiveManagerMatch({ match, userId, returnAfterComplete = true, header }: { match: ManagerMatch; userId: string; returnAfterComplete?: boolean; header?: ReactNode }) {
  const t = useT();
  // Kampen fyller skjermen og står stille, som pakkeåpningen. Bare hendelseslista ruller.
  useScrollLock();
  const router = useRouter();
  const finishFormRef = useRef<HTMLFormElement>(null);
  const resolveFormRef = useRef<HTMLFormElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const resolvedShot = useRef<number | null>(null);
  // Klokka forankres i serverens tid. Uten dette ville en nettleser som går noen sekunder feil
  // vist et annet kampminutt enn motstanderen sin.
  const [serverOffset] = useState(() => match.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now() + (match.serverNow - Date.now()));
  const [state, finishAction] = useActionState(completeManagerMatchAction, initial);
  const [shotState, shotAction, picking] = useActionState(chooseShotCellAction, initial);
  const [, resolveAction] = useActionState(resolveShotAction, initial);

  const complete = match.status === "completed";
  const events = match.events;
  const kickoff = getManagerKickoff(events);
  const players = useMemo(() => playersById(events), [events]);
  const timeline = useMemo(() => getManagerTimeline(events), [events]);
  const shotEvents = useMemo(() => getManagerShots(events), [events]);
  const shotMinutes = useMemo(() => shotMinutesOf(events), [events]);
  // Ekstraomganger og straffer finnes bare i utslagskamper som står likt, så det avgjøres av stillingen.
  const extension = useMemo(() => matchExtension(events, match.shots), [events, match.shots]);
  const shootout = useMemo(() => getShootout(events).slice(0, extension.kicks), [events, extension.kicks]);
  const lastMinute = extension.extraTime ? EXTRA_TIME_END : 90;

  const elapsed = match.started_at ? Math.max(0, now - new Date(match.started_at).getTime()) : 0;
  const windowMs = useMemo(() => subWindowMs(events), [events]);
  const clock = matchClock(elapsed, shotMinutes, extension, windowMs);
  const fullTime = elapsed >= plannedDurationMs(shotMinutes, extension, windowMs);
  const shownMinute = complete ? lastMinute : clock.minute;
  // Målstripa strekkes til 120′ først når ekstraomgangene starter, ellers ville den avslørt at det ender likt.
  const stripMinutes = complete || clock.phase === "extra_break" || shownMinute > 90 ? lastMinute : 90;
  // Sparkene vises ett og ett: først tilløpet, så utfallet. Etter kampen vises hele konkurransen.
  const kicksDone = complete || clock.phase === "full_time" ? shootout.length : clock.phase === "shootout" ? clock.kickIndex + (clock.kickElapsedMs >= KICK_REVEAL_AFTER_MS ? 1 : 0) : 0;
  const revealedKicks = shootout.slice(0, kicksDone);
  const pendingKick = clock.phase === "shootout" && !complete && clock.kickElapsedMs < KICK_REVEAL_AFTER_MS ? shootout[clock.kickIndex] ?? null : null;
  const penalties = shootoutScore(revealedKicks);
  const showShootout = shootout.length > 0 && (complete || clock.phase === "shootout_break" || clock.phase === "shootout" || clock.phase === "full_time");

  const activeShot: TimelineShot | null = clock.phase === "shot" && clock.shotMinute !== null ? shotEvents.find((shot) => shot.minute === clock.shotMinute) ?? null : null;
  const activeResult = activeShot ? match.shots.find((shot) => shot.minute === activeShot.minute) ?? null : null;
  const choosingWindow = Boolean(activeShot) && clock.shotElapsedMs < SHOT_CHOICE_MS;
  const subWindowOpen = clock.phase === "substitutions" && !complete;

  useEffect(() => {
    // Under et straffespark teller sekundene, så da må klokka og serveren følges tettere.
    const interval = setInterval(() => setNow(Date.now() + serverOffset), 200);
    return () => clearInterval(interval);
  }, [serverOffset]);
  useEffect(() => {
    if (match.status !== "live") return;
    // I byttevinduet følges motstanderen tettere, så kampen går videre straks begge er ferdige.
    const refresh = setInterval(() => router.refresh(), activeShot ? 800 : subWindowOpen ? 1500 : 3000);
    return () => clearInterval(refresh);
  }, [match.status, router, activeShot, subWindowOpen]);

  const visible = timeline.filter((event) => {
    if (event.minute > shownMinute) return false;
    // En sjanse dukker opp i lista først når den er avgjort – mens den pågår vises den som overlegg.
    if (event.type === "shot") return Boolean(match.shots.find((shot) => shot.minute === event.minute)?.outcome);
    return true;
  });
  const score = complete ? { home: match.home_score, away: match.away_score } : scoreAtMinute(events, match.shots, shownMinute);
  const goalMarkers = [
    ...timeline.filter((event): event is Extract<TimelineEvent, { type: "goal" }> => event.type === "goal" && event.minute <= shownMinute),
    ...match.shots.filter((shot) => shot.outcome === "goal" && shot.minute <= shownMinute),
  ].map((entry) => ({ minute: entry.minute, side: entry.side }));

  const userSide: MatchSide | null = kickoff?.home.userId === userId ? "home" : kickoff?.away.userId === userId ? "away" : match.home.userId === userId ? "home" : match.away.userId === userId ? "away" : null;
  const opponentSide: MatchSide | null = userSide === "home" ? "away" : userSide === "away" ? "home" : null;
  const report = getManagerMatchReport(match.id, events, match.shots, shownMinute);
  const yourReport = report && userSide ? report[userSide] : null;
  const opponentReport = report && opponentSide ? report[opponentSide] : null;

  const seconds = Math.max(0, Math.ceil(clock.remainingMs / 1000));
  const statusLabel = complete
    ? t.match.status.fullTime
    : match.status === "live"
      ? clock.phase === "halftime"
        ? t.match.status.halftime
        : clock.phase === "substitutions"
          ? t.match.status.subWindow
          : clock.phase === "shot"
            ? t.match.status.shot(activeShot?.kind === "penalty" ? t.match.status.penalty : t.match.status.bigChance, clock.minute)
            : clock.phase === "extra_break"
              ? t.match.knockout.status.extraTime
              : clock.phase === "extra_halftime"
                ? t.match.knockout.status.extraHalftime
                : clock.phase === "shootout_break" || clock.phase === "shootout"
                  ? t.match.knockout.status.shootout
                  : t.match.status.live(clock.minute)
      : t.match.status.lobby;

  // Prøv igjen hvert tredje sekund til serveren har avsluttet kampen. Ett enkelt forsøk ble
  // stående fast hvis serverens klokke eller varighet ikke helt stemte med vår.
  useEffect(() => {
    if (match.status !== "live" || !fullTime) return;
    finishFormRef.current?.requestSubmit();
    const retry = setInterval(() => finishFormRef.current?.requestSubmit(), 3_000);
    return () => clearInterval(retry);
  }, [fullTime, match.status]);

  // Når velgetiden er ute avgjøres sjansen. Begge klientene prøver; serveren tar bare imot én gang.
  useEffect(() => {
    if (!activeShot || choosingWindow || activeResult?.outcome || match.status !== "live") return;
    if (resolvedShot.current === activeShot.minute) return;
    resolvedShot.current = activeShot.minute;
    resolveFormRef.current?.requestSubmit();
  }, [activeShot, choosingWindow, activeResult?.outcome, match.status]);

  useEffect(() => {
    if (!complete || !returnAfterComplete) return;
    const timer = setTimeout(() => router.replace(match.returnPath), 3_000);
    return () => clearTimeout(timer);
  }, [complete, returnAfterComplete, router, match.returnPath]);

  // Feeden holder seg nederst mens kampen går. Dette kjøres etter hver render, ikke bare når
  // en hendelse kommer, fordi lista også vokser når spillerbildene lastes ferdig etterpå.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || complete || !pinnedToBottom.current) return;
    feed.scrollTop = feed.scrollHeight;
  });

  // Bare en rulling oppover slipper taket. Sjekker man i stedet «er vi nederst?», vil vår egen
  // rulling til bunnen bli lest som at brukeren har bladd bort idet lista vokser rett etterpå.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let lastTop = feed.scrollTop;
    const onScroll = () => {
      if (feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60) pinnedToBottom.current = true;
      else if (feed.scrollTop < lastTop - 8) pinnedToBottom.current = false;
      lastTop = feed.scrollTop;
    };
    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, []);

  const taker = activeShot ? players.get(activeShot.takerId) : undefined;
  const iAmShooting = Boolean(activeShot && activeShot.side === userSide);
  const iAmKeeping = Boolean(activeShot && activeShot.kind === "penalty" && activeShot.side !== userSide);
  const myCell = iAmShooting ? activeResult?.shooterCell ?? null : iAmKeeping ? activeResult?.keeperCell ?? null : null;
  const revealCell = choosingWindow ? null : iAmShooting ? activeResult?.keeperCell ?? null : activeResult?.shooterCell ?? null;
  const shotKeeper = activeShot?.keeperId ? players.get(activeShot.keeperId) : undefined;
  const keeperRating = activeShot ? shotKeeperRating(activeShot, players) : null;
  // Mot en venn er straffen ren gjettelek; mot AI står den faktiske sjansen på ruta.
  const guessing = Boolean(activeShot && kickoff && keeperIsManager(kickoff, activeShot));
  const myCells = myCell === null ? [] : iAmKeeping && activeShot ? keeperZone(activeShot, myCell) : [myCell];
  const otherCells = iAmShooting && activeShot ? keeperZone(activeShot, revealCell) : revealCell === null ? [] : [revealCell];
  const keeperLine = !activeShot || keeperRating === null
    ? null
    : iAmKeeping
      ? t.match.shot.youCover(1)
      : `${t.match.shot.keeperLine(shotKeeper ? t.match.shot.keeperNamed(shortName(shotKeeper.name), keeperRating) : t.match.shot.noKeeper)}${guessing ? t.match.shot.covers(1) : ""}`;
  const shotSeconds = activeShot ? Math.max(0, Math.ceil((SHOT_CHOICE_MS - clock.shotElapsedMs) / 1000)) : 0;

  return (
    <section className="match-stage">
      <div className="match-stage__column">
      {header ? <div className="grid gap-3">{header}</div> : null}
      <div className={`${cardClass} grid gap-3 p-4`}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[.2em] text-muted">
          <span>{statusLabel}</span>
          {kickoff ? <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] text-accent">{t.match.xiLocked}</span> : null}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <SideName side={match.home} you={userSide === "home"} />
          <div className="rounded-xl bg-surface-raised px-5 py-3 text-center text-4xl font-black tabular-nums">
            {score.home} <span className="text-muted">–</span> {score.away}
          </div>
          <div className="flex justify-end text-right">
            <SideName side={match.away} you={userSide === "away"} />
          </div>
        </div>

        <GoalStrip goals={goalMarkers} minute={shownMinute} lastMinute={stripMinutes} />
        {match.status === "live" && clock.phase !== "shot" ? (
          <p className="text-center text-sm font-semibold">
            {phaseText(clock.phase, seconds, t)}
          </p>
        ) : null}
        {extension.extraTime && (complete || clock.phase === "full_time" || clock.phase === "shootout_break" || clock.phase === "shootout") ? (
          <p className="text-center text-xs font-bold tracking-[.16em] text-muted">
            {t.match.knockout.shootout.afterExtraTime}
            {showShootout && revealedKicks.length ? ` · ${t.match.knockout.shootout.result(penalties.home, penalties.away)}` : ""}
          </p>
        ) : null}
      </div>

      {activeShot ? (
        <section className="grid gap-3 rounded-xl border border-accent bg-accent-soft p-4 text-center">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-accent">{activeShot.kind === "penalty" ? t.match.shot.penaltyTitle : t.match.shot.bigChanceTitle} · {activeShot.minute}′</p>
            <h2 className="mt-1 text-xl font-bold">
              {iAmShooting ? t.match.shot.youShoot(shortName(activeShot.taker)) : iAmKeeping ? t.match.shot.penaltyAgainstYou(shortName(activeShot.taker)) : t.match.shot.bigChanceFor((activeShot.side === "home" ? match.home : match.away).username)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {choosingWindow
                ? iAmShooting
                  ? t.match.shot.chooseAim(shotSeconds)
                  : iAmKeeping
                    ? t.match.shot.chooseDive(shotSeconds)
                    : t.match.shot.watchOnly
                : activeResult?.outcome === "goal"
                  ? t.match.shot.goal
                  : activeResult?.outcome === "saved"
                    ? t.match.shot.saved
                    : activeResult?.outcome === "missed"
                      ? t.match.shot.missed
                      : t.match.shot.deciding}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <EventPlayerCard player={taker} large />
            <div className="grid min-w-0 flex-1 gap-2">
              <GoalGrid
                options={activeShot.options}
                chanceFor={iAmShooting && taker ? (cell) => shotGoalChance(activeShot, shootingOf(taker), cell, keeperRating, guessing) : null}
                myCells={myCells}
                otherCells={otherCells}
                otherLabel={iAmShooting ? t.match.grid.keeper : t.match.grid.shot}
                previewZone={iAmKeeping && myCell === null ? (cell) => keeperZone(activeShot, cell) : null}
                disabled={!choosingWindow || picking || myCell !== null || (!iAmShooting && !iAmKeeping)}
                onPick={(cell) => {
                  const data = new FormData();
                  data.set("match_id", match.id);
                  data.set("minute", String(activeShot.minute));
                  data.set("cell", String(cell));
                  // Kalles fra et klikk, ikke et skjema, så den må pakkes i en transition selv.
                  startTransition(() => shotAction(data));
                }}
              />
              {keeperLine ? <p className="text-xs font-semibold text-muted">{keeperLine}</p> : null}
              {myCell !== null && choosingWindow ? <p className="text-xs text-muted">{iAmShooting && activeShot.kind === "penalty" ? t.match.shot.waitingForKeeper : t.match.shot.waitingForShot}</p> : null}
              {shotState.error ? <p className="text-xs text-danger">{shotState.error}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {showShootout ? (
        <ShootoutPanel
          kicks={shootout}
          revealed={revealedKicks}
          pending={pendingKick}
          players={players}
          home={match.home.username}
          away={match.away.username}
          finished={complete || clock.phase === "full_time"}
          countdown={clock.phase === "shootout_break" ? seconds : null}
        />
      ) : null}

      {clock.phase === "halftime" && report && yourReport && opponentReport ? (
        <section className="grid gap-2 rounded-xl border border-border bg-surface p-4">
          <p className="text-center text-xs font-bold tracking-[.2em] text-muted">{t.match.stats.firstHalf}</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <b>{yourReport.possession}%</b><span className="text-muted">{t.match.stats.possession}</span><b>{opponentReport.possession}%</b>
            <b>{yourReport.shots}</b><span className="text-muted">{t.match.stats.shots}</span><b>{opponentReport.shots}</b>
            <b>{yourReport.onTarget}</b><span className="text-muted">{t.match.stats.onTarget}</span><b>{opponentReport.onTarget}</b>
            <b>{yourReport.strength}</b><span className="text-muted">{t.match.stats.strength}</span><b>{opponentReport.strength}</b>
          </div>
        </section>
      ) : null}

      {subWindowOpen && userSide && kickoff && kickoff.version >= 6 ? (
        <SubWindowPanel matchId={match.id} events={events} side={userSide} remainingMs={clock.remainingMs} />
      ) : null}

      <div ref={feedRef} className="match-feed rounded-xl border border-border bg-surface p-3">
        <ul className="grid gap-3">
          {visible.map((event, index) => (
            <EventRow
              key={`${event.type}-${event.minute}-${event.side}-${index}`}
              event={event}
              players={players}
              shots={match.shots}
              latest={!complete && index === visible.length - 1}
            />
          ))}
        </ul>
        {visible.length ? null : (
          <p className="grid h-full place-items-center text-center text-sm text-muted">{match.status === "live" ? t.match.feed.noEvents : t.match.feed.notStarted}</p>
        )}
      </div>

      {match.status === "live" && fullTime ? <p className="text-center text-sm text-muted">{t.match.feed.savingAutomatically}</p> : null}
      <form ref={finishFormRef} action={finishAction} hidden><input type="hidden" name="match_id" value={match.id} /></form>
      <form ref={resolveFormRef} action={resolveAction} hidden>
        <input type="hidden" name="match_id" value={match.id} />
        <input type="hidden" name="minute" value={activeShot?.minute ?? ""} />
      </form>

      {complete && report && yourReport && opponentReport ? (
        <section className="grid gap-4 rounded-xl border border-accent bg-accent-soft p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-accent">{t.match.summary.title}</p>
              <h2 className="mt-1 text-xl font-bold">{t.match.summary.playerOfMatch(report.playerOfMatch ?? t.match.summary.playerOfMatchFallback)}</h2>
            </div>
            <p className="text-sm text-muted">{returnAfterComplete ? t.match.summary.returning : t.match.summary.savedToHistory}</p>
          </div>
          <div className="flex justify-between px-1 text-xs font-bold tracking-[.16em] text-muted">
            <span>{(userSide === "away" ? match.away : match.home).username.toUpperCase()}</span>
            <span>{(userSide === "away" ? match.home : match.away).username.toUpperCase()}</span>
          </div>
          <div className="grid overflow-hidden rounded-lg border border-border bg-surface-raised text-center sm:grid-cols-4">
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">{t.match.stats.strength.toUpperCase()}</p><p className="mt-1 text-lg font-bold">{yourReport.strength} <span className="text-muted">–</span> {opponentReport.strength}</p></div>
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">{t.match.stats.possession.toUpperCase()}</p><p className="mt-1 text-lg font-bold">{yourReport.possession}% <span className="text-muted">–</span> {opponentReport.possession}%</p></div>
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">{t.match.stats.shots.toUpperCase()}</p><p className="mt-1 text-lg font-bold">{yourReport.shots} <span className="text-muted">–</span> {opponentReport.shots}</p></div>
            <div className="p-3"><p className="text-xs text-muted">{t.match.stats.onTarget.toUpperCase()}</p><p className="mt-1 text-lg font-bold">{yourReport.onTarget} <span className="text-muted">–</span> {opponentReport.onTarget}</p></div>
          </div>
          {!returnAfterComplete ? <Link href={match.returnPath} className={buttonClass}>{t.match.summary.backButton}</Link> : null}
        </section>
      ) : null}

      {/* Mens vi venter på serveren prøves det på nytt, så da holder «lagres automatisk» over. */}
      {state.error && !(match.status === "live" && fullTime) ? <p className="text-sm text-danger">{state.error}</p> : complete ? <p className="text-sm text-success">{t.match.summary.resultSaved}</p> : null}
      </div>
    </section>
  );
}
