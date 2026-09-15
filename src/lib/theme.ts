import type { TournamentType } from "./tournament/types";

export type CrestShape = "shield" | "circle";
export type CrestPattern =
  | "stripes"
  | "halves"
  | "bands"
  | "ring"
  | "solid"
  | "diagonal";

export type Crest = {
  name: string;
  initials: string;
  shape: CrestShape;
  pattern: CrestPattern;
  colors: [string, string, string];
};

export type PoseName =
  | "keeper"
  | "dribble"
  | "shoot"
  | "celebrate"
  | "stand"
  | "defend"
  | "goalie"
  | "skate"
  | "slapshot"
  | "celebrateStick"
  | "standStick"
  | "defendStick";

export type Kit = {
  jersey: string;
  shorts: string;
  socks: string;
  number: string;
};

export type FigureSpec = { pose: PoseName; kit: Kit; onMobile: boolean };

export type BoardAd = { brand: string; slogan: string };

export type TournamentTheme = {
  emoji: string;
  tagline: string;
  lineup: FigureSpec[];
  defender: FigureSpec;
  clubs: Crest[];
  featured: string[];
  boards: BoardAd[];
};

const boards: BoardAd[] = [
  { brand: "0S3", slogan: "Sukker er en følelse" },
  { brand: "KimJoneUn", slogan: "Vil du ha en mint?" },
  { brand: "Lutflo", slogan: "Fnyf" },
  { brand: "Rosa Parks", slogan: "No" },
];

const footballClubs: Crest[] = [
  { name: "Real Madrid", initials: "RM", shape: "circle", pattern: "ring", colors: ["#f2f2f2", "#5b3fa0", "#e2bb52"] },
  { name: "Barcelona", initials: "FCB", shape: "shield", pattern: "stripes", colors: ["#a50044", "#004d98", "#edbb00"] },
  { name: "Bayern München", initials: "FCB", shape: "circle", pattern: "ring", colors: ["#dc052d", "#ffffff", "#0066b2"] },
  { name: "Manchester City", initials: "MCFC", shape: "circle", pattern: "ring", colors: ["#6cabdd", "#ffffff", "#1c2c5b"] },
  { name: "Manchester United", initials: "MUFC", shape: "circle", pattern: "ring", colors: ["#da291c", "#fbe122", "#111111"] },
  { name: "Liverpool", initials: "LFC", shape: "shield", pattern: "solid", colors: ["#c8102e", "#f6eb61", "#00b2a9"] },
  { name: "Paris Saint-Germain", initials: "PSG", shape: "circle", pattern: "stripes", colors: ["#004170", "#da291c", "#ffffff"] },
  { name: "Juventus", initials: "JUV", shape: "shield", pattern: "stripes", colors: ["#111111", "#f5f5f5", "#d4af37"] },
  { name: "Roma", initials: "ASR", shape: "circle", pattern: "halves", colors: ["#8e1f2f", "#f0bc42", "#ffffff"] },
  { name: "Inter", initials: "INT", shape: "circle", pattern: "ring", colors: ["#0068a8", "#111111", "#d4af37"] },
  { name: "AC Milan", initials: "ACM", shape: "shield", pattern: "stripes", colors: ["#fb090b", "#111111", "#d4af37"] },
  { name: "Atlético Madrid", initials: "ATM", shape: "shield", pattern: "stripes", colors: ["#cb3524", "#ffffff", "#262e62"] },
  { name: "Borussia Dortmund", initials: "BVB", shape: "circle", pattern: "ring", colors: ["#fde100", "#111111", "#ffffff"] },
  { name: "Arsenal", initials: "AFC", shape: "shield", pattern: "solid", colors: ["#ef0107", "#ffffff", "#063672"] },
  { name: "Monaco", initials: "ASM", shape: "shield", pattern: "diagonal", colors: ["#cf0a2c", "#ffffff", "#111111"] },
  { name: "Como", initials: "COM", shape: "shield", pattern: "halves", colors: ["#0d47a1", "#ffffff", "#111111"] },
  { name: "Brasil", initials: "BRA", shape: "circle", pattern: "ring", colors: ["#ffdf00", "#009b3a", "#002776"] },
  { name: "Frankrike", initials: "FRA", shape: "shield", pattern: "stripes", colors: ["#002395", "#ffffff", "#ed2939"] },
  { name: "Spania", initials: "ESP", shape: "shield", pattern: "bands", colors: ["#aa151b", "#f1bf00", "#ffffff"] },
];

const hockeyClubs: Crest[] = [
  { name: "Toronto Maple Leafs", initials: "TOR", shape: "shield", pattern: "solid", colors: ["#00205b", "#ffffff", "#ffffff"] },
  { name: "Detroit Red Wings", initials: "DET", shape: "circle", pattern: "ring", colors: ["#ce1126", "#ffffff", "#ce1126"] },
  { name: "Boston Bruins", initials: "BOS", shape: "circle", pattern: "ring", colors: ["#111111", "#ffb81c", "#111111"] },
  { name: "New York Rangers", initials: "NYR", shape: "shield", pattern: "diagonal", colors: ["#0038a8", "#ffffff", "#ce1126"] },
  { name: "Edmonton Oilers", initials: "EDM", shape: "circle", pattern: "halves", colors: ["#041e42", "#ff4c00", "#ffffff"] },
  { name: "Pittsburgh Penguins", initials: "PIT", shape: "shield", pattern: "bands", colors: ["#111111", "#fcb514", "#ffffff"] },
  { name: "Colorado Avalanche", initials: "COL", shape: "circle", pattern: "ring", colors: ["#6f263d", "#236192", "#a2aaad"] },
  { name: "Minnesota Wild", initials: "MIN", shape: "circle", pattern: "ring", colors: ["#154734", "#a6192e", "#eaaa00"] },
  { name: "Montreal Canadiens", initials: "MTL", shape: "circle", pattern: "bands", colors: ["#af1e2d", "#192168", "#ffffff"] },
  { name: "Chicago Blackhawks", initials: "CHI", shape: "circle", pattern: "ring", colors: ["#cf0a2c", "#111111", "#ffffff"] },
  { name: "Tampa Bay Lightning", initials: "TBL", shape: "circle", pattern: "solid", colors: ["#002868", "#ffffff", "#ffffff"] },
  { name: "Vegas Golden Knights", initials: "VGK", shape: "shield", pattern: "solid", colors: ["#333f42", "#b4975a", "#c8102e"] },
  { name: "New Jersey Devils", initials: "NJD", shape: "shield", pattern: "halves", colors: ["#ce1126", "#111111", "#ffffff"] },
];

export const tournamentThemes: Record<TournamentType, TournamentTheme> = {
  fifa: {
    emoji: "⚽",
    tagline: "Flomlyset er på og gresset er klippet.",
    lineup: [
      { pose: "keeper", onMobile: true, kit: { jersey: "#c8ff3d", shorts: "#12271c", socks: "#c8ff3d", number: "1" } },
      { pose: "dribble", onMobile: false, kit: { jersey: "#6cabdd", shorts: "#f4f4f4", socks: "#6cabdd", number: "17" } },
      { pose: "shoot", onMobile: true, kit: { jersey: "#f4f4f4", shorts: "#f4f4f4", socks: "#1b2a4a", number: "9" } },
      { pose: "celebrate", onMobile: true, kit: { jersey: "#a50044", shorts: "#004d98", socks: "#a50044", number: "10" } },
      { pose: "stand", onMobile: false, kit: { jersey: "#ef0107", shorts: "#f4f4f4", socks: "#ef0107", number: "8" } },
    ],
    defender: {
      pose: "defend",
      onMobile: true,
      kit: { jersey: "#a50044", shorts: "#004d98", socks: "#a50044", number: "2" },
    },
    clubs: footballClubs,
    featured: [
      "Real Madrid",
      "Barcelona",
      "Bayern München",
      "Manchester City",
      "Manchester United",
      "Liverpool",
      "Paris Saint-Germain",
      "Juventus",
    ],
    boards,
  },
  nhl: {
    emoji: "🏒",
    tagline: "Isen er lagt og pucken er i spill.",
    lineup: [
      { pose: "goalie", onMobile: true, kit: { jersey: "#f4f4f4", shorts: "#00205b", socks: "#f4f4f4", number: "30" } },
      { pose: "skate", onMobile: false, kit: { jersey: "#ff4c00", shorts: "#041e42", socks: "#ff4c00", number: "97" } },
      { pose: "slapshot", onMobile: true, kit: { jersey: "#1a1a1a", shorts: "#fcb514", socks: "#1a1a1a", number: "87" } },
      { pose: "celebrateStick", onMobile: true, kit: { jersey: "#af1e2d", shorts: "#192168", socks: "#af1e2d", number: "9" } },
      { pose: "standStick", onMobile: false, kit: { jersey: "#00205b", shorts: "#f4f4f4", socks: "#00205b", number: "34" } },
    ],
    defender: {
      pose: "defendStick",
      onMobile: true,
      kit: { jersey: "#154734", shorts: "#eaaa00", socks: "#154734", number: "43" },
    },
    clubs: hockeyClubs,
    featured: [
      "Toronto Maple Leafs",
      "Detroit Red Wings",
      "Boston Bruins",
      "New York Rangers",
      "Edmonton Oilers",
      "Pittsburgh Penguins",
      "Colorado Avalanche",
      "Minnesota Wild",
    ],
    boards,
  },
};

export function featuredCrests(type: TournamentType): Crest[] {
  const theme = tournamentThemes[type];
  return theme.featured.flatMap(
    (name) => theme.clubs.find((club) => club.name === name) ?? [],
  );
}
