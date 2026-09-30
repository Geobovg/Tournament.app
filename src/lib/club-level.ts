// Klubbnivå-kurven speiler club_level_for_xp i supabase/migrations/0037_steeper_club_levels.sql,
// og belønningene grant_club_xp i 0026_club_levels.sql. Endres den ene, må den andre endres også.

import type { Dictionary } from "@/i18n/dictionaries";

export const clubXpRewards = {
  manager: { win: 30, draw: 15, loss: 10 },
  tournament: { win: 20, draw: 10, loss: 5 },
} as const;

// Hvert nivå koster 50 XP mer enn det forrige: 100, 150, 200, 250 …
const firstCost = 100;
const costStep = 50;

export function xpToReach(level: number) {
  if (level <= 1) return 0;
  const steps = level - 1;
  return firstCost * steps + (costStep / 2) * steps * (steps - 1);
}

export function clubLevelForXp(xp: number) {
  let level = 1;
  while (xpToReach(level + 1) <= xp) level += 1;
  return level;
}

export function levelUpReward(level: number) {
  if (level <= 4) return { managerBudget: 10, goldPacks: 0 };
  if (level <= 9) return { managerBudget: 20, goldPacks: 1 };
  return { managerBudget: 50, goldPacks: 2 };
}

export function clubLevelProgress(xp: number) {
  const level = clubLevelForXp(xp);
  const floor = xpToReach(level);
  const next = xpToReach(level + 1);
  return { level, xp, into: xp - floor, needed: next - floor, nextReward: levelUpReward(level + 1) };
}

export function describeLevelReward(reward: { managerBudget: number; goldPacks: number }, t: Dictionary) {
  return t.career.levelReward(reward.managerBudget, reward.goldPacks);
}
