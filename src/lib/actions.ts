"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMatch, getTournament, listMatches, listTeams } from "./data";
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

export type ActionState = { error?: string; ok?: boolean };

async function currentTeam(tournamentId: string) {
  const user = await currentUser();
  if (!user) return { error: "Du må logge inn først" } as const;
  const { data, error } = await supabaseAdmin()
    .from("tournament_members")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data?.team_id) return { error: "Du må være med på et lag for å gjøre dette" } as const;
  return { user, teamId: data.team_id } as const;
}

export async function isTournamentOwner(tournamentId: string, userId: string) {
  const { data } = await supabaseAdmin()
    .from("tournaments")
    .select("id")
    .eq("id", tournamentId)
    .eq("owner_id", userId)
    .maybeSingle();
  return Boolean(data);
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

  if (name.length < 2) return { error: "Gi turneringen et navn (minst 2 tegn)" };
  if (type !== "fifa" && type !== "nhl") return { error: "Velg FIFA eller NHL" };
  if (!Number.isInteger(maxTeams) || maxTeams < 2 || maxTeams > 128) {
    return { error: "Maks antall lag må være mellom 2 og 128" };
  }
  if (legs !== 1 && legs !== 2) {
    return { error: "Velg 1 eller 2 kamper per sluttspillrunde" };
  }
  if (teamSize !== 1 && teamSize !== 2) return { error: "Velg enspiller eller double" };

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

  if (error || !data) return { error: error?.message ?? "Kunne ikke opprette turneringen" };

  const slots = Array.from({ length: maxTeams }, () => ({ tournament_id: data.id }));
  const { error: slotsError } = await supabaseAdmin().from("teams").insert(slots);
  if (slotsError) return { error: slotsError.message };

  revalidatePath("/");
  redirect(`/tournaments/${data.id}`);
}

export async function closeTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const tournament = await getTournament(tournamentId);
  if (!tournament) return { error: "Fant ikke turneringen" };
  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: "Bare arrangøren kan lukke turneringen" };
  if (tournament.status !== "completed") {
    return { error: "Bare ferdigspilte turneringer kan lukkes" };
  }

  const { error } = await supabaseAdmin()
    .from("tournaments")
    .update({ closed: true })
    .eq("id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function renameTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const user = await requireUser();
  if (name.length < 2 || name.length > 60) return { error: "Turneringsnavnet må være mellom 2 og 60 tegn" };
  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: "Bare arrangøren kan endre navnet" };
  const { error } = await supabaseAdmin().from("tournaments").update({ name }).eq("id", tournamentId);
  if (error) return { error: error.message };
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const tournament = await getTournament(tournamentId);
  if (!tournament) return { error: "Fant ikke turneringen" };
  if (!(await isTournamentOwner(tournamentId, user.id))) {
    return { error: "Bare arrangøren kan slette turneringen" };
  }

  const { error } = await supabaseAdmin()
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function renewInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const user = await requireUser();
  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: "Bare arrangøren kan fornye lenken" };
  const { error } = await supabaseAdmin().from("tournaments").update({ invite_token: randomUUID(), invite_code: randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase() }).eq("id", tournamentId);
  if (error) return { error: error.message };
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
  if (!tournament || tournament.status !== "registration") return { error: "Deltakere kan ikke fjernes etter turneringsstart" };
  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: "Bare arrangøren kan fjerne deltakere" };
  if (memberId === user.id) return { error: "Arrangøren kan ikke fjerne seg selv" };
  const { data: member } = await supabaseAdmin().from("tournament_members").select("team_id").eq("tournament_id", tournamentId).eq("user_id", memberId).maybeSingle();
  if (!member) return { error: "Fant ikke deltakeren" };
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
  if (!tournament) return { error: "Fant ikke turneringen" };
  if (tournament.status !== "registration") {
    return { error: "Påmeldingen er stengt" };
  }
  if (tournament.owner_id !== user.id && tournament.invite_token !== inviteToken) {
    return { error: "Denne invitasjonen er ikke gyldig" };
  }

  const { error } = await supabaseAdmin().from("tournament_members").upsert(
    { tournament_id: tournamentId, user_id: user.id },
    { onConflict: "tournament_id,user_id", ignoreDuplicates: true },
  );

  if (error) return { error: error.message };

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
  if (!tournament || tournament.status !== "registration") return { error: "Påmeldingen er stengt" };

  const { data: member } = await supabaseAdmin().from("tournament_members")
    .select("team_id").eq("tournament_id", tournamentId).eq("user_id", user.id).maybeSingle();
  if (!member) return { error: "Bli med i turneringen før du velger lag" };
  if (member.team_id) return { error: "Du er allerede på et lag i denne turneringen" };

  const { data: team } = await supabaseAdmin().from("teams")
    .select("id, tournament_id").eq("id", teamId).maybeSingle();
  if (!team || team.tournament_id !== tournamentId) return { error: "Fant ikke lagplassen" };
  const { count } = await supabaseAdmin().from("tournament_members")
    .select("user_id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) >= tournament.team_size) return { error: "Dette laget er allerede fullt" };

  const { error } = await supabaseAdmin().from("tournament_members")
    .update({ team_id: teamId }).eq("tournament_id", tournamentId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function setTeamNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 32) return { error: "Lagnavnet må være mellom 2 og 32 tegn" };
  const access = await currentTeam(tournamentId);
  if ("error" in access) return { error: access.error };
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== "registration") return { error: "Påmeldingen er stengt" };
  const { count } = await supabaseAdmin().from("tournament_members")
    .select("user_id", { count: "exact", head: true }).eq("team_id", access.teamId);
  if (count !== tournament.team_size) return { error: "Vent til laget er fullt før dere velger lagnavn" };
  const { error } = await supabaseAdmin().from("teams").update({ name }).eq("id", access.teamId);
  if (error) return { error: "Lagnavnet er allerede i bruk" };
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
  if (!tournament || tournament.status !== "registration") return { error: "Du kan ikke forlate turneringen etter start" };
  const { data: member } = await supabaseAdmin().from("tournament_members").select("team_id").eq("tournament_id", tournamentId).eq("user_id", user.id).maybeSingle();
  if (!member) return { error: "Du er ikke med i denne turneringen" };
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
  if (!tournament) return { error: "Fant ikke turneringen" };
  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: "Bare arrangøren kan starte turneringen" };
  if (tournament.status !== "registration") {
    return { error: "Påmeldingen er allerede stengt" };
  }

  const teams = (await listTeams(tournamentId)).filter((team) => team.name);
  if (teams.length < 2) return { error: "Det må være minst to lag med lagnavn før turneringen kan starte" };

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
  if (insert.error) return { error: insert.error.message };

  const update = await db
    .from("tournaments")
    .update({ status: "league" })
    .eq("id", tournamentId);
  if (update.error) return { error: update.error.message };

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
    return { error: "Fyll inn målscore for begge lag (0–99)" };
  }

  const match = await getMatch(matchId);
  if (!match) return { error: "Fant ikke kampen" };
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.is_bye) return { error: "Dette laget har fri denne runden" };
  if (match.status === "confirmed") {
    return { error: "Resultatet er allerede bekreftet" };
  }
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return { error: "Bare lagene som spiller kampen kan legge inn resultat" };
  }

  const tournament = await getTournament(match.tournament_id);
  if (!tournament) return { error: "Fant ikke turneringen" };

  const allMatches = await listMatches(match.tournament_id);
  const tieLegs = match.tie_id
    ? allMatches.filter((row) => row.tie_id === match.tie_id)
    : [match];

  if (
    tieLegs.some(
      (leg) => leg.leg_number < match.leg_number && leg.status !== "confirmed",
    )
  ) {
    return { error: "Tidligere kamp i duellen må bekreftes først" };
  }

  let winnerTeamId: string | null = null;
  let resultType: string | null = null;
  let penaltyHome: number | null = null;
  let penaltyAway: number | null = null;

  if (tournament.type === "nhl") {
    if (homeScore === awayScore) {
      return {
        error:
          "NHL-kamper kan ikke ende uavgjort – spill sudden death/straffer og legg inn sluttresultatet",
      };
    }
    const submittedType = String(formData.get("result_type") ?? "");
    if (submittedType !== "regulation" && submittedType !== "ot_so") {
      return { error: "Velg om kampen ble avgjort i ordinær tid eller i OT/straffer" };
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
          return {
            error:
              "Kampen/duellen står likt – legg inn resultatet fra straffekonkurransen (kan ikke ende likt)",
          };
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

  if (error) return { error: error.message };

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
  if (!match) return { error: "Fant ikke kampen" };
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.status !== "pending_confirmation") {
    return { error: "Det finnes ingen innsendt resultat å bekrefte" };
  }
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return { error: "Bare lagene som spiller kampen kan bekrefte resultatet" };
  }
  if (match.submitted_by_team_id === teamId) {
    return { error: "Motstanderen må bekrefte resultatet du la inn" };
  }

  const { error } = await supabaseAdmin()
    .from("matches")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) return { error: error.message };

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
    return { error: "Lim inn en gyldig lenke (må starte med http:// eller https://)" };
  }

  const match = await getMatch(matchId);
  if (!match) return { error: "Fant ikke kampen" };
  const access = await currentTeam(match.tournament_id);
  if ("error" in access) return { error: access.error };
  const teamId = access.teamId;
  if (match.is_bye) return { error: "Denne kampen ble ikke spilt" };
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return { error: "Bare lagene som spilte kampen kan legge inn målvideo" };
  }

  const { error } = await supabaseAdmin()
    .from("goal_clips")
    .upsert(
      { match_id: matchId, team_id: teamId, video_url: videoUrl },
      { onConflict: "match_id,team_id" },
    );

  if (error) return { error: error.message };

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

  if (clipError) return { error: clipError.message };
  if (!clip) return { error: "Fant ikke målklippet" };

  const match = await getMatch(clip.match_id);
  if (!match) return { error: "Fant ikke kampen" };
  const { data: membership } = await db.from("tournament_members").select("user_id").eq("tournament_id", match.tournament_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return { error: "Du må være med i turneringen for å stemme" };

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

  if (error) return { error: error.message };

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}/matches/${match.id}`);
  return { ok: true };
}
