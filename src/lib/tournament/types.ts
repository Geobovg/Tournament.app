export type TournamentType = "fifa" | "nhl";
export type TournamentStatus =
  | "registration"
  | "league"
  | "knockout"
  | "completed";
export type MatchStage = "league" | "knockout";
export type MatchStatus = "scheduled" | "pending_confirmation" | "confirmed";
export type MatchResultType = "regulation" | "ot_so" | "et_pens";

export type Tournament = {
  id: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  max_teams: number;
  legs_per_knockout_round: number;
  created_at: string;
};

export type Team = {
  id: string;
  tournament_id: string;
  name: string;
  created_at: string;
};

export type Match = {
  id: string;
  tournament_id: string;
  stage: MatchStage;
  round_number: number;
  tie_id: string | null;
  tie_position: number;
  leg_number: number;
  home_team_id: string | null;
  away_team_id: string | null;
  is_bye: boolean;
  home_score: number | null;
  away_score: number | null;
  result_type: MatchResultType | null;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
  winner_team_id: string | null;
  submitted_by_team_id: string | null;
  status: MatchStatus;
  created_at: string;
  confirmed_at: string | null;
};

export type GoalClip = {
  id: string;
  match_id: string;
  team_id: string;
  video_url: string;
  created_at: string;
};

export type Vote = {
  id: string;
  tournament_id: string;
  stage: MatchStage;
  round_number: number;
  goal_clip_id: string;
  voter_id: string;
  created_at: string;
};
