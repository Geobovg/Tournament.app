"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { chooseShotCellAction, completeManagerMatchAction, makeManagerSubstitutionAction, resolveShotAction } from "@/lib/career-actions";
import { clubCrest } from "@/lib/club-crests";
import { playerPhoto } from "@/lib/player-photos";
import {
  cellGoalChance,
  getManagerKickoff,
  getManagerMatchReport,
  getManagerShots,
  getManagerSubstitutions,
  getManagerTimeline,
  matchClock,
  plannedDurationMs,
  playersById,
  scoreAtMinute,
  shootingOf,
  SHOT_CHOICE_MS,
  SHOT_COLUMNS,
  SHOT_CELLS,
  shotMinutesOf,
  SUB_WINDOW_MINUTE,
  suggestSubstitutions,
  type ManagerPlayerSnapshot,
  type MatchSide,
  type ShotResult,
  type TimelineEvent,
  type TimelineShot,
} from "@/lib/manager-match";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

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
        {player ? shortName(player.name) : "Spiller"}
      </p>
    </div>
  );
}

function CardIcon({ card }: { card: "yellow" | "red" }) {
  return <span className={`inline-block h-4 w-3 rounded-[2px] align-middle ${card === "yellow" ? "bg-yellow-400" : "bg-red-500"}`} />;
}

type EventCopy = { title: string; detail: string; playerId: string | undefined; playerName: string; icon: React.ReactNode; tone: string };

function describeEvent(event: TimelineEvent, names: Map<string, ManagerPlayerSnapshot>, shots: ShotResult[]): EventCopy {
  switch (event.type) {
    case "goal":
      return { title: "MÅL", detail: event.assist ? `ASSIST ${shortName(event.assist)}` : "SOLOMÅL", playerId: event.scorerId, playerName: shortName(event.scorer), icon: <span>⚽</span>, tone: "border-success/60 bg-success/10" };
    case "card":
      return {
        title: event.card === "yellow" ? "GULT KORT" : "RØDT KORT",
        detail: event.card === "yellow" ? "Advarsel" : "Utvist – laget er én mann kort",
        playerId: event.playerId,
        playerName: shortName(event.player),
        icon: <CardIcon card={event.card} />,
        tone: event.card === "yellow" ? "border-yellow-400/50 bg-yellow-400/10" : "border-danger/60 bg-danger/10",
      };
    case "chance":
      return {
        title: event.outcome === "post" ? "I STOLPEN" : "REDNING",
        detail: event.outcome === "post" ? "Centimeter fra mål" : "Keeper fikk en hånd på den",
        playerId: event.playerId,
        playerName: shortName(event.player),
        icon: <span>{event.outcome === "post" ? "🎯" : "🧤"}</span>,
        tone: "border-border bg-surface-raised",
      };
    case "shot": {
      const result = shots.find((shot) => shot.minute === event.minute);
      const label = event.kind === "penalty" ? "STRAFFE" : "STOR SJANSE";
      const scored = result?.outcome === "goal";
      return {
        title: scored ? `${label} – MÅL` : result?.outcome === "saved" ? `${label} – REDDET` : `${label} – BOM`,
        detail: scored ? "Satt i mål" : result?.outcome === "saved" ? "Keeper gikk rett vei" : "Utenfor",
        playerId: event.takerId,
        playerName: shortName(event.taker),
        icon: <span>{scored ? "⚽" : result?.outcome === "saved" ? "🧤" : "❌"}</span>,
        tone: scored ? "border-success/60 bg-success/10" : "border-danger/50 bg-danger/10",
      };
    }
    case "substitution": {
      const out = names.get(event.outId)?.name;
      return { title: "BYTTE", detail: `${out ? shortName(out) : "Spiller"} ut`, playerId: event.inId, playerName: shortName(names.get(event.inId)?.name ?? "Spiller"), icon: <span>⇄</span>, tone: "border-border bg-surface-raised" };
    }
  }
}

/**
 * Hjemmelaget til venstre, bortelaget til høyre, med minuttet i en fast midtkolonne.
 * Spillerkortet står innerst mot midten og teksten ytterst, som i forbildet.
 */
function EventRow({ event, players, shots, latest }: { event: TimelineEvent; players: Map<string, ManagerPlayerSnapshot>; shots: ShotResult[]; latest: boolean }) {
  const copy = describeEvent(event, players, shots);
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
function GoalStrip({ goals, minute }: { goals: { minute: number; side: MatchSide }[]; minute: number }) {
  return (
    <div className="relative h-12 px-2">
      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div className="absolute left-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/60 transition-[width] duration-1000" style={{ width: `calc(${Math.min(100, (minute / 90) * 100)}% - 0.5rem)` }} />
      {goals.map((goal, index) => (
        <span
          key={`${goal.minute}-${goal.side}-${index}`}
          className={`absolute -translate-x-1/2 text-xs ${goal.side === "home" ? "top-0" : "bottom-0"}`}
          style={{ left: `${Math.min(98, Math.max(2, (goal.minute / 90) * 100))}%` }}
          title={`${goal.minute}′`}
        >
          ⚽
        </span>
      ))}
    </div>
  );
}

function SideName({ side, you }: { side: ManagerSideInfo; you: boolean }) {
  return (
    <div className="min-w-0">
      <b className="block truncate text-lg leading-tight">{side.username}</b>
      {side.clubName ? <p className="truncate text-xs text-muted">{side.clubName}</p> : null}
      {you ? <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">DEG</span> : null}
    </div>
  );
}

/**
 * Målet sett forfra, delt i tolv ruter. De grønne er plasseringene skytteren er god nok til å
 * sikte på – en svak avslutter får bare de trygge midtrutene, en god også krysset.
 */
function GoalGrid({
  options,
  chanceFor,
  myCell,
  otherCell,
  otherLabel,
  disabled,
  onPick,
}: {
  options: number[];
  chanceFor: ((cell: number) => number) | null;
  myCell: number | null;
  otherCell: number | null;
  otherLabel: string | null;
  disabled: boolean;
  onPick: (cell: number) => void;
}) {
  return (
    <div className="rounded-xl border-4 border-white/70 bg-black/40 p-1.5">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SHOT_COLUMNS}, minmax(0, 1fr))` }}>
        {Array.from({ length: SHOT_CELLS }, (_, cell) => {
          const available = options.includes(cell);
          const mine = myCell === cell;
          const theirs = otherCell === cell;
          return (
            <button
              key={cell}
              type="button"
              disabled={disabled || !available}
              onClick={() => onPick(cell)}
              aria-label={available ? `Sikt mot rute ${cell + 1}` : `Rute ${cell + 1} er utenfor rekkevidde`}
              className={`relative grid h-14 place-items-center gap-0.5 rounded border transition sm:h-16 ${
                mine ? "border-success bg-success/40 ring-2 ring-success" : theirs ? "border-accent bg-accent/30 ring-2 ring-accent" : available ? "border-success/40 bg-success/10 hover:bg-success/25" : "border-danger/40 bg-danger/10"
              } ${disabled || !available ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`h-3 w-3 rounded-full ${mine ? "bg-success" : theirs ? "bg-accent" : available ? "bg-success/70" : "bg-danger/70"}`} />
              {theirs && otherLabel ? (
                <span className="text-[9px] font-bold leading-none text-accent">{otherLabel}</span>
              ) : mine ? (
                <span className="text-[9px] font-bold leading-none text-success">DITT</span>
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

export function LiveManagerMatch({ match, userId, returnAfterComplete = true }: { match: ManagerMatch; userId: string; returnAfterComplete?: boolean }) {
  const router = useRouter();
  const finishFormRef = useRef<HTMLFormElement>(null);
  const resolveFormRef = useRef<HTMLFormElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const automaticallyFinished = useRef(false);
  const resolvedShot = useRef<number | null>(null);
  // Klokka forankres i serverens tid. Uten dette ville en nettleser som går noen sekunder feil
  // vist et annet kampminutt enn motstanderen sin.
  const [serverOffset] = useState(() => match.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now() + (match.serverNow - Date.now()));
  const [state, finishAction] = useActionState(completeManagerMatchAction, initial);
  const [substitutionState, substitutionAction, substituting] = useActionState(makeManagerSubstitutionAction, initial);
  const [shotState, shotAction, picking] = useActionState(chooseShotCellAction, initial);
  const [, resolveAction] = useActionState(resolveShotAction, initial);

  const complete = match.status === "completed";
  const events = match.events;
  const kickoff = getManagerKickoff(events);
  const players = useMemo(() => playersById(events), [events]);
  const timeline = useMemo(() => getManagerTimeline(events), [events]);
  const shotEvents = useMemo(() => getManagerShots(events), [events]);
  const shotMinutes = useMemo(() => shotMinutesOf(events), [events]);

  const elapsed = match.started_at ? Math.max(0, now - new Date(match.started_at).getTime()) : 0;
  const clock = matchClock(elapsed, shotMinutes);
  const fullTime = elapsed >= plannedDurationMs(shotMinutes);
  const shownMinute = complete ? 90 : clock.minute;

  const activeShot: TimelineShot | null = clock.phase === "shot" && clock.shotMinute !== null ? shotEvents.find((shot) => shot.minute === clock.shotMinute) ?? null : null;
  const activeResult = activeShot ? match.shots.find((shot) => shot.minute === activeShot.minute) ?? null : null;
  const choosingWindow = Boolean(activeShot) && clock.shotElapsedMs < SHOT_CHOICE_MS;

  useEffect(() => {
    // Under et straffespark teller sekundene, så da må klokka og serveren følges tettere.
    const interval = setInterval(() => setNow(Date.now() + serverOffset), 200);
    return () => clearInterval(interval);
  }, [serverOffset]);
  useEffect(() => {
    if (match.status !== "live") return;
    const refresh = setInterval(() => router.refresh(), activeShot ? 800 : 3000);
    return () => clearInterval(refresh);
  }, [match.status, router, activeShot]);

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
  const report = getManagerMatchReport(match.id, events, match.shots, complete ? 90 : shownMinute);
  const yourReport = report && userSide ? report[userSide] : null;
  const opponentReport = report && opponentSide ? report[opponentSide] : null;
  const substitutions = userSide ? getManagerSubstitutions(events).filter((event) => event.side === userSide) : [];
  // Billig nok å regne ut direkte: den kalles bare i de ti sekundene byttevinduet er åpent.
  const suggestions = clock.phase === "substitutions" && userSide ? suggestSubstitutions(match.id, events, userSide, SUB_WINDOW_MINUTE) : [];

  const seconds = Math.max(0, Math.ceil(clock.remainingMs / 1000));
  const statusLabel = complete
    ? "Slutt"
    : match.status === "live"
      ? clock.phase === "halftime"
        ? "Pause · 45′"
        : clock.phase === "substitutions"
          ? "Byttevindu · 70′"
          : clock.phase === "shot"
            ? `${activeShot?.kind === "penalty" ? "Straffespark" : "Stor sjanse"} · ${clock.minute}′`
            : `Live · ${clock.minute}′`
      : "Venter i lobby";

  useEffect(() => {
    if (match.status !== "live" || !fullTime || automaticallyFinished.current) return;
    automaticallyFinished.current = true;
    finishFormRef.current?.requestSubmit();
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
    const timer = setTimeout(() => router.replace("/managerkarriere"), 12_000);
    return () => clearTimeout(timer);
  }, [complete, returnAfterComplete, router]);

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
  const shotSeconds = activeShot ? Math.max(0, Math.ceil((SHOT_CHOICE_MS - clock.shotElapsedMs) / 1000)) : 0;

  return (
    <section className="grid gap-4">
      <div className={`${cardClass} grid gap-3 p-4`}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[.2em] text-muted">
          <span>{statusLabel}</span>
          {kickoff ? <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] text-accent">XI LÅST</span> : null}
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

        <GoalStrip goals={goalMarkers} minute={shownMinute} />
        {match.status === "live" && clock.phase !== "shot" ? (
          <p className="text-center text-sm font-semibold">
            {clock.phase === "halftime" ? `Pause · ${seconds} sek` : clock.phase === "substitutions" ? `Byttevindu · ${seconds} sek` : clock.phase === "first_half" ? "1. omgang" : clock.phase === "second_half" ? "2. omgang" : "Full tid"}
          </p>
        ) : null}
      </div>

      {activeShot ? (
        <section className="grid gap-3 rounded-xl border border-accent bg-accent-soft p-4 text-center">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-accent">{activeShot.kind === "penalty" ? "STRAFFESPARK" : "STOR SJANSE"} · {activeShot.minute}′</p>
            <h2 className="mt-1 text-xl font-bold">
              {iAmShooting ? `${shortName(activeShot.taker)} skal skyte` : iAmKeeping ? `${shortName(activeShot.taker)} tar straffen mot deg` : `${(activeShot.side === "home" ? match.home : match.away).username} har en stor sjanse`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {choosingWindow
                ? iAmShooting
                  ? `Velg hvor du sikter · ${shotSeconds} sek`
                  : iAmKeeping
                    ? `Velg hvor du kaster deg · ${shotSeconds} sek`
                    : "Du kan bare se på denne"
                : activeResult?.outcome === "goal"
                  ? "MÅL!"
                  : activeResult?.outcome === "saved"
                    ? "Reddet!"
                    : activeResult?.outcome === "missed"
                      ? "Bom!"
                      : "Avgjøres…"}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <EventPlayerCard player={taker} large />
            <div className="grid min-w-0 flex-1 gap-2">
              <GoalGrid
                options={activeShot.options}
                chanceFor={iAmShooting && taker ? (cell) => cellGoalChance(shootingOf(taker), activeShot.kind, cell) : null}
                myCell={myCell}
                otherCell={revealCell}
                otherLabel={iAmShooting ? "KEEPER" : "SKUDD"}
                disabled={!choosingWindow || picking || myCell !== null || (!iAmShooting && !iAmKeeping)}
                onPick={(cell) => {
                  const data = new FormData();
                  data.set("match_id", match.id);
                  data.set("minute", String(activeShot.minute));
                  data.set("cell", String(cell));
                  shotAction(data);
                }}
              />
              {myCell !== null && choosingWindow ? <p className="text-xs text-muted">Valgt – venter på {iAmShooting && activeShot.kind === "penalty" ? "keeperen" : "avslutningen"}…</p> : null}
              {shotState.error ? <p className="text-xs text-danger">{shotState.error}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {clock.phase === "halftime" && report && yourReport && opponentReport ? (
        <section className="grid gap-2 rounded-xl border border-border bg-surface p-4">
          <p className="text-center text-xs font-bold tracking-[.2em] text-muted">STATISTIKK FØRSTE OMGANG</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <b>{yourReport.possession}%</b><span className="text-muted">Ballbesittelse</span><b>{opponentReport.possession}%</b>
            <b>{yourReport.shots}</b><span className="text-muted">Skudd</span><b>{opponentReport.shots}</b>
            <b>{yourReport.onTarget}</b><span className="text-muted">På mål</span><b>{opponentReport.onTarget}</b>
            <b>{yourReport.strength}</b><span className="text-muted">Lagstyrke</span><b>{opponentReport.strength}</b>
          </div>
        </section>
      ) : null}

      {clock.phase === "substitutions" && userSide ? (
        <section className="grid gap-3 rounded-xl border border-accent bg-accent-soft p-4">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[.2em] text-accent">BYTTEVINDU · {seconds} SEK</p>
            <p className="mt-1 text-sm text-muted">Bruk så mange av forslagene du vil – eller ingen. {3 - substitutions.length} bytter igjen.</p>
          </div>
          {substitutions.length >= 3 ? (
            <p className="text-center text-sm text-muted">Du har brukt alle tre byttene.</p>
          ) : suggestions.length ? (
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <form key={`${suggestion.outId}-${suggestion.inId}`} action={substitutionAction} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
                  <input type="hidden" name="match_id" value={match.id} />
                  <input type="hidden" name="out_id" value={suggestion.outId} />
                  <input type="hidden" name="in_id" value={suggestion.inId} />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm"><b>{shortName(suggestion.in.name)}</b> <span className="text-muted">({suggestion.in.position} {suggestion.in.overall})</span></p>
                    <p className="truncate text-xs text-muted">inn for {shortName(suggestion.out.name)} · {suggestion.reason}</p>
                  </div>
                  <button className={secondaryButtonClass} disabled={substituting}>Bytt</button>
                </form>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">Ingen bytter å foreslå – benken har ingen som passer bedre.</p>
          )}
          {substitutionState.error ? <p className="text-center text-sm text-danger">{substitutionState.error}</p> : null}
        </section>
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
          <p className="grid h-full place-items-center text-center text-sm text-muted">{match.status === "live" ? "Kampen er i gang – ingen hendelser ennå." : "Kampen har ikke startet."}</p>
        )}
      </div>

      {match.status === "live" && fullTime ? <p className="text-center text-sm text-muted">Sluttresultatet lagres automatisk på serveren…</p> : null}
      <form ref={finishFormRef} action={finishAction}><input type="hidden" name="match_id" value={match.id} /></form>
      <form ref={resolveFormRef} action={resolveAction}>
        <input type="hidden" name="match_id" value={match.id} />
        <input type="hidden" name="minute" value={activeShot?.minute ?? ""} />
      </form>

      {complete && report && yourReport && opponentReport ? (
        <section className="grid gap-4 rounded-xl border border-accent bg-accent-soft p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-accent">KAMPOPPSUMMERING</p>
              <h2 className="mt-1 text-xl font-bold">Kampens spiller: {report.playerOfMatch}</h2>
            </div>
            <p className="text-sm text-muted">{returnAfterComplete ? "Tilbake til Manager Karriere om et øyeblikk" : "Lagret i karrierehistorikken"}</p>
          </div>
          <div className="flex justify-between px-1 text-xs font-bold tracking-[.16em] text-muted">
            <span>{(userSide === "away" ? match.away : match.home).username.toUpperCase()}</span>
            <span>{(userSide === "away" ? match.home : match.away).username.toUpperCase()}</span>
          </div>
          <div className="grid overflow-hidden rounded-lg border border-border bg-surface-raised text-center sm:grid-cols-4">
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">LAGSTYRKE</p><p className="mt-1 text-lg font-bold">{yourReport.strength} <span className="text-muted">–</span> {opponentReport.strength}</p></div>
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">BALLBESITTELSE</p><p className="mt-1 text-lg font-bold">{yourReport.possession}% <span className="text-muted">–</span> {opponentReport.possession}%</p></div>
            <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">SKUDD</p><p className="mt-1 text-lg font-bold">{yourReport.shots} <span className="text-muted">–</span> {opponentReport.shots}</p></div>
            <div className="p-3"><p className="text-xs text-muted">PÅ MÅL</p><p className="mt-1 text-lg font-bold">{yourReport.onTarget} <span className="text-muted">–</span> {opponentReport.onTarget}</p></div>
          </div>
          {!returnAfterComplete ? <Link href="/managerkarriere" className={buttonClass}>Til Manager Karriere</Link> : null}
        </section>
      ) : null}

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : complete || state.ok ? <p className="text-sm text-success">Resultatet, V/U/T og belønningen er lagret.</p> : null}
    </section>
  );
}
