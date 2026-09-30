"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMatch, getTournament, isTournamentOwner, listMatches, listTeams } from "./data";
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "./invite-code";
import { currentUser, requireUser } from "./auth";
import { supabaseAdmin } from "./supabase/server";
import {
  generateFirstKnockoutRound,
  knockoutCutoff,
  pairWinners,
} from "./tournament/bracket";
import { generateRoundRobin, type Pairing } from "./tournament/round-robin";
import { computeStandings } from "./tournament/standings";
import { resolveTie } from "./tournament/tie";
import type { Match, Tournament } from "./tournament/types";
import { isHttpUrl } from "./video";
import { dbErrorMessage, getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { awardTournamentMatch, awardTournamentPodium } from "./career-rewards";

export type ActionState = { error?: string; ok?: boolean };

// Ikke eksportert, så den blir ikke en server action som kan kalles utenfra.
async function fail(key: keyof Dictionary["tournaments"]["errors"]): Promise<ActionState> {
  return { error: (await getT()).tournaments.errors[key] };
}

async function currentTeam(tournamentId: string) {
  const user = await currentUser();
  if (!user) return { error: (await getT()).common.notLoggedIn } as const;
  const { data, error } = await supabaseAdmin()
    .from("tournament_members")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data?.team_id) return { error: (await getT()).tournaments.errors.mustBeOnTeam } as const;
  return { user, teamId: data.team_id } as const;
}

function parseScore(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 99 ? parsed : null;
}

function knockoutRows(
  tournament: Tournament,
  roundNumber: number,
  pairings: Pairing[],
) {
  const isFinal = pairings.length === 1;
  const legsInRound = isFinal ? 1 : tournament.legs_per_knockout_round;
  const now = new Date().toISOString();
  const rows = [];

  for (const [position, pairing] of pairings.entries()) {
    const tieId = randomUUID();

    if (pairing.awayTeamId === null) {
      rows.push({
        tournament_id: tournament.id,
        stage: "knockout",
        round_number: roundNumber,
        tie_id: tieId,
        tie_position: position,
        leg_number: 1,
        home_team_id: pairing.homeTeamId,
        away_team_id: null,
        is_bye: true,
        winner_team_id: pairing.homeTeamId,
        status: "confirmed",
        confirmed_at: now,
      });
      continue;
    }

    for (let leg = 1; leg <= legsInRound; leg += 1) {
      const swapHome = leg % 2 === 0;
      rows.push({
        tournament_id: tournament.id,
        stage: "knockout",
        round_number: roundNumber,
        tie_id: tieId,
        tie_position: position,
        leg_number: leg,
        home_team_id: swapHome ? pairing.awayTeamId : pairing.homeTeamId,
        away_team_id: swapHome ? pairing.homeTeamId : pairing.awayTeamId,
        is_bye: false,
        status: "scheduled",
      });
    }
  }

  return rows;
}

async function advanceTournament(tournamentId: string): Promise<void> {
  const db = supabaseAdmin();
  const tournament = await getTournament(tournamentId);
  if (!tournament) return;

  const matches = await listMatches(tournamentId);

  if (tournament.status === "league") {
    const leagueMatches = matches.filter((match) => match.stage === "league");
    if (
      leagueMatches.length === 0 ||
      !leagueMatches.every((match) => match.status === "confirmed")
    ) {
      return;
    }

    const teams = (await listTeams(tournamentId)).filter(
      (team): team is typeof team & { name: string } => Boolean(team.name),
    );
    const standings = computeStandings(teams, leagueMatches, tournament.type);
    const qualified = standings
      .slice(0, knockoutCutoff(teams.length))
      .map((row) => row.teamId);

    const rows = knockoutRows(
      tournament,
      1,
      generateFirstKnockoutRound(qualified),
    );
    if (rows.length === 0) return;

    await db.from("matches").insert(rows);
    await db.from("tournaments").update({ status: "knockout" }).eq("id", tournamentId);
    return;
  }

  if (tournament.status !== "knockout") return;

  const knockoutMatches = matches.filter((match) => match.stage === "knockout");
  if (knockoutMatches.length === 0) return;

  const currentRound = Math.max(
    ...knockoutMatches.map((match) => match.round_number),
  );
  const roundMatches = knockoutMatches.filter(
    (match) => match.round_number === currentRound,
  );

  const ties = new Map<string, Match[]>();
  for (const match of roundMatches) {
    const key = match.tie_id ?? match.id;
    ties.set(key, [...(ties.get(key) ?? []), match]);
  }

  const orderedTies = [...ties.values()].sort(
    (a, b) => a[0].tie_position - b[0].tie_position,
  );

  const winners: string[] = [];
  const extraLegs = [];
  let roundComplete = true;

  for (const legs of orderedTies) {
    const state = resolveTie(legs, tournament.type);

    if (state.needsExtraLeg && legs.length === 2) {
      roundComplete = false;
      const first = legs[0];
      extraLegs.push({
        tournament_id: tournamentId,
        stage: "knockout",
        round_number: currentRound,
        tie_id: first.tie_id,
        tie_position: first.tie_position,
        leg_number: 3,
        home_team_id: first.home_team_id,
        away_team_id: first.away_team_id,
        is_bye: false,
        status: "scheduled",
      });
      continue;
    }

    if (!state.decided || !state.winnerTeamId) {
      roundComplete = false;
      continue;
    }

    winners.push(state.winnerTeamId);
  }

  if (extraLegs.length > 0) {
    await db.from("matches").insert(extraLegs);
  }
  if (!roundComplete) return;

  if (winners.length <= 1) {
    await db.from("tournaments").update({ status: "completed" }).eq("id", tournamentId);
    const final = roundMatches.sort((a, b) => b.leg_number - a.leg_number)[0];
    await awardTournamentPodium(tournamentId, winners[0] ?? final?.winner_team_id ?? null, final?.home_team_id === (winners[0] ?? final?.winner_team_id) ? final?.away_team_id : final?.home_team_id ?? null);
    return;
  }

  await db
    .from("matches")
    .insert(knockoutRows(tournament, currentRound + 1, pairWinners(winners)));
}

export async function createTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const maxTeams = Number(formData.get("max_teams"));
  const legs = Number(formData.get("legs"));
  const teamSize = Number(formData.get("team_size"));

  if (name.length < 2) return fail("nameTooShort");
  if (type !== "fifa" && type !== "nhl") return fail("chooseGame");
  if (!Number.isInteger(maxTeams) || maxTeams < 2 || maxTeams > 128) {
    return fail("maxTeamsRange");
  }
  if (legs !== 1 && legs !== 2) {
    return fail("chooseLegs");
  }
  if (teamSize !== 1 && teamSize !== 2) return fail("chooseTeamSize");

  const { data, error } = await supabaseAdmin()
    .from("tournaments")
    .insert({
      name,
      type,
      max_teams: maxTeams,
      legs_per_knockout_round: legs,
      owner_id: user.id,
      team_size: teamSize,
    })
    .select("id")
    .single();

  if (error || !data) return error ? { error: await dbErrorMessage(error) } : fail("createFailed");

  const slots = Array.from({ length: maxTeams }, () => ({ tournament_id: data.id }));
  const { error: slotsError } = await supabaseAdmin().from("teams").insert(slots);
  if (slotsError) return { error: await dbErrorMessage(slotsError) };

  revalidatePath("/turneringer");
  redirect(`/tournaments/${data.id}`);
}

export async function closeTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const tournament = await getTournament(tournamentId);
  if (!tournament) return fail("tournamentNotFound");
  if (!(await isTournamentOwner(tournamentId, user.id))) return fail("onlyOwnerClose");
  if (tournament.status !== "completed") {
    return fail("onlyCompletedClose");
  }

  const { error } = await supabaseAdmin()
    .from("tournaments")
    .update({ closed: true })
    .eq("id", tournamentId);

  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath("/turneringer");
  return { ok: true };
}

export async function renameTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const user = await requireUser();
  if (name.length < 2 || name.length > 60) return fail("nameLength");
  if (!(await isTournamentOwner(tournamentId, user.id))) return fail("onlyOwnerRename");
  const { error } = await supabaseAdmin().from("tournaments").update({ name }).eq("id", tournamentId);
  if (error) return { error: await dbErrorMessage(error) };
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/turneringer");
  return { ok: true };
}

export async function deleteTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const tournament = await getTournament(tournamentId);
  if (!tournament) return fail("tournamentNotFound");
  if (!(await isTournamentOwner(tournamentId, user.id))) {
    return fail("onlyOwnerDelete");
  }

  const { error } = await supabaseAdmin()
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);
  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath("/turneringer");
  redirect("/turneringer");
}

export async function renewInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const user = await requireUser();
  if (!(await isTournamentOwner(tournamentId, user.id))) return fail("onlyOwnerRenew");
  const inviteCode = Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]).join("");
  const { error } = await supabaseAdmin().from("tournaments").update({ invite_token: randomUUID(), invite_code: inviteCode }).eq("id", tournamentId);
  if (error) return { error: await dbErrorMessage(error) };
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function removeParticipantAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const user = await requireUser();
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== "registration") return fail("cannotRemoveAfterStart");
  if (!(await isTournamentOwner(tournamentId, user.id))) return fail("onlyOwnerRemove");
  if (memberId === user.id) return fail("ownerCannotRemoveSelf");
  const { data: member } = await supabaseAdmin().from("tournament_members").select("team_id").eq("tournament_id", tournamentId).eq("user_id", memberId).maybeSingle();
  if (!member) return fail("participantNotFound");
  await supabaseAdmin().from("tournament_members").delete().eq("tournament_id", tournamentId).eq("user_id", memberId);
  if (member.team_id) await supabaseAdmin().from("teams").update({ name: null }).eq("id", member.team_id);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function joinTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const inviteToken = String(formData.get("invite_token") ?? "");
  const user = await requireUser();

  const tournament = await getTournament(tournamentId);
  if (!tournament) return fail("tournamentNotFound");
  if (tournament.status !== "registration") {
    return fail("registrationClosed");
  }
  if (tournament.owner_id !== user.id && tournament.invite_token !== inviteToken) {
    return fail("invalidInvite");
  }

  const { error } = await supabaseAdmin().from("tournament_members").upsert(
    { tournament_id: tournamentId, user_id: user.id },
    { onConflict: "tournament_id,user_id", ignoreDuplicates: true },
  );

  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}`);
}

export async function chooseTeamAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const user = await requireUser();
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== "registration") return fail("registrationClosed");

  const { data: member } = await supabaseAdmin().from("tournament_members")
    .select("team_id").eq("tournament_id", tournamentId).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("joinBeforeTeam");
  if (member.team_id) return fail("alreadyOnTeam");

  const { data: team } = await supabaseAdmin().from("teams")
    .select("id, tournament_id").eq("id", teamId).maybeSingle();
  if (!team || team.tournament_id !== tournamentId) return fail("slotNotFound");
  const { count } = await supabaseAdmin().from("tournament_members")
    .select("user_id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) >= tournament.team_size) return fail("teamFull");

  const { error } = await supabaseAdmin().from("tournament_members")
    .update({ team_id: teamId }).eq("tournament_id", tournamentId).eq("user_id", user.id);
  if (error) return { error: await dbErrorMessage(error) };
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function setTeamNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 32) return fail("teamNameLength");
  const access = await currentTeam(tournamentId);
  if ("error" in access) return { error: access.error };
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== "registration") return fail("registrationClosed");
  const { count } = await supabaseAdmin().from("tournament_members")
    .select("user_id", { count: "exact", head: true }).eq("team_id", access.teamId);
  if (count !== tournament.team_size) return fail("waitForFullTeam");
  const { error } = await supabaseAdmin().from("teams").update({ name }).eq("id", access.teamId);
  if (error) return fail("teamNameTaken");
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function leaveTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const user = await requireUser();
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== "registration") return fail("cannotLeaveAfterStart");
  const { data: member } = await supabaseAdmin().from("tournament_members").select("team_id").eq("tournament_id", tournamentId).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("notInTournament");
  if (tournament.owner_id === user.id) {
    await supabaseAdmin().from("tournament_members").update({ team_id: null }).eq("tournament_id", tournamentId).eq("user_id", user.id);
  } else {
    await supabaseAdmin().from("tournament_members").delete().eq("tournament_id", tournamentId).eq("user_id", user.id);
  }
  if (member.team_id) {
    const { count } = await supabaseAdmin().from("tournament_members").select("user_id", { count: "exact", head: true }).eq("team_id", member.team_id);
    if ((count ?? 0) < tournament.team_size) await supabaseAdmin().from("teams").update({ name: null }).eq("id", member.team_id);
  }
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function lockRegistrationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const user = await requireUser();

  const tournament = await getTournament(tournamentId);
  if (!tournament) return fail("tournamentNotFound");
  if (!(await isTournamentOwner(tournamentId, user.id))) return fail("onlyOwnerStart");
  if (tournament.status !== "registration") {
    return fail("registrationAlreadyClosed");
  }

  const teams = (await listTeams(tournamentId)).filter((team) => team.name);
  if (teams.length < 2) return fail("needTwoTeams");

  const now = new Date().toISOString();
  const rows = generateRoundRobin(teams.map((team) => team.id)).flatMap(
    (pairings, roundIndex) =>
      pairings.map((pairing, position) => ({
        tournament_id: tournamentId,
        stage: "league",
        round_number: roundIndex + 1,
        tie_position: position,
        leg_number: 1,
        home_team_id: pairing.homeTeamId,
        away_team_id: pairing.awayTeamId,
        is_bye: pairing.awayTeamId === null,
        status: pairing.awayTeamId === null ? "confirmed" : "scheduled",
        confirmed_at: pairing.awayTeamId === null ? now : null,
      })),
  );

  const db = supabaseAdmin();
  const insert = await db.from("matches").insert(rows);
  if (insert.error) return { error: await dbErrorMessage(insert.error) };

  const update = await db
    .from("tournaments")
    .update({ status: "league" })
    .eq("id", tournamentId);
  if (update.error) return { error: await dbErrorMessage(update.error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function submitResultAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = String(formData.get("match_id") ?? "");

  const homeScore = parseScore(formData.get("home_score"));
  const awayScore = parseScore(formData.get("away_score"));
  if (homeScore === null || awayScore === null) {
    return fail("scoresRequired");
  }

  const match = await getMatch(matchId);
  if (!match) return fail("matchNotFound");
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.is_bye) return fail("teamHasBye");
  if (match.status === "confirmed") {
    return fail("alreadyConfirmed");
  }
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return fail("onlyPlayersSubmit");
  }

  const tournament = await getTournament(match.tournament_id);
  if (!tournament) return fail("tournamentNotFound");

  const allMatches = await listMatches(match.tournament_id);
  const tieLegs = match.tie_id
    ? allMatches.filter((row) => row.tie_id === match.tie_id)
    : [match];

  if (
    tieLegs.some(
      (leg) => leg.leg_number < match.leg_number && leg.status !== "confirmed",
    )
  ) {
    return fail("previousLegFirst");
  }

  let winnerTeamId: string | null = null;
  let resultType: string | null = null;
  let penaltyHome: number | null = null;
  let penaltyAway: number | null = null;

  if (tournament.type === "nhl") {
    if (homeScore === awayScore) {
      return fail("nhlNoDraw");
    }
    const submittedType = String(formData.get("result_type") ?? "");
    if (submittedType !== "regulation" && submittedType !== "ot_so") {
      return fail("chooseResultType");
    }
    resultType = submittedType;
    winnerTeamId =
      homeScore > awayScore ? match.home_team_id : match.away_team_id;
  } else if (match.stage === "league") {
    winnerTeamId =
      homeScore > awayScore
        ? match.home_team_id
        : awayScore > homeScore
          ? match.away_team_id
          : null;
  } else {
    const lastLeg = Math.max(...tieLegs.map((leg) => leg.leg_number));

    if (match.leg_number < lastLeg) {
      winnerTeamId =
        homeScore > awayScore
          ? match.home_team_id
          : awayScore > homeScore
            ? match.away_team_id
            : null;
    } else {
      const totals = new Map<string, number>();
      const add = (id: string | null, goals: number) => {
        if (id) totals.set(id, (totals.get(id) ?? 0) + goals);
      };

      for (const leg of tieLegs) {
        if (leg.id === match.id) {
          add(match.home_team_id, homeScore);
          add(match.away_team_id, awayScore);
        } else {
          add(leg.home_team_id, leg.home_score ?? 0);
          add(leg.away_team_id, leg.away_score ?? 0);
        }
      }

      const homeTotal = totals.get(match.home_team_id ?? "") ?? 0;
      const awayTotal = totals.get(match.away_team_id ?? "") ?? 0;

      if (homeTotal > awayTotal) {
        winnerTeamId = match.home_team_id;
      } else if (awayTotal > homeTotal) {
        winnerTeamId = match.away_team_id;
      } else {
        const ph = parseScore(formData.get("penalty_home"));
        const pa = parseScore(formData.get("penalty_away"));
        if (ph === null || pa === null || ph === pa) {
          return fail("penaltiesRequired");
        }
        penaltyHome = ph;
        penaltyAway = pa;
        resultType = "et_pens";
        winnerTeamId = ph > pa ? match.home_team_id : match.away_team_id;
      }
    }
  }

  const { error } = await supabaseAdmin()
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      result_type: resultType,
      penalty_home_score: penaltyHome,
      penalty_away_score: penaltyAway,
      winner_team_id: winnerTeamId,
      submitted_by_team_id: teamId,
      status: "pending_confirmation",
      confirmed_at: null,
    })
    .eq("id", matchId);

  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}/matches/${matchId}`);
  return { ok: true };
}

export async function confirmResultAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = String(formData.get("match_id") ?? "");

  const match = await getMatch(matchId);
  if (!match) return fail("matchNotFound");
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.status !== "pending_confirmation") {
    return fail("noPendingResult");
  }
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return fail("onlyPlayersConfirm");
  }
  if (match.submitted_by_team_id === teamId) {
    return fail("opponentMustConfirm");
  }

  const { error } = await supabaseAdmin()
    .from("matches")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) return { error: await dbErrorMessage(error) };

  await awardTournamentMatch(match);

  await advanceTournament(match.tournament_id);

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}/matches/${matchId}`);

  const after = await getTournament(match.tournament_id);
  if (after?.status === "completed") {
    redirect(`/tournaments/${match.tournament_id}`);
  }

  return { ok: true };
}

export async function submitClipAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = String(formData.get("match_id") ?? "");
  const videoUrl = String(formData.get("video_url") ?? "").trim();

  if (!isHttpUrl(videoUrl)) {
    return fail("invalidLink");
  }

  const match = await getMatch(matchId);
  if (!match) return fail("matchNotFound");
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.is_bye) return fail("matchNotPlayed");
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return fail("onlyPlayersClip");
  }

  const { error } = await supabaseAdmin()
    .from("goal_clips")
    .upsert(
      { match_id: matchId, team_id: teamId, video_url: videoUrl },
      { onConflict: "match_id,team_id" },
    );

  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}/matches/${matchId}`);
  redirect(`/tournaments/${match.tournament_id}`);
}

export async function voteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clipId = String(formData.get("clip_id") ?? "");
  const user = await requireUser();
  const db = supabaseAdmin();

  const { data: clip, error: clipError } = await db
    .from("goal_clips")
    .select("id, match_id")
    .eq("id", clipId)
    .maybeSingle();

  if (clipError) return { error: await dbErrorMessage(clipError) };
  if (!clip) return fail("clipNotFound");

  const match = await getMatch(clip.match_id);
  if (!match) return fail("matchNotFound");
  const { data: membership } = await db.from("tournament_members").select("user_id").eq("tournament_id", match.tournament_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return fail("mustBeMemberToVote");

  const { error } = await db.from("votes").upsert(
    {
      tournament_id: match.tournament_id,
      stage: match.stage,
      round_number: match.round_number,
      goal_clip_id: clipId,
      voter_id: user.id,
    },
    { onConflict: "tournament_id,stage,round_number,voter_id" },
  );

  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}/matches/${match.id}`);
  return { ok: true };
}
