import "server-only";

import { clubXpRewards } from "./club-level";
import { supabaseAdmin } from "./supabase/server";

type Reward = { managerBudget: number; key: string; clubXp?: number };
export type CareerRecordColumn = "tournament_wins" | "tournament_draws" | "tournament_losses" | "manager_career_wins" | "manager_career_draws" | "manager_career_losses";

export async function incrementCareerRecord(userId: string, column: CareerRecordColumn) {
  const { error } = await supabaseAdmin().rpc("increment_career_record", { target_user: userId, record_column: column });
  if (error) throw new Error(error.message);
}

async function award(userId: string, sourceType: string, sourceId: string, reward: Reward): Promise<boolean> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("career_reward_events").upsert({ user_id: userId, source_type: sourceType, source_id: sourceId, reward_key: reward.key, manager_budget: reward.managerBudget, club_xp: reward.clubXp ?? 0 }, { onConflict: "user_id,source_type,source_id,reward_key", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) return false;
  if (reward.clubXp) {
    const { error: xpError } = await db.rpc("grant_club_xp", { target_user: userId, amount: reward.clubXp });
    if (xpError) throw new Error(xpError.message);
  }
  if (!reward.managerBudget) return true;
  const { data: profile, error: profileError } = await db.from("player_profiles").select("manager_budget, manager_budget_earned").eq("user_id", userId).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) return true;
  const { error: updateError } = await db.from("player_profiles").update({
    manager_budget: profile.manager_budget + reward.managerBudget,
    manager_budget_earned: profile.manager_budget_earned + reward.managerBudget,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
  return true;
}

async function teamUsers(teamId: string | null) {
  if (!teamId) return [];
  const { data, error } = await supabaseAdmin().from("tournament_members").select("user_id").eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.user_id);
}

async function awardTournamentResult(userId: string, matchId: string, result: "win" | "draw" | "loss") {
  const rewards: Record<"win" | "draw" | "loss", Reward> = {
    win: { managerBudget: 3, key: "win", clubXp: clubXpRewards.tournament.win },
    draw: { managerBudget: 1, key: "draw", clubXp: clubXpRewards.tournament.draw },
    loss: { managerBudget: 0, key: "loss", clubXp: clubXpRewards.tournament.loss },
  };
  const records: Record<"win" | "draw" | "loss", CareerRecordColumn> = { win: "tournament_wins", draw: "tournament_draws", loss: "tournament_losses" };
  if (await award(userId, "tournament_match", matchId, rewards[result])) await incrementCareerRecord(userId, records[result]);
}

export async function awardTournamentMatch(match: { id: string; home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null }) {
  if (match.home_score === null || match.away_score === null) return;
  const [homeUsers, awayUsers] = await Promise.all([teamUsers(match.home_team_id), teamUsers(match.away_team_id)]);
  const homeResult = match.home_score === match.away_score ? "draw" : match.home_score > match.away_score ? "win" : "loss";
  const awayResult = homeResult === "win" ? "loss" : homeResult === "loss" ? "win" : "draw";
  await Promise.all([
    ...homeUsers.map((id) => awardTournamentResult(id, match.id, homeResult)),
    ...awayUsers.map((id) => awardTournamentResult(id, match.id, awayResult)),
  ]);
}

export async function awardTournamentPodium(tournamentId: string, winnerTeamId: string | null, finalistTeamId: string | null) {
  const [winners, finalists] = await Promise.all([teamUsers(winnerTeamId), teamUsers(finalistTeamId)]);
  await Promise.all([
    ...winners.map((id) => award(id, "tournament_champion", tournamentId, { managerBudget: 20, key: "champion" })),
    ...finalists.map((id) => award(id, "tournament_finalist", tournamentId, { managerBudget: 8, key: "finalist" })),
  ]);
}
