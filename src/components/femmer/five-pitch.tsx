"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useT } from "@/i18n/client";
import { controllerShoots, fiveCellChance, FIVE_SHOT_CELLS, type FiveEvent, type FiveMatchData, type FivePlayer, type FiveShot, type FiveShotResult, type FiveSide } from "@/lib/femmer/match";
import { buildPitchScript, GOAL_HALF_WIDTH, pitchFrame } from "@/lib/femmer/pitch";
import { playerPhoto } from "@/lib/player-photos";

/** Lagfargene på banen: hjemmelaget i gult, bortelaget i rosa, som i Femmer ellers. */
export const sideColors: Record<FiveSide, { ring: string; text: string; chip: string }> = {
  home: { ring: "#fcd34d", text: "text-amber-300", chip: "bg-amber-300 text-slate-950" },
  away: { ring: "#e879f9", text: "text-fuchsia-300", chip: "bg-fuchsia-400 text-slate-950" },
};

/** Fornavnet, eller det første ordet i brukernavnet: det får plass under bildet. */
function shortName(name: string) {
  return name.split(/[\s_.-]+/).find(Boolean)?.slice(0, 10) ?? name;
}

export function PitchAvatar({ player, side, size = 34, glow = false }: { player: FivePlayer; side: FiveSide; size?: number; glow?: boolean }) {
  const photo = playerPhoto(player.slug);
  return <div className="flex flex-col items-center">
    <div className="relative overflow-hidden rounded-full bg-slate-900 shadow-[0_3px_8px_rgba(0,0,0,.5)]" style={{ width: size, height: size, border: `3px solid ${sideColors[side].ring}`, boxShadow: glow ? `0 0 0 3px #fff, 0 0 18px ${sideColors[side].ring}` : undefined }}>
      {photo ? <Image src={photo} alt="" width={64} height={64} draggable={false} className="h-full w-full object-cover object-top" /> : <span className="grid h-full w-full place-items-center text-xs font-black text-white">{player.name.slice(0, 2).toUpperCase()}</span>}
    </div>
    <span className="mt-0.5 max-w-[4.5rem] truncate rounded bg-black/55 px-1 text-[9px] font-black leading-tight text-white sm:text-[10px]">{shortName(player.name)}</span>
  </div>;
}

/** Linjene på en femmerbane, med mål i begge ender. */
function PitchLines() {
  return <>
    <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,.035)_0_10%,transparent_10%_20%)]" />
    <div className="absolute inset-[3%] rounded-lg border-2 border-white/45" />
    <div className="absolute inset-x-[3%] top-1/2 border-t-2 border-white/45" />
    <div className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
    <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
    <div className="absolute left-1/2 top-[3%] h-[14%] w-[44%] -translate-x-1/2 rounded-b-[50%] border-2 border-t-0 border-white/45" />
    <div className="absolute bottom-[3%] left-1/2 h-[14%] w-[44%] -translate-x-1/2 rounded-t-[50%] border-2 border-b-0 border-white/45" />
    {/* Målene står litt utenfor linja. */}
    <div className="absolute top-0 h-[3%] -translate-x-1/2 rounded-t-sm border-2 border-b-0 border-white bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_2px,transparent_2px_6px)]" style={{ left: "50%", width: `${GOAL_HALF_WIDTH * 2}%` }} />
    <div className="absolute bottom-0 h-[3%] -translate-x-1/2 rounded-b-sm border-2 border-t-0 border-white bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_2px,transparent_2px_6px)]" style={{ left: "50%", width: `${GOAL_HALF_WIDTH * 2}%` }} />
  </>;
}

// Målet sett bakfra skytteren: ruter i prosent av flaten.
const GOAL = { left: 8, top: 20, width: 84, height: 34 };
const cellCenter = (cell: number) => ({ x: GOAL.left + GOAL.width * ((cell % 3) + 0.5) / 3, y: GOAL.top + GOAL.height * (Math.floor(cell / 3) + 0.5) / 2 });
/** Der ballen havner: i ruta, eller utenfor målet når skuddet går utenfor. */
function ballTarget(result: FiveShotResult | undefined) {
  if (!result || result.shooterCell === null) return { x: 50, y: 74 };
  const center = cellCenter(result.shooterCell);
  if (result.outcome !== "missed") return center;
  const column = result.shooterCell % 3;
  return column === 0 ? { x: GOAL.left - 6, y: center.y } : column === 2 ? { x: GOAL.left + GOAL.width + 6, y: center.y } : { x: center.x, y: GOAL.top - 8 };
}

/**
 * Straffe eller stor sjanse: banen zoomer inn mot målet, og man ser det fra skytterens side.
 * Den som spiller, trykker på en rute: som skytter dit man skyter, som keeper dit man kaster seg.
 */
function ShotStage({ match, shot, result, interactive, secondsLeft, isController, onPick }: { match: FiveMatchData; shot: FiveShot; result: FiveShotResult | undefined; interactive: boolean; secondsLeft: number; isController: boolean; onPick: (cell: number) => void }) {
  const t = useT().femmer;
  const shooting = controllerShoots(match, shot);
  const defending: FiveSide = shot.side === "home" ? "away" : "home";
  const everyone = (side: FiveSide) => [...match[side].starters, ...match[side].bench];
  const taker = everyone(shot.side).find((player) => player.id === shot.takerId);
  const keeper = everyone(defending).find((player) => player.id === shot.keeperId) ?? match[defending].starters[0];
  const ball = ballTarget(result);
  const glove = result?.keeperCell !== null && result?.keeperCell !== undefined ? cellCenter(result.keeperCell) : { x: 50, y: GOAL.top + GOAL.height - 6 };
  const dive = result?.keeperCell !== null && result?.keeperCell !== undefined ? ((result.keeperCell % 3) - 1) * 35 : 0;
  return <div className="absolute inset-0 z-20 animate-[five-fade-in_.5s_ease-out_.35s_both] bg-[linear-gradient(180deg,#0b3d2a_0%,#0d5a3c_40%,#12744c_100%)]">
    <div className="absolute inset-x-0 top-[3%] grid gap-0.5 px-3 text-center">
      <p className="text-xs font-black tracking-widest text-amber-300">{shot.kind === "penalty" ? t.match.penalty : t.match.bigChance} · {shot.minute}′</p>
      <p className="text-sm font-black leading-tight sm:text-base">{isController ? (shooting ? t.match.youShoot(shot.taker, shot.keeper ?? "?") : t.match.youSave(shot.keeper ?? "?", shot.taker)) : t.match.watching(shot.taker)}</p>
    </div>
    {/* Målet med nett, delt i 3 × 2 ruter. */}
    <div className="absolute rounded-t-md border-[5px] border-b-0 border-white bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.1)_0_5px,transparent_5px_10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.1)_0_5px,transparent_5px_10px)] shadow-[0_8px_20px_rgba(0,0,0,.4)]" style={{ left: `${GOAL.left}%`, top: `${GOAL.top}%`, width: `${GOAL.width}%`, height: `${GOAL.height}%` }}>
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 p-1">
        {Array.from({ length: FIVE_SHOT_CELLS }, (_, cell) => <button key={cell} type="button" disabled={!interactive} onClick={() => onPick(cell)} className={`grid place-items-center rounded-md text-sm font-black transition sm:text-base ${interactive ? "border border-lime-300/70 bg-lime-300/10 hover:bg-lime-300/35 active:scale-95" : "border border-transparent"}`}>
          {!result && interactive ? (shooting ? `${Math.round(fiveCellChance(shot, cell) * 100)}%` : "🧤") : ""}
        </button>)}
      </div>
    </div>
    <div className="absolute border-t-2 border-white/60" style={{ left: "2%", right: "2%", top: `${GOAL.top + GOAL.height}%` }} />
    {/* Keeperen står på streken og kaster seg når skuddet er avgjort. */}
    {keeper ? <div className="pointer-events-none absolute z-10 transition-all duration-500 ease-out" style={{ left: `${glove.x}%`, top: `${glove.y}%`, transform: `translate(-50%, -50%) rotate(${dive}deg)` }}><PitchAvatar player={keeper} side={defending} size={46} /></div> : null}
    <div className="pointer-events-none absolute z-20 h-5 w-5 rounded-full bg-white shadow-[0_3px_6px_rgba(0,0,0,.5)] transition-all duration-500 ease-in" style={{ left: `${ball.x}%`, top: `${ball.y}%`, transform: `translate(-50%, -50%) scale(${result ? 0.7 : 1})` }}>
      <span className="absolute inset-[3px] rounded-full border border-slate-400/60" />
    </div>
    {taker ? <div className="pointer-events-none absolute -translate-x-1/2" style={{ left: "50%", top: "78%" }}><PitchAvatar player={taker} side={shot.side} size={52} glow /></div> : null}
    <div className="absolute inset-x-0 bottom-[3%] px-3 text-center">
      {result?.outcome ? <p className={`animate-[five-fade-in_.3s_ease-out_.45s_both] text-3xl font-black drop-shadow ${result.outcome === "goal" ? "text-lime-300" : "text-red-300"}`}>{t.match.shotOutcome[result.outcome]}</p>
        : isController && interactive ? <p className="text-xs font-bold text-white/80">{shooting ? t.match.pickCorner : t.match.pickDive} · <b className="tabular-nums text-amber-300">{secondsLeft}s</b></p> : null}
    </div>
  </div>;
}

type PitchProps = {
  match: FiveMatchData; results: FiveShotResult[]; time: number;
  shot: FiveShot | undefined; shotResult: FiveShotResult | undefined; shotInteractive: boolean; secondsLeft: number; isController: boolean; onPick: (cell: number) => void;
};

/** Den siste målhendelsen i åpent spill som skal vises som banner nå. */
function goalBanner(events: FiveEvent[], time: number) {
  return events.findLast((event): event is Extract<FiveEvent, { type: "goal" }> => event.type === "goal" && time >= event.minute - 0.06 && time < event.minute + 0.8);
}

/** Banen sett ovenfra, med hjemmelaget nederst. Spillerne og ballen tegnes på nytt for hvert bilde. */
export function FivePitch({ match, results, time, shot, shotResult, shotInteractive, secondsLeft, isController, onPick }: PitchProps) {
  const t = useT().femmer;
  const script = useMemo(() => buildPitchScript(match, results), [match, results]);
  const frame = pitchFrame(script, time);
  const banner = shot ? undefined : goalBanner(match.events, time);
  // Ved et stopp zoomer banen inn mot målet laget som skyter angriper.
  const zoom = shot ? { transform: "scale(1.8)", transformOrigin: `50% ${shot.side === "home" ? "0%" : "100%"}` } : { transform: "scale(1)", transformOrigin: "50% 50%" };
  return <div className="relative mx-auto aspect-[3/4] w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#0d5a3c,#12744c)] shadow-xl select-none">
    <div className="absolute inset-0 transition-transform duration-700 ease-in-out" style={zoom}>
      <PitchLines />
      {frame.figures.map((figure) => <div key={`${figure.side}-${figure.slot}`} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 will-change-[left,top]" style={{ left: `${figure.x}%`, top: `${figure.y}%` }}>
        <PitchAvatar player={figure.player} side={figure.side} glow={figure.hasBall} />
      </div>)}
      <div className="absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.6)] ring-1 ring-slate-500/50" style={{ left: `${frame.ball.x}%`, top: `${frame.ball.y}%` }} />
    </div>
    {banner ? <div key={`${banner.minute}-${banner.side}`} className="pointer-events-none absolute inset-x-0 top-1/2 z-30 animate-[five-goal-pop_.45s_ease-out_both] bg-black/55 py-3 text-center backdrop-blur-sm">
      <p className={`text-4xl font-black tracking-tight ${sideColors[banner.side].text}`}>{t.match.goal}!</p>
      <p className="text-sm font-bold text-white">{banner.player}{banner.assist ? <span className="text-white/70"> · {t.match.assist(banner.assist)}</span> : null}</p>
    </div> : null}
    {shot ? <ShotStage match={match} shot={shot} result={shotResult} interactive={shotInteractive} secondsLeft={secondsLeft} isController={isController} onPick={onPick} /> : null}
  </div>;
}
