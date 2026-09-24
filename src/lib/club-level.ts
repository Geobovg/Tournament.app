// Klubbnivå-kurven og belønningene speiler club_level_for_xp og grant_club_xp i
// supabase/migrations/0026_club_levels.sql. Endres den ene, må den andre endres også.

export const clubXpRewards = {
  manager: { win: 30, draw: 15, loss: 10 },
  tournament: { win: 20, draw: 10, loss: 5 },
} as const;

const earlyLevels = 10;
const earlyCost = 100;
const lateCost = 150;

export function xpToReach(level: number) {
  if (level <= 1) return 0;
  if (level <= earlyLevels) return (level - 1) * earlyCost;
  return (earlyLevels - 1) * earlyCost + (level - earlyLevels) * lateCost;
}

export function clubLevelForXp(xp: number) {
  const early = (earlyLevels - 1) * earlyCost;
  return xp < early ? 1 + Math.floor(xp / earlyCost) : earlyLevels + Math.floor((xp - early) / lateCost);
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

export function describeLevelReward(reward: { managerBudget: number; goldPacks: number }) {
  const packs = reward.goldPacks ? ` + ${reward.goldPacks} ${reward.goldPacks === 1 ? "Gullpakke" : "Gullpakker"}` : "";
  return `${reward.managerBudget} MB${packs}`;
}
