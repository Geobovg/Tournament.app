"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { momentAim, momentControllers, momentTap, resolveMoment, type AimShot, type ShotResult } from "@/lib/manager-match";
import {
  AIM_GRACE_MS,
  AIM_MS,
  ballTarget,
  clampAim,
  FLIGHT_MS,
  IDLE_AIM,
  keeperPosition,
  keeperReach,
  keeperSpeed,
  keeperStart,
  SAVE_MS,
  type AimOutcome,
  type AimPoint,
  type KeeperTap,
} from "@/lib/shot-aim";

export type MomentRole = "shooter" | "keeper" | "watch";
type Flight = { aim: AimPoint; tap: KeeperTap | null; startedAt: number; keeperComputer: boolean };

// Målet tegnes i et koordinatsystem der stolpene står på x = 20 og 120, bakken på y = 62 og tverrliggeren på y = 18.
const VIEW = { width: 140, height: 80 };
const toX = (x: number) => 20 + x * 100;
const toY = (y: number) => 62 - y * 44;
const fromSvg = (x: number, y: number): AimPoint => clampAim({ x: (x - 20) / 100, y: (62 - y) / 44 });
const SPOT = { x: 70, y: 77 };

function ballAt(target: AimPoint, progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  // En liten bue, så ballen ser ut til å fly og ikke gli.
  return { x: SPOT.x + (toX(target.x) - SPOT.x) * p, y: SPOT.y + (toY(target.y) - SPOT.y) * p - Math.sin(Math.PI * p) * 6, r: 4.2 - 2.4 * p };
}

/** Et nøkkeløyeblikk: målet sett fra skytteren, med keeper, eventuell mur og ballen. */
export function AimMoment({
  matchId,
  events,
  shot,
  result,
  role,
  momentStart,
  serverOffset,
  serverMomentElapsed,
  labels,
  onAim,
  onSave,
}: {
  matchId: string;
  events: unknown;
  shot: AimShot;
  result: ShotResult | null;
  role: MomentRole;
  /** Når øyeblikket startet, i serverens tid (ms). */
  momentStart: number;
  serverOffset: number;
  /** Hvor langt inn i øyeblikket serveren var da dataene sist ble hentet. */
  serverMomentElapsed: number;
  labels: { outcome: Record<AimOutcome, string>; dragToAim: (seconds: number) => string; getReady: string; tapToSave: string; waitingForKeeper: string; waitingForShot: string };
  onAim: (point: AimPoint) => void;
  onSave: (tap: KeeperTap) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState(() => Date.now() + serverOffset);
  const [aim, setAim] = useState<AimPoint | null>(null);
  const [dragging, setDragging] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [tap, setTap] = useState<KeeperTap | null>(null);
  const shotSent = useRef(false);

  const elapsed = now - momentStart;
  const { shooterIsComputer, keeperIsComputer } = momentControllers(events, shot);
  const wall = shot.wall ?? null;
  const start = keeperStart(wall);
  const flightMs = FLIGHT_MS[shot.kind];
  const aimOpen = role === "shooter" && !flight && elapsed < AIM_MS;
  const serverAim = typeof result?.aimX === "number" && typeof result.aimY === "number" ? { x: result.aimX, y: result.aimY } : null;
  // Serveren har svart etter skytterens frist uten noe sikte: da går et slapt skudd av gårde.
  const aimSettled = serverAim !== null || serverMomentElapsed >= AIM_MS + AIM_GRACE_MS;

  const shoot = (point: AimPoint, at: number) => {
    if (shotSent.current) return;
    shotSent.current = true;
    setDragging(false);
    onAim(point);
    // Mot en datakeeper vises hele skuddet med en gang; mot en manager venter vi på kastet hans.
    const aimed = clampAim(point);
    const base = { ...(result ?? emptyResult(shot)), aimX: aimed.x, aimY: aimed.y };
    setFlight({ aim: aimed, tap: keeperIsComputer ? momentTap(matchId, events, shot, aimed, base) : null, startedAt: at, keeperComputer: keeperIsComputer });
  };

  /**
   * Det som skal skje av seg selv mens øyeblikket går, sjekket for hvert bilde: skuddet går når
   * tiden renner ut med fingeren nede, keeperen ser ballen komme, og en side som lastes på nytt
   * tar opp igjen det som alt er sendt.
   */
  const step = (current: number) => {
    const at = current - momentStart;
    if (role === "shooter") {
      if (!flight && serverAim) {
        shotSent.current = true;
        const aimed = clampAim(serverAim);
        setFlight({ aim: aimed, tap: keeperIsComputer ? momentTap(matchId, events, shot, aimed, result) : null, startedAt: current - flightMs, keeperComputer: keeperIsComputer });
      } else if (dragging && aim && at >= AIM_MS - 150) {
        shoot(aim, current);
      }
      return;
    }
    if (role !== "keeper") return;
    if (!tap && typeof result?.saveX === "number" && typeof result.saveY === "number") setTap({ x: result.saveX, y: result.saveY, ms: result.saveMs ?? 0 });
    // Keeperen ser ballen komme: fra en datastyrt skytter på hans tidspunkt, fra en manager når siktet hans er kommet fram.
    if (flight || at >= AIM_MS + SAVE_MS) return;
    if (shooterIsComputer && at >= (shot.release ?? 1500)) {
      setFlight({ aim: momentAim(matchId, events, shot, result), tap: null, startedAt: current, keeperComputer: false });
    } else if (!shooterIsComputer && aimSettled) {
      setFlight({ aim: serverAim ? clampAim(serverAim) : IDLE_AIM, tap: null, startedAt: current, keeperComputer: false });
    }
  };
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  // Øyeblikket varer bare sju sekunder, så en jevn animasjon her koster ingenting.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const current = Date.now() + serverOffset;
      setNow(current);
      stepRef.current(current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [serverOffset]);

  const point = (event: PointerEvent<SVGSVGElement>): AimPoint | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return fromSvg(local.x, local.y);
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const target = point(event);
    if (!target) return;
    if (aimOpen) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      setAim(target);
      return;
    }
    if (role === "keeper" && flight && !tap) {
      const ms = Math.round(now - flight.startedAt);
      if (ms > flightMs) return;
      const chosen = { ...target, ms };
      setTap(chosen);
      onSave(chosen);
    }
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!aimOpen || !dragging) return;
    const target = point(event);
    if (target) setAim(target);
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!aimOpen || !dragging) return;
    const target = point(event) ?? aim;
    if (target) shoot(target, now);
  };

  // Det endelige bildet: hva serveren har lagret når utfallet er avgjort, ellers det vi selv vet nok til å regne ut.
  const decided = result?.outcome ? resolveMoment(matchId, events, shot, result) : null;
  const localKnown = flight && (flight.keeperComputer || role === "keeper") && (role !== "keeper" || tap || elapsed >= AIM_MS + SAVE_MS)
    ? resolveMoment(matchId, events, shot, { ...(result ?? emptyResult(shot)), aimX: flight.aim.x, aimY: flight.aim.y, ...(role === "keeper" && tap ? { saveX: tap.x, saveY: tap.y, saveMs: tap.ms } : {}) })
    : null;
  const resolution = decided ?? localKnown;

  const sinceRelease = flight ? now - flight.startedAt : decided ? flightMs : 0;
  const progress = flight || decided ? sinceRelease / flightMs : 0;
  const target = flight ? ballTarget(`${matchId}:${shot.minute}:${shot.side}:aim`, flight.aim, shot.radius) : resolution?.ball ?? null;
  const decidedTap = decided ? momentTap(matchId, events, shot, momentAim(matchId, events, shot, result), result) : null;
  const activeTap = role === "keeper" ? tap ?? decidedTap : flight?.tap ?? decidedTap;
  const keeper = decided && !flight ? decided.keeper : keeperPosition(start, activeTap, flightMs, keeperSpeed(shot.keeperRating), Math.max(0, sinceRelease));
  const arrived = progress >= 1;
  const outcome = arrived && resolution ? resolution.outcome : null;
  const ball = target ? ballAt(target, progress) : null;
  const reach = keeperReach(shot.keeperRating);

  const hint = outcome
    ? labels.outcome[outcome]
    : role === "shooter"
      ? flight
        ? arrived && !resolution ? labels.waitingForKeeper : null
        : elapsed < AIM_MS ? labels.dragToAim(Math.max(0, Math.ceil((AIM_MS - elapsed) / 1000))) : labels.waitingForShot
      : role === "keeper"
        ? flight ? (tap ? null : labels.tapToSave) : labels.getReady
        : null;

  return (
    <div className="grid min-w-0 gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className={`w-full select-none rounded-xl border border-white/20 ${aimOpen || (role === "keeper" && flight && !tap) ? "cursor-crosshair" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragging(false)}
        role="img"
        aria-label={hint ?? ""}
      >
        <defs>
          <linearGradient id="aim-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0b1d33" />
            <stop offset="1" stopColor="#173a2a" />
          </linearGradient>
          <pattern id="aim-net" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 0 L4 4 M4 0 L0 4" stroke="rgba(255,255,255,.18)" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width={VIEW.width} height={VIEW.height} fill="url(#aim-sky)" />
        <rect y={62} width={VIEW.width} height={18} fill="#1f7a3d" />
        <rect x={toX(0)} y={toY(1)} width={100} height={44} fill="url(#aim-net)" />
        {/* Stolper og tverrligger */}
        <path d={`M${toX(0)} 62 V${toY(1)} H${toX(1)} V62`} fill="none" stroke="#f4f4f4" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx={SPOT.x} cy={SPOT.y + 1.2} rx={5} ry={1} fill="rgba(255,255,255,.35)" />

        {/* Keeperen: kroppen, og hvor langt han når rundt seg */}
        <ellipse cx={toX(keeper.x)} cy={toY(keeper.y)} rx={reach * 100} ry={(reach / 0.75) * 44} fill="rgba(250,204,21,.12)" stroke="rgba(250,204,21,.35)" strokeWidth="0.4" strokeDasharray="1.5 1" />
        <g transform={`translate(${toX(keeper.x)} ${toY(keeper.y)})`}>
          <rect x={-3.2} y={-6} width={6.4} height={12} rx={2.4} fill="#facc15" />
          <circle cy={-9} r={2.6} fill="#f1c9a5" />
          <rect x={-8} y={-5.4} width={4.6} height={1.8} rx={0.9} fill="#facc15" />
          <rect x={3.4} y={-5.4} width={4.6} height={1.8} rx={0.9} fill="#facc15" />
        </g>

        {/* Muren på frispark */}
        {wall
          ? Array.from({ length: 4 }, (_, index) => {
              const width = (wall.to - wall.from) / 4;
              const x = wall.from + width * (index + 0.5);
              return (
                <g key={index} transform={`translate(${toX(x)} 62)`}>
                  <rect x={-4} y={-(wall.top * 44) + 4} width={8} height={wall.top * 44 - 4} rx={2.5} fill="#e11d48" />
                  <circle cy={-(wall.top * 44) + 1.5} r={2.6} fill="#f1c9a5" />
                </g>
              );
            })
          : null}

        {/* Siktet og presisjonssirkelen mens skytteren drar */}
        {aimOpen && aim ? (
          <g pointerEvents="none">
            <ellipse cx={toX(aim.x)} cy={toY(aim.y)} rx={shot.radius * 100} ry={shot.radius * 44} fill="rgba(34,197,94,.18)" stroke="#22c55e" strokeWidth="0.6" />
            <path d={`M${toX(aim.x) - 2} ${toY(aim.y)} H${toX(aim.x) + 2} M${toX(aim.x)} ${toY(aim.y) - 2} V${toY(aim.y) + 2}`} stroke="#22c55e" strokeWidth="0.6" />
          </g>
        ) : null}

        {/* Keeperens trykk */}
        {role === "keeper" && tap ? <circle cx={toX(tap.x)} cy={toY(tap.y)} r={1.6} fill="none" stroke="#38bdf8" strokeWidth="0.6" /> : null}

        {ball ? (
          <g pointerEvents="none">
            <circle cx={ball.x} cy={ball.y} r={ball.r} fill="#fff" stroke="#111" strokeWidth="0.4" />
            <circle cx={ball.x - ball.r * 0.25} cy={ball.y - ball.r * 0.2} r={ball.r * 0.35} fill="#111" />
          </g>
        ) : (
          <g pointerEvents="none">
            <circle cx={SPOT.x} cy={SPOT.y} r={4.2} fill="#fff" stroke="#111" strokeWidth="0.4" />
            <circle cx={SPOT.x - 1} cy={SPOT.y - 0.8} r={1.5} fill="#111" />
          </g>
        )}
      </svg>
      {hint ? <p className={`text-center text-sm font-bold ${outcome === "goal" ? "text-success" : outcome ? "text-danger" : "text-muted"}`}>{hint}</p> : <p className="text-center text-sm">&nbsp;</p>}
    </div>
  );
}

function emptyResult(shot: AimShot): ShotResult {
  return { minute: shot.minute, kind: shot.kind, side: shot.side, shooterCell: null, keeperCell: null, outcome: null };
}
