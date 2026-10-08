// Kampen på banen. Hendelsene fra kampmotoren (mål, redninger, stolpe, straffer og sjanser) blir til et
// manus for ballen: hvem som har den når, og hvor den går. Spillerne flytter seg etter ballen. Alt er
// regnet ut fra frøet og tiden, så alle som ser kampen, ser det samme, og en ny lasting fortsetter der den var.
//
// Banen er i prosent: x går fra venstre til høyre, y fra bortelagets mål (0, øverst) til hjemmelagets (100).
// Tiden `t` er i kampminutter: minutt M spilles mellom t = M − 1 og t = M.

import { FIVE_HALF_MINUTES, FIVE_MATCH_MINUTES, seededRoll, type FiveMatchData, type FivePlayer, type FiveShotResult, type FiveSide } from "./match";
import { fiveFormations, isFiveFormation, type FiveRole, type FiveSlot } from "./rules";

export type PitchPoint = { x: number; y: number };
type Holder = { side: FiveSide; slot: number };
/** Et punkt i manuset: fra `t` har en spiller ballen, eller den ligger på et punkt (i nettet, ved stolpen, på midten). */
type Key = { t: number; holder: Holder | null; point: PitchPoint | null };
/** Hvem som står på hver av de fem plassene, per minutt (indeks 0 er avspark). */
type Roster = Record<FiveSide, FivePlayer[][]>;

export type PitchScript = { keys: Key[]; roster: Roster; slots: Record<FiveSide, FiveSlot[]>; seed: string };
export type PitchFigure = { side: FiveSide; slot: number; player: FivePlayer; x: number; y: number; hasBall: boolean };
export type PitchFrame = { figures: PitchFigure[]; ball: PitchPoint };

const other = (side: FiveSide): FiveSide => (side === "home" ? "away" : "home");
/** Retningen laget angriper i: hjemmelaget oppover (mot y = 0), bortelaget nedover. */
const forward = (side: FiveSide) => (side === "home" ? -1 : 1);
const CENTER: PitchPoint = { x: 50, y: 50 };
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const smooth = (amount: number) => { const x = clamp(amount, 0, 1); return x * x * (3 - 2 * x); };

/** Målet laget angriper: midt i nettet, ved stolpen og straffemerket. */
export function goalLine(side: FiveSide) { return side === "home" ? 1.5 : 98.5; }
export const GOAL_HALF_WIDTH = 9;
function penaltySpot(side: FiveSide): PitchPoint { return { x: 50, y: side === "home" ? 17 : 83 }; }

function formationSlots(match: FiveMatchData, side: FiveSide) {
  const formation = match[side].formation;
  return fiveFormations[isFiveFormation(formation) ? formation : "1-2-1"];
}

/** Grunnplassen på banen. Formasjonene har eget mål nederst (y 22–90), så bortelaget speiles. */
function basePoint(slot: FiveSlot, side: FiveSide): PitchPoint {
  const y = 8 + slot.y * 0.95;
  return side === "home" ? { x: slot.x, y } : { x: 100 - slot.x, y: 100 - y };
}

/** Plassene med en rolle, eller alle utespillerne hvis ingen har den. */
function slotsWith(slots: FiveSlot[], roles: FiveRole[]) {
  const matching = slots.map((slot, index) => (roles.includes(slot.role) ? index : -1)).filter((index) => index > 0);
  return matching.length ? matching : [1, 2, 3, 4].filter((index) => index < slots.length);
}

export function buildPitchScript(match: FiveMatchData, results: FiveShotResult[]): PitchScript {
  const seed = match.seed;
  const slots = { home: formationSlots(match, "home"), away: formationSlots(match, "away") };
  const roster: Roster = { home: [match.home.starters.slice(0, 5)], away: [match.away.starters.slice(0, 5)] };
  const keys: Key[] = [];
  const roll = (key: string) => seededRoll(`${seed}:pitch:${key}`);
  const pick = <T,>(items: T[], key: string) => items[Math.floor(roll(key) * items.length) % items.length];

  /** Plassen til en spiller dette minuttet. En innbytter som er med i en hendelse, kommer inn på en plass med samme rolle. */
  const slotOf = (side: FiveSide, minute: number, playerId: string | null): number | null => {
    if (!playerId) return null;
    const lineup = roster[side][minute];
    const index = lineup.findIndex((player) => player.id === playerId);
    if (index >= 0) return index;
    const sub = match[side].bench.find((player) => player.id === playerId);
    if (!sub) return null;
    const role: FiveRole = sub.position && sub.position !== "GK" ? sub.position : "M";
    const slot = pick(slotsWith(slots[side], [role]), `${minute}:${side}:sub:${playerId}`);
    lineup[slot] = sub;
    return slot;
  };
  const push = (t: number, holder: Holder | null, point: PitchPoint | null = null) => keys.push({ t, holder, point });
  const outfield = (side: FiveSide, roles: FiveRole[], key: string, not?: number | null): Holder => {
    const choices = slotsWith(slots[side], roles).filter((slot) => slot !== not);
    return { side, slot: choices.length ? pick(choices, key) : 1 };
  };
  const attacker = (side: FiveSide): Holder => {
    // Den som står lengst fram tar avsparket.
    let best = 1;
    slots[side].forEach((slot, index) => { if (index > 0 && slot.y < slots[side][best].y) best = index; });
    return { side, slot: best };
  };

  let holder: Holder = attacker("home");
  /** Hvordan forrige minutt sluttet: mål (laget som slapp inn, tar avspark), eller keeperen har ballen. */
  let restart: { kind: "kickoff"; side: FiveSide } | { kind: "keeper"; side: FiveSide } | null = { kind: "kickoff", side: "home" };
  const shotsByMinute = new Map((match.shots ?? []).map((shot) => [shot.minute, shot]));

  for (let minute = 1; minute <= FIVE_MATCH_MINUTES; minute += 1) {
    roster.home[minute] = [...roster.home[minute - 1]];
    roster.away[minute] = [...roster.away[minute - 1]];
    const start = minute - 1;
    let from = start;
    if (minute === FIVE_HALF_MINUTES + 1) restart = { kind: "kickoff", side: "away" };
    if (restart?.kind === "kickoff") {
      push(start, null, CENTER);
      holder = attacker(restart.side);
      from = start + 0.2;
      push(from, holder);
    } else if (restart?.kind === "keeper") {
      holder = { side: restart.side, slot: 0 };
      push(start, holder);
      from = start + 0.1;
    }
    restart = null;

    const passes = (until: number, key: string) => {
      // Vanlig spill: noen pasninger, og av og til vinner motstanderen ballen.
      const count = 1 + Math.floor(roll(`${key}:count`) * 3);
      const step = (until - from) / (count + 1);
      for (let index = 1; index <= count; index += 1) {
        const at = from + step * index;
        if (roll(`${key}:${index}:turnover`) < 0.28) holder = outfield(other(holder.side), ["D", "M"], `${key}:${index}:win`);
        else holder = outfield(holder.side, ["D", "M", "A"], `${key}:${index}:to`, holder.slot);
        push(at, holder);
      }
      from = until;
    };

    /** Et angrep som ender med at `shooter` skyter, med en pasning fra `assist` hvis det er en. */
    const buildUp = (side: FiveSide, until: number, shooter: number, assist: number | null, key: string) => {
      const span = until - from;
      if (holder.side !== side) { holder = outfield(side, ["D", "M"], `${key}:win`); push(from + span * 0.15, holder); }
      const helper = assist ?? outfield(side, ["M", "D"], `${key}:helper`, shooter).slot;
      if (helper !== shooter && helper !== holder.slot) { holder = { side, slot: helper }; push(from + span * 0.4, holder); }
      holder = { side, slot: shooter };
      push(from + span * 0.62, holder);
    };

    const shot = shotsByMinute.get(minute);
    const events = match.events.filter((event) => event.minute === minute);
    if (shot) {
      // Minuttet før et stopp: laget som får straffe eller sjanse, kommer seg fram til skytteren.
      const shooter = slotOf(shot.side, minute, shot.takerId) ?? attacker(shot.side).slot;
      buildUp(shot.side, minute - 0.05, shooter, null, `${minute}:stop`);
      push(minute - 0.05, null, shot.kind === "penalty" ? penaltySpot(shot.side) : { x: 50 + (roll(`${minute}:chance:x`) - 0.5) * 30, y: shot.side === "home" ? 24 : 76 });
      const result = results.find((entry) => entry.minute === minute);
      if (result?.outcome === "goal") restart = { kind: "kickoff", side: other(shot.side) };
      else restart = { kind: "keeper", side: other(shot.side) };
      continue;
    }
    if (!events.length) { passes(minute, `${minute}`); continue; }

    const span = (minute - from) / events.length;
    events.forEach((event, index) => {
      const end = from + span;
      const key = `${minute}:${index}`;
      const shooter = slotOf(event.side, minute, event.playerId) ?? attacker(event.side).slot;
      const assist = event.type === "goal" ? slotOf(event.side, minute, event.assistId) : null;
      buildUp(event.side, end, shooter, assist, key);
      const at = from + (end - from) * 0.8;
      const line = goalLine(event.side);
      const defending = other(event.side);
      if (event.type === "goal") {
        push(at, null, { x: 50 + (roll(`${key}:net`) - 0.5) * GOAL_HALF_WIDTH * 1.4, y: line });
        if (index === events.length - 1) restart = { kind: "kickoff", side: defending };
        else { push(at + (end - at) * 0.5, null, CENTER); holder = attacker(defending); push(at + (end - at) * 0.8, holder); }
      } else if (event.type === "save") {
        holder = { side: defending, slot: 0 };
        push(at, holder);
      } else {
        const side = roll(`${key}:post`) < 0.5 ? -1 : 1;
        push(at, null, { x: 50 + side * GOAL_HALF_WIDTH, y: line + forward(event.side) * -1.5 });
        holder = outfield(defending, ["D", "M"], `${key}:clear`);
        push(at + (end - at) * 0.6, holder);
      }
      from = end;
    });
    // Et mål blir liggende i nettet til avsparket i neste minutt.
  }
  return { keys, roster, slots, seed };
}

function keyIndex(keys: Key[], t: number) {
  let low = 0; let high = keys.length - 1;
  if (high < 0 || t < keys[0].t) return -1;
  while (low < high) { const middle = (low + high + 1) >> 1; if (keys[middle].t <= t) low = middle; else high = middle - 1; }
  return low;
}

/** Hvor ballen er på vei, med grunnplassene: alle flytter seg etter dette. */
function focusAt(script: PitchScript, t: number): PitchPoint {
  const where = (key: Key | undefined): PitchPoint => key?.point ?? (key?.holder ? basePoint(script.slots[key.holder.side][key.holder.slot], key.holder.side) : CENTER);
  const index = keyIndex(script.keys, t);
  const key = script.keys[index]; const next = script.keys[index + 1];
  if (!key) return CENTER;
  if (!next) return where(key);
  const amount = smooth((t - key.t) / Math.max(0.01, next.t - key.t));
  const from = where(key); const to = where(next);
  return { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount) };
}

/** Hvor mye laget har ballen (1) eller ikke (0), glidende så laget ikke hopper når ballen skifter eier. */
function possession(script: PitchScript, side: FiveSide, t: number) {
  const index = keyIndex(script.keys, t);
  const value = (key: Key | undefined) => (key?.holder ? (key.holder.side === side ? 1 : 0) : 0.5);
  const key = script.keys[index];
  if (!key) return 0.5;
  return lerp(value(script.keys[index - 1]), value(key), smooth((t - key.t) / 0.3));
}

/** Hvor langt ballføreren har ført ballen fram (0–1): opp mens han har den, tilbake når den går videre. */
function dribble(script: PitchScript, side: FiveSide, slot: number, t: number) {
  const index = keyIndex(script.keys, t);
  const key = script.keys[index]; const next = script.keys[index + 1];
  if (!key?.holder || key.holder.side !== side || key.holder.slot !== slot || !next) return 0;
  const amount = (t - key.t) / Math.max(0.01, next.t - key.t);
  return amount < 0.55 ? smooth(amount / 0.55) : 1 - smooth((amount - 0.55) / 0.45);
}

function playerPoint(script: PitchScript, side: FiveSide, slot: number, t: number, focus: PitchPoint): PitchPoint {
  const base = basePoint(script.slots[side][slot], side);
  // Litt bevegelse hele tiden, ulik for hver spiller, så ingen står helt stille.
  const phase = seededRoll(`${script.seed}:${side}:${slot}:phase`) * Math.PI * 2;
  const wobble = { x: Math.sin(t * 2.3 + phase) * 1.6, y: Math.cos(t * 1.7 + phase) * 1.2 };
  if (slot === 0) return { x: clamp(50 + (focus.x - 50) * 0.3 + wobble.x * 0.3, 40, 60), y: base.y + (focus.y - 50) * 0.05 };
  const shift = (focus.y - 50) * 0.35;
  const push = (possession(script, side, t) - 0.5) * 14 * forward(side);
  const carry = dribble(script, side, slot, t) * 7 * forward(side);
  return {
    x: clamp(base.x + (focus.x - base.x) * 0.25 + wobble.x, 6, 94),
    y: clamp(base.y + shift + push + carry + wobble.y, 5, 95),
  };
}

/** Spillerne og ballen på tiden `t`. */
export function pitchFrame(script: PitchScript, t: number): PitchFrame {
  const minute = clamp(Math.ceil(t), 1, FIVE_MATCH_MINUTES);
  const focus = focusAt(script, t);
  const index = keyIndex(script.keys, t);
  const key = script.keys[index]; const next = script.keys[index + 1];
  const holding = key?.holder ?? null;
  const figures: PitchFigure[] = (["home", "away"] as const).flatMap((side) => script.roster[side][minute].map((player, slot) => {
    const point = playerPoint(script, side, slot, t, focus);
    const hasBall = Boolean(holding && holding.side === side && holding.slot === slot && (!next || (t - key.t) / (next.t - key.t) < 0.55));
    return { side, slot, player, x: point.x, y: point.y, hasBall };
  }));

  const pointOf = (entry: Key, at: number): PitchPoint => {
    if (entry.point) return entry.point;
    if (!entry.holder) return CENTER;
    const player = playerPoint(script, entry.holder.side, entry.holder.slot, at, focusAt(script, at));
    // Ballen ligger litt foran føttene.
    return { x: player.x, y: player.y + forward(entry.holder.side) * 2.2 };
  };
  if (!key) return { figures, ball: CENTER };
  if (!next) return { figures, ball: pointOf(key, t) };
  const amount = (t - key.t) / Math.max(0.01, next.t - key.t);
  // Ballen ligger hos den som har den, og går videre i siste del av tiden fram til neste punkt.
  const travel = key.point ? 0.35 : 0.55;
  if (amount < travel) return { figures, ball: pointOf(key, t) };
  const departure = key.t + (next.t - key.t) * travel;
  const from = pointOf(key, departure); const to = pointOf(next, next.t);
  const along = clamp((amount - travel) / (1 - travel), 0, 1);
  return { figures, ball: { x: lerp(from.x, to.x, along), y: lerp(from.y, to.y, along) } };
}
