/**
 * Nøkkeløyeblikkene fra kampversjon 5: skytteren sikter selv mot målet, og keeperen redder selv.
 *
 * Alt her er rene funksjoner, så serveren og begge klientene regner seg fram til nøyaktig samme
 * utfall av de samme valgene. Målet er et koordinatsystem der x går fra venstre stolpe (0) til
 * høyre stolpe (1), og y fra bakken (0) til tverrliggeren (1). Man kan sikte litt utenfor.
 */

export type AimKind = "penalty" | "chance" | "freekick" | "longshot";
export type AimPoint = { x: number; y: number };
/** Hvor keeperen trykket, og hvor mange millisekunder etter at ballen ble skutt. */
export type KeeperTap = AimPoint & { ms: number };
/** Muren på frispark dekker et stykke av målet nede ved bakken. */
export type Wall = { from: number; to: number; top: number };
export type AimOutcome = "goal" | "saved" | "post" | "wide" | "wall";

/** Skytteren har tre sekunder på å sikte, så har keeperen to og et halvt på å redde, og til slutt vises utfallet. */
export const AIM_MS = 3_000;
export const SAVE_MS = 2_500;
export const REVEAL_MS = 1_500;
export const MOMENT_MS = AIM_MS + SAVE_MS + REVEAL_MS;
/** Litt slakk for nettverket: et skudd som sendes rett før fristen, kommer fram rett etter. */
export const AIM_GRACE_MS = 400;
/** Ingen reagerer raskere enn dette, så et trykk som påstår det, regnes som så raskt. */
export const MIN_REACTION_MS = 150;

export const AIM_X_MIN = -0.2;
export const AIM_X_MAX = 1.2;
export const AIM_Y_MAX = 1.3;

/** Hvor lenge ballen er i lufta. Et langskudd gir keeperen mer tid enn en avslutning alene med ham. */
export const FLIGHT_MS: Record<AimKind, number> = { penalty: 700, chance: 750, freekick: 900, longshot: 950 };

const POST = 0.022;
const BAR = 0.03;

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function numberFromSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4_294_967_296;
}

export function clampAim(point: AimPoint): AimPoint {
  return { x: bounded(point.x, AIM_X_MIN, AIM_X_MAX), y: bounded(point.y, 0, AIM_Y_MAX) };
}

/**
 * Hvor presis skytteren er: ballen lander et sted i en sirkel rundt der han sikter. En god
 * avslutter har en liten sirkel og tør sikte i hjørnet, en svak må sikte tryggere.
 */
export function aimRadius(kind: AimKind, shooting: number): number {
  const base = bounded(0.05 + (95 - shooting) * 0.0055, 0.05, 0.32);
  const scale: Record<AimKind, number> = { penalty: 0.75, chance: 1, freekick: 1.15, longshot: 1.45 };
  return base * scale[kind];
}

/** Hvor langt keeperen når rundt seg der han står, og hvor fort han kommer seg over målet. */
export function keeperReach(keeper: number): number {
  return bounded(0.13 + (keeper - 60) * 0.002, 0.1, 0.2);
}

export function keeperSpeed(keeper: number): number {
  return bounded(0.45 + (keeper - 80) * 0.01, 0.25, 0.65);
}

/** Keeperen står midt i målet, et lite steg mot den åpne siden når det er mur. */
export function keeperStart(wall: Wall | null): AimPoint {
  if (!wall) return { x: 0.5, y: 0.4 };
  return { x: wall.from < 0.5 ? 0.56 : 0.44, y: 0.4 };
}

/** Muren stilles opp mot den ene stolpen. Over den, i hjørnet bak, er det plass for en god skytter. */
export function planWall(seed: string): Wall {
  const left = numberFromSeed(`${seed}:wall`) < 0.5;
  return left ? { from: 0.04, to: 0.5, top: 0.4 } : { from: 0.5, to: 0.96, top: 0.4 };
}

/**
 * Der ballen faktisk havner: et sted i presisjonssirkelen rundt siktet. Siktet er med i frøet,
 * så avviket ikke kan regnes ut før man har bestemt seg.
 */
export function ballTarget(seed: string, aim: AimPoint, radius: number): AimPoint {
  const key = `${seed}:${aim.x.toFixed(3)}:${aim.y.toFixed(3)}`;
  const distance = radius * Math.sqrt(numberFromSeed(`${key}:r`));
  const angle = numberFromSeed(`${key}:a`) * Math.PI * 2;
  return { x: aim.x + Math.cos(angle) * distance, y: Math.max(0.02, aim.y + Math.sin(angle) * distance) };
}

/** Avstanden keeperen må nå. Han strekker seg lettere opp og ned enn til siden. */
function reachDistance(first: AimPoint, second: AimPoint) {
  return Math.hypot(first.x - second.x, (first.y - second.y) * 0.75);
}

/** Hvor keeperen er når ballen kommer: han starter når han reagerer, og beveger seg rett mot målet sitt. */
export function keeperPosition(start: AimPoint, tap: KeeperTap | null, flightMs: number, speed: number, atMs = flightMs): AimPoint {
  if (!tap) return start;
  const moving = Math.max(0, Math.min(atMs, flightMs) - Math.max(MIN_REACTION_MS, tap.ms)) / 1000;
  const dx = tap.x - start.x;
  const dy = tap.y - start.y;
  const length = reachDistance(start, tap);
  if (length === 0 || moving === 0) return start;
  const share = Math.min(1, (speed * moving) / length);
  return { x: start.x + dx * share, y: start.y + dy * share };
}

/**
 * En datakeeper (eller en bortlagt motstander sin) leser skuddet: han reagerer raskere og gjetter
 * nærmere jo bedre han er, men aldri perfekt.
 */
export function autoKeeperTap(seed: string, ball: AimPoint, keeper: number): KeeperTap {
  const reaction = bounded(330 - (keeper - 60) * 3, 230, 370) + (numberFromSeed(`${seed}:react`) - 0.5) * 140;
  const error = bounded(0.32 - (keeper - 60) * 0.005, 0.15, 0.34) * Math.sqrt(numberFromSeed(`${seed}:guess:r`));
  const angle = numberFromSeed(`${seed}:guess:a`) * Math.PI * 2;
  return { x: ball.x + Math.cos(angle) * error, y: Math.max(0, ball.y + Math.sin(angle) * error), ms: Math.round(reaction) };
}

/**
 * Hvor en datastyrt skytter sikter: mot et hjørne, men med så god margin til stolpene som
 * presisjonen hans krever.
 */
export function autoAim(seed: string, radius: number, wall: Wall | null): AimPoint {
  const margin = Math.min(0.42, radius * 0.5 + 0.02);
  // Over muren og ned i hjørnet bak den, eller lavt og hardt mot den åpne siden.
  const overWall = wall !== null && numberFromSeed(`${seed}:overwall`) < 0.6;
  const right = wall ? (wall.from < 0.5) !== overWall : numberFromSeed(`${seed}:side`) < 0.5;
  const depth = numberFromSeed(`${seed}:depth`) * 0.1;
  const x = right ? 1 - margin - depth : margin + depth;
  const low = overWall ? wall.top + margin + 0.06 : 0.12;
  const y = low + numberFromSeed(`${seed}:height`) * Math.max(0, 0.88 - margin - low);
  return { x, y };
}

/** Når en datastyrt skytter skyter, regnet fra starten av øyeblikket. */
export function autoRelease(seed: string): number {
  return Math.round(900 + numberFromSeed(`${seed}:release`) * 1500);
}

/** Skytteren som ikke rakk å sikte, får av gårde et halvhjertet skudd rett på keeperen. */
export const IDLE_AIM: AimPoint = { x: 0.5, y: 0.35 };

export type AimResolution = { outcome: AimOutcome; ball: AimPoint; keeper: AimPoint };

/**
 * Utfallet av et nøkkeløyeblikk. `tap` er null når keeperen ble stående: en manager som ikke
 * trykker, lar keeperen stå der han står.
 */
export function resolveAim(seed: string, input: { kind: AimKind; radius: number; keeper: number; wall: Wall | null; aim: AimPoint; tap: KeeperTap | null }): AimResolution {
  const ball = ballTarget(seed, clampAim(input.aim), input.radius);
  const start = keeperStart(input.wall);
  const keeper = keeperPosition(start, input.tap, FLIGHT_MS[input.kind], keeperSpeed(input.keeper));
  const result = (outcome: AimOutcome) => ({ outcome, ball, keeper });

  if (input.wall && ball.y < input.wall.top && ball.x > input.wall.from && ball.x < input.wall.to) return result("wall");
  const nearPost = (Math.abs(ball.x) < POST || Math.abs(ball.x - 1) < POST) && ball.y < 1 + BAR;
  const onBar = Math.abs(ball.y - 1) < BAR && ball.x > 0 && ball.x < 1;
  if (nearPost || onBar) return result("post");
  if (ball.x < 0 || ball.x > 1 || ball.y > 1) return result("wide");
  if (reachDistance(ball, keeper) <= keeperReach(input.keeper)) return result("saved");
  return result("goal");
}

/** Slik lagres utfallet i databasen, som bare kjenner mål, redning og bom. */
export function storedOutcome(outcome: AimOutcome): "goal" | "saved" | "missed" {
  return outcome === "goal" ? "goal" : outcome === "saved" || outcome === "wall" ? "saved" : "missed";
}
