import type { Dictionary } from "@/i18n/dictionaries";
import type { Match, TournamentStatus, TournamentType } from "./tournament/types";
import { roundLabel } from "./tournament/bracket";

export function typeLabel(type: TournamentType): string {
  return type === "fifa" ? "FIFA" : "NHL";
}

export function statusLabel(status: TournamentStatus, t: Dictionary): string {
  return t.tournaments.status[status];
}

export function matchStatusLabel(match: Match, t: Dictionary): string {
  const labels = t.tournaments.matchStatus;
  if (match.is_bye) return labels.bye;
  switch (match.status) {
    case "scheduled":
      return labels.scheduled;
    case "pending_confirmation":
      return labels.pendingConfirmation;
    case "confirmed":
      return labels.confirmed;
  }
}

export function knockoutRoundLabel(tiesInRound: number, t: Dictionary): string {
  return roundLabel(tiesInRound * 2, t);
}

export function resultTypeLabel(match: Match, t: Dictionary): string | null {
  const labels = t.tournaments.resultType;
  switch (match.result_type) {
    case "ot_so":
      return labels.otSo;
    case "et_pens":
      return match.penalty_home_score !== null && match.penalty_away_score !== null
        ? labels.penalties(match.penalty_home_score, match.penalty_away_score)
        : labels.extraTime;
    default:
      return null;
  }
}
