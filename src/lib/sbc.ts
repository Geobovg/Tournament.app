import { canPlayPosition, formations } from "./lineup";

// Felles for server og nettleser. Databasen (complete_sbc i migrering 0045) er fasit: sjekkene her
// gir bare live-visning av kravene og valget i «Fyll automatisk». Holder de to seg i takt, godtar databasen det vi foreslår.

export type PositionGroup = "goalkeeper" | "defender" | "midfielder" | "attacker";

export const positionGroups: Record<PositionGroup, string[]> = {
  goalkeeper: ["GK"],
  defender: ["CB", "RB", "LB", "LWB", "RWB"],
  midfielder: ["CDM", "CM", "CAM", "LM", "RM"],
  attacker: ["ST", "LW", "RW", "SA"],
};

export type SbcRequirement =
  | { type: "team_rating"; value: number }
  | { type: "min_card_rating"; value: number }
  | { type: "cards_with_rating"; count: number; rating: number }
  | { type: "position_group"; group: PositionGroup; count: number }
  | { type: "same_club"; count: number }
  | { type: "league"; league: string; count: number }
  | { type: "same_nation"; count: number };

export type SbcCard = { id: string; name: string; position: string; overall: number; slug: string | null; accent: string; club: string; league: string; nation: string | null; value: number };

export type SbcChallenge = {
  key: string;
  cardCount: number;
  requirements: SbcRequirement[];
  rewardMb: number;
  rewardPack: string | null;
  weeklyLimit: number | null;
  /** Antall leveringer siden siste nullstilling. */
  usedThisWeek: number;
};

// Kort uten klubb teller ikke som «samme klubb». Samme liste som i databasen.
const noClub = new Set(["Uten klubb", "Unknown club", "Ukjent klubb"]);

/** Plassene i en SBC. Elleveren får banen fra 4-3-3 med posisjoner, mindre SBC-er får frie plasser. */
export function sbcSlots(cardCount: number): { position: string | null; x: number; y: number }[] {
  if (cardCount === 11) return formations["4-3-3"].map((slot) => ({ ...slot }));
  return Array.from({ length: cardCount }, () => ({ position: null, x: 0, y: 0 }));
}

export const teamRating = (cards: { overall: number }[]) => (cards.length ? Math.floor(cards.reduce((sum, card) => sum + card.overall, 0) / cards.length) : 0);

function biggestGroup(values: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}

export type RequirementStatus = { current: number; needed: number; met: boolean };

/** Hvor langt de valgte kortene er kommet på ett krav. Lagrating teller først når alle plassene er fylt. */
export function requirementStatus(req: SbcRequirement, cards: SbcCard[], cardCount: number): RequirementStatus {
  const full = cards.length === cardCount;
  switch (req.type) {
    case "team_rating": { const current = teamRating(cards); return { current, needed: req.value, met: full && current >= req.value }; }
    case "min_card_rating": { const current = cards.filter((card) => card.overall >= req.value).length; return { current, needed: cardCount, met: full && current === cardCount }; }
    case "cards_with_rating": { const current = cards.filter((card) => card.overall >= req.rating).length; return { current, needed: req.count, met: current >= req.count }; }
    case "position_group": { const current = cards.filter((card) => positionGroups[req.group].includes(card.position)).length; return { current, needed: req.count, met: current >= req.count }; }
    case "same_club": { const current = biggestGroup(cards.map((card) => (noClub.has(card.club) ? null : card.club))); return { current, needed: req.count, met: current >= req.count }; }
    case "league": { const current = cards.filter((card) => card.league === req.league).length; return { current, needed: req.count, met: current >= req.count }; }
    case "same_nation": { const current = biggestGroup(cards.map((card) => card.nation)); return { current, needed: req.count, met: current >= req.count }; }
  }
}

export function sbcSatisfied(requirements: SbcRequirement[], cards: SbcCard[], cardCount: number) {
  return cards.length === cardCount && requirements.every((req) => requirementStatus(req, cards, cardCount).met);
}

const cheapest = (a: SbcCard, b: SbcCard) => a.overall - b.overall || a.value - b.value || a.id.localeCompare(b.id);

/** Tar de dårligste kortene som passer, til kravet er oppfylt. */
function addCheapest(chosen: SbcCard[], pool: SbcCard[], matches: (card: SbcCard) => boolean, needed: number, current: number): SbcCard[] | null {
  const missing = needed - current;
  if (missing <= 0) return chosen;
  const taken = new Set(chosen.map((card) => card.id));
  const extra = pool.filter((card) => !taken.has(card.id) && matches(card)).sort(cheapest).slice(0, missing);
  return extra.length === missing ? [...chosen, ...extra] : null;
}

/** Alle måter å oppfylle ett krav på. Klubb og nasjon har ett alternativ per klubb eller nasjon. */
function expand(chosen: SbcCard[], pool: SbcCard[], req: SbcRequirement, cardCount: number): SbcCard[][] {
  const finish = (next: SbcCard[] | null) => (next && next.length <= cardCount ? [next] : []);
  switch (req.type) {
    case "position_group": return finish(addCheapest(chosen, pool, (card) => positionGroups[req.group].includes(card.position), req.count, requirementStatus(req, chosen, cardCount).current));
    case "league": return finish(addCheapest(chosen, pool, (card) => card.league === req.league, req.count, requirementStatus(req, chosen, cardCount).current));
    case "cards_with_rating": return finish(addCheapest(chosen, pool, (card) => card.overall >= req.rating, req.count, requirementStatus(req, chosen, cardCount).current));
    case "same_club":
    case "same_nation": {
      if (requirementStatus(req, chosen, cardCount).met) return [chosen];
      const keyOf = (card: SbcCard) => (req.type === "same_club" ? (noClub.has(card.club) ? null : card.club) : card.nation);
      const keys = new Set(pool.map(keyOf).filter((key): key is string => Boolean(key)));
      const options = [...keys].flatMap((key) => {
        const have = chosen.filter((card) => keyOf(card) === key).length;
        return finish(addCheapest(chosen, pool, (card) => keyOf(card) === key, req.count, have));
      });
      // Bare de rimeligste alternativene tas med, så søket holder seg raskt.
      return options.sort((a, b) => a.reduce((sum, card) => sum + card.overall, 0) - b.reduce((sum, card) => sum + card.overall, 0)).slice(0, 25);
    }
    default: return [chosen];
  }
}

/** Bytter inn litt bedre kort til lagratingen er høy nok, uten å bryte de andre kravene. */
function raiseRating(chosen: SbcCard[], locked: Set<string>, pool: SbcCard[], requirements: SbcRequirement[], cardCount: number): SbcCard[] {
  const target = Math.max(0, ...requirements.map((req) => (req.type === "team_rating" ? req.value : 0)));
  const others = requirements.filter((req) => req.type !== "team_rating");
  let current = chosen;
  for (let step = 0; step < 2000 && teamRating(current) < target; step++) {
    const taken = new Set(current.map((card) => card.id));
    let best: { out: SbcCard; into: SbcCard; gain: number } | null = null;
    for (const out of current) {
      if (locked.has(out.id)) continue;
      for (const into of pool) {
        const gain = into.overall - out.overall;
        if (taken.has(into.id) || gain <= 0 || (best && gain >= best.gain)) continue;
        const next = current.map((card) => (card === out ? into : card));
        if (others.every((req) => requirementStatus(req, next, cardCount).met || !requirementStatus(req, current, cardCount).met)) best = { out, into, gain };
      }
    }
    if (!best) return current;
    current = current.map((card) => (card === best!.out ? best!.into : card));
  }
  return current;
}

/**
 * Fyller SBC-en med de dårligste kortene som oppfyller kravene. Kort som allerede er valgt beholdes
 * hvis det går. Gir null når kortene du har ikke strekker til.
 */
export function autoFill(pool: SbcCard[], requirements: SbcRequirement[], cardCount: number, locked: SbcCard[] = []): SbcCard[] | null {
  const minCard = Math.max(0, ...requirements.map((req) => (req.type === "min_card_rating" ? req.value : 0)));
  const lockedIds = new Set(locked.map((card) => card.id));
  const candidates = pool.filter((card) => card.overall >= minCard && !lockedIds.has(card.id)).sort(cheapest);
  if (locked.some((card) => card.overall < minCard)) return null;
  let variants: SbcCard[][] = [locked];
  for (const req of requirements) variants = variants.flatMap((chosen) => expand(chosen, candidates, req, cardCount));
  let best: SbcCard[] | null = null;
  for (const variant of variants) {
    const taken = new Set(variant.map((card) => card.id));
    const filler = candidates.filter((card) => !taken.has(card.id)).slice(0, cardCount - variant.length);
    if (variant.length + filler.length < cardCount) continue;
    const full = raiseRating([...variant, ...filler], new Set([...lockedIds]), candidates, requirements, cardCount);
    if (!sbcSatisfied(requirements, full, cardCount)) continue;
    if (!best || full.reduce((sum, card) => sum + card.overall, 0) < best.reduce((sum, card) => sum + card.overall, 0)) best = full;
  }
  return best;
}

/** Legger kortene i ledige plasser, helst der posisjonen passer. Allerede fylte plasser beholdes. */
export function placeCards(slots: { position: string | null }[], current: (SbcCard | null)[], cards: SbcCard[]): (SbcCard | null)[] {
  const next = [...current];
  const placed = new Set(next.filter((card): card is SbcCard => Boolean(card)).map((card) => card.id));
  const waiting = cards.filter((card) => !placed.has(card.id));
  for (const card of [...waiting]) {
    const index = next.findIndex((slot, i) => !slot && slots[i].position && canPlayPosition(card.position, slots[i].position!));
    if (index >= 0) { next[index] = card; waiting.splice(waiting.indexOf(card), 1); }
  }
  for (const card of waiting) { const index = next.findIndex((slot) => !slot); if (index >= 0) next[index] = card; }
  return next;
}

const countRequirements = new Set<SbcRequirement["type"]>(["position_group", "league", "same_club", "same_nation", "cards_with_rating"]);

/**
 * Brukes når kortene dine ikke strekker til for hele SBC-en: legger inn de kortene som faktisk
 * bidrar til kravene (så mange som finnes), så fikser brukeren resten selv. Uten tellekrav, f.eks.
 * bare lagrating, fylles resten av plassene så godt det går.
 */
export function autoFillPartial(pool: SbcCard[], requirements: SbcRequirement[], cardCount: number, locked: SbcCard[] = []): SbcCard[] {
  const minCard = Math.max(0, ...requirements.map((req) => (req.type === "min_card_rating" ? req.value : 0)));
  const lockedIds = new Set(locked.map((card) => card.id));
  const candidates = pool.filter((card) => card.overall >= minCard && !lockedIds.has(card.id)).sort(cheapest);
  let chosen = [...locked];
  const add = (matches: (card: SbcCard) => boolean, missing: number, order: SbcCard[] = candidates) => {
    const taken = new Set(chosen.map((card) => card.id));
    const extra = order.filter((card) => !taken.has(card.id) && matches(card)).slice(0, Math.min(missing, cardCount - chosen.length));
    chosen = [...chosen, ...extra];
  };
  for (const req of requirements) {
    if (req.type === "position_group") add((card) => positionGroups[req.group].includes(card.position), req.count - requirementStatus(req, chosen, cardCount).current);
    else if (req.type === "league") add((card) => card.league === req.league, req.count - requirementStatus(req, chosen, cardCount).current);
    else if (req.type === "cards_with_rating") add((card) => card.overall >= req.rating, req.count - requirementStatus(req, chosen, cardCount).current);
    else if (req.type === "same_club" || req.type === "same_nation") {
      const keyOf = (card: SbcCard) => (req.type === "same_club" ? (noClub.has(card.club) ? null : card.club) : card.nation);
      const have = requirementStatus(req, chosen, cardCount).current;
      if (have >= req.count) continue;
      // Velg klubben eller nasjonen der flest kort er innen rekkevidde, og blant dem de billigste.
      const groups = new Map<string, SbcCard[]>();
      for (const card of [...chosen, ...candidates]) { const key = keyOf(card); if (key) groups.set(key, [...(groups.get(key) ?? []), card]); }
      const best = [...groups.entries()].sort(([, a], [, b]) => Math.min(b.length, req.count) - Math.min(a.length, req.count) || a.slice(0, req.count).reduce((sum, card) => sum + card.overall, 0) - b.slice(0, req.count).reduce((sum, card) => sum + card.overall, 0))[0];
      if (best) add((card) => keyOf(card) === best[0], req.count - chosen.filter((card) => keyOf(card) === best[0]).length);
    }
  }
  if (!requirements.some((req) => countRequirements.has(req.type))) {
    // Bare lagrating eller ingen krav: fyll opp, med de beste kortene hvis det er rating som teller.
    const filler = requirements.some((req) => req.type === "team_rating") ? [...candidates].reverse() : candidates;
    add(() => true, cardCount - chosen.length, filler);
  }
  return chosen;
}
