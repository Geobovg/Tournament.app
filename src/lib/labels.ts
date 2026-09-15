import type { Match, TournamentStatus, TournamentType } from "./tournament/types";
import { roundLabel } from "./tournament/bracket";

export function typeLabel(type: TournamentType): string {
  return type === "fifa" ? "FIFA" : "NHL";
}

export function statusLabel(status: TournamentStatus): string {
  switch (status) {
    case "registration":
      return "Påmelding åpen";
    case "league":
      return "Ligaspill";
    case "knockout":
      return "Sluttspill";
    case "completed":
      return "Ferdig";
  }
}

export function matchStatusLabel(match: Match): string {
  if (match.is_bye) return "Fri runde";
  switch (match.status) {
    case "scheduled":
      return "Ikke spilt";
    case "pending_confirmation":
      return "Venter på bekreftelse";
    case "confirmed":
      return "Bekreftet";
  }
}

export function knockoutRoundLabel(tiesInRound: number): string {
  return roundLabel(tiesInRound * 2);
}

export function resultTypeLabel(match: Match): string | null {
  switch (match.result_type) {
    case "ot_so":
      return "Avgjort i OT/straffer";
    case "et_pens":
      return match.penalty_home_score !== null && match.penalty_away_score !== null
        ? `Straffer ${match.penalty_home_score}–${match.penalty_away_score}`
        : "Avgjort etter ekstraomganger";
    default:
      return null;
  }
}
