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
  /** Erstatter det prosedyregenererte merket med et ekte logobilde når satt. */
  logoUrl?: string;
};

export type PoseName = "defend" | "defendStick";

export type ShirtSpec = {
  name: string;
  number: string;
  body: string;
  stripe?: string;
  sleeve?: string;
  collar?: string;
};

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
  kits: ShirtSpec[];
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
  { name: "Real Madrid", initials: "RM", shape: "circle", pattern: "ring", colors: ["#f2f2f2", "#5b3fa0", "#e2bb52"], logoUrl: "/crests/real-madrid.png" },
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
    kits: [
      { name: "Haaland", number: "9", body: "#ba0c2f", collar: "#ffffff" },
      { name: "Mbappé", number: "9", body: "#f4f4f4", collar: "#1b2a4a" },
      { name: "Yamal", number: "10", body: "#a50044", stripe: "#004d98", collar: "#edbb00" },
      { name: "Raphinha", number: "11", body: "#a50044", stripe: "#004d98", collar: "#edbb00" },
      { name: "Ødegaard", number: "8", body: "#ef0107", sleeve: "#ffffff", collar: "#ffffff" },
      { name: "Messi", number: "10", body: "#ffffff", stripe: "#75aadb", collar: "#75aadb" },
      { name: "Maguire", number: "5", body: "#da291c", collar: "#111111" },
      { name: "Martínez", number: "1", body: "#14654a", collar: "#f2f2f0" },
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
    kits: [
      { name: "Gretzky", number: "99", body: "#041e42", sleeve: "#ff4c00", collar: "#ff4c00" },
      { name: "McDavid", number: "97", body: "#ff4c00", collar: "#041e42" },
      { name: "Crosby", number: "87", body: "#1a1a1a", collar: "#fcb514" },
      { name: "Ovechkin", number: "8", body: "#c8102e", sleeve: "#ffffff", collar: "#ffffff" },
      { name: "Matthews", number: "34", body: "#00205b", collar: "#ffffff" },
      { name: "Hughes", number: "43", body: "#154734", collar: "#eaaa00" },
      { name: "Lemieux", number: "66", body: "#fcb514", collar: "#1a1a1a" },
      { name: "Roy", number: "33", body: "#af1e2d", sleeve: "#192168", collar: "#ffffff" },
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
