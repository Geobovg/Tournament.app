"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorMessage, getT } from "@/i18n/server";
import { requireUser } from "./auth";
import { recordFailedInviteCode, tooManyFailedInviteCodes } from "./data";
import { currentRound, getCurrentFantasySeason, getFantasyTeam, getLeague, getLeagueByCode, nextRound } from "./fantasy/data";
import { CHIPS, type Chip } from "./fantasy/points";
import { availableMoney, lineupProblems, sellingPrice, squadProblems, type FantasyPosition, type Lineup, type SquadPlayer } from "./fantasy/squad-rules";
import { validInviteCode } from "./invite-code";
import { supabaseAdmin } from "./supabase/server";

export type SaveFantasyTeamInput = Lineup & { name: string };
export type FantasyActionResult = { error?: string; ok?: boolean };

const ids = (value: unknown) => (Array.isArray(value) ? value.map(Number).filter(Number.isInteger).slice(0, 15) : []);

/** Lagrer hele fantasy-laget for neste runde. Posisjon, pris og klubb hentes fra databasen. */
export async function saveFantasyTeamAction(input: SaveFantasyTeamInput): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  const season = await getCurrentFantasySeason();
  if (!season) return { error: t.fantasy.errors.noSeason };

  const name = String(input?.name ?? "").trim().slice(0, 30);
  if (!name) return { error: t.fantasy.errors.nameRequired };
  const lineup: Lineup = { starters: ids(input?.starters), bench: ids(input?.bench), captainId: Number(input?.captainId), viceCaptainId: Number(input?.viceCaptainId) };
  const owned = await getFantasyTeam(user.id, season);
  if (owned?.freeHitActive) return { error: t.fantasy.errors.freeHitActive };

  const db = supabaseAdmin();
  const playerIds = [...new Set([...lineup.starters, ...lineup.bench, ...Object.keys(owned?.purchasePrices ?? {}).map(Number)])];
  const { data, error } = await db
    .from("football_season_players")
    .select("api_player_id, position, price, football_season_teams (club_id)")
    .eq("api_season", season.apiSeason)
    .in("api_player_id", playerIds);
  if (error) return { error: await dbErrorMessage(error) };
  const rows = data as unknown as { api_player_id: number; position: FantasyPosition; price: number; football_season_teams: { club_id: number } }[];
  const current = new Map(rows.map((row) => [row.api_player_id, row]));

  // Samme regnestykke som save_fantasy_team: spillere man beholder koster salgsprisen, nye dagens pris.
  const purchase = owned?.purchasePrices ?? {};
  const budget = availableMoney(owned?.bank ?? null, Object.entries(purchase).flatMap(([id, price]) => (current.has(Number(id)) ? [{ purchase: price, current: current.get(Number(id))!.price }] : [])));
  const squad: SquadPlayer[] = [...lineup.starters, ...lineup.bench].flatMap((id) => {
    const row = current.get(id);
    if (!row) return [];
    const price = purchase[id] === undefined ? row.price : sellingPrice(purchase[id], row.price);
    return [{ id, position: row.position, price, clubId: row.football_season_teams.club_id }];
  });
  if (squad.length !== 15 || squadProblems(squad, budget).length || lineupProblems(squad, lineup).length) return { error: t.fantasy.errors.invalidTeam };

  const picks = [...lineup.starters.map((player, index) => ({ player, slot: index + 1 })), ...lineup.bench.map((player, index) => ({ player, slot: 12 + index }))];
  const { error: saveError } = await db.rpc("save_fantasy_team", {
    target_user: user.id,
    target_season: season.apiSeason,
    team_name: name,
    target_captain: lineup.captainId,
    target_vice: lineup.viceCaptainId,
    picks,
  });
  if (saveError) return { error: await dbErrorMessage(saveError, { stripPrefix: true }) };
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Velger en chip for neste runde, eller fjerner den (null). */
export async function setFantasyChipAction(chip: Chip | null): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  const season = await getCurrentFantasySeason();
  if (!season) return { error: t.fantasy.errors.noSeason };
  if (chip !== null && !CHIPS.includes(chip)) return { error: t.fantasy.errors.invalidTeam };
  const { error } = await supabaseAdmin().rpc("set_fantasy_chip", { target_user: user.id, target_season: season.apiSeason, target_chip: chip });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Lager en ny fantasy-liga. Den som lager den, blir med automatisk. Tabellen starter fra neste runde. */
export async function createFantasyLeagueAction(_: FantasyActionResult, formData: FormData): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  const season = await getCurrentFantasySeason();
  if (!season) return { error: t.fantasy.errors.noSeason };
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return { error: t.fantasy.errors.leagueNameRequired };
  const db = supabaseAdmin();
  const startRound = nextRound(season)?.number ?? (currentRound(season)?.number ?? 0) + 1;
  const { data, error } = await db.from("fantasy_leagues").insert({ api_season: season.apiSeason, name, owner_id: user.id, start_round: startRound }).select("id").single();
  if (error) return { error: await dbErrorMessage(error) };
  const { error: memberError } = await db.from("fantasy_league_members").insert({ league_id: data.id, user_id: user.id });
  if (memberError) return { error: await dbErrorMessage(memberError) };
  redirect(`/fantasy/leagues/${data.id}`);
}

/** Blir med i en liga via invitasjonskoden. Feil koder telles, så man ikke kan prøve seg fram. */
export async function joinFantasyLeagueAction(code: string): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  if (!validInviteCode(code)) return { error: t.fantasy.errors.leagueNotFound };
  if (await tooManyFailedInviteCodes(user.id)) return { error: t.auth.join.tooManyAttemptsText };
  const league = await getLeagueByCode(code);
  if (!league) {
    await recordFailedInviteCode(user.id);
    return { error: t.fantasy.errors.leagueNotFound };
  }
  const { error } = await supabaseAdmin().from("fantasy_league_members").upsert({ league_id: league.id, user_id: user.id }, { ignoreDuplicates: true });
  if (error) return { error: await dbErrorMessage(error) };
  redirect(`/fantasy/leagues/${league.id}`);
}

/** Forlater en liga. Eieren kan ikke forlate sin egen liga, bare slette den. */
export async function leaveFantasyLeagueAction(leagueId: string): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  const league = await getLeague(String(leagueId));
  if (!league) return { error: t.fantasy.errors.leagueNotFound };
  if (league.ownerId === user.id) return { error: t.fantasy.errors.ownerCannotLeave };
  const { error } = await supabaseAdmin().from("fantasy_league_members").delete().eq("league_id", league.id).eq("user_id", user.id);
  if (error) return { error: await dbErrorMessage(error) };
  redirect("/fantasy/leagues");
}

/** Sletter en liga. Bare eieren kan gjøre det. */
export async function deleteFantasyLeagueAction(leagueId: string): Promise<FantasyActionResult> {
  const user = await requireUser();
  const t = await getT();
  const league = await getLeague(String(leagueId));
  if (!league || league.ownerId !== user.id) return { error: t.fantasy.errors.leagueNotFound };
  const { error } = await supabaseAdmin().from("fantasy_leagues").delete().eq("id", league.id).eq("owner_id", user.id);
  if (error) return { error: await dbErrorMessage(error) };
  redirect("/fantasy/leagues");
}
