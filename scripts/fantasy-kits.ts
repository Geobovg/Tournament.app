// Henter draktene til fantasy-klubbene fra TheSportsDB: den nyeste hjemmedrakten og
// keeperdrakten for hver klubb, til og med gjeldende sesong. Kjøres med `npm run fantasy:kits`.
// Krever en premium-nøkkel i THESPORTSDB_API_KEY i .env.local: v2-API-et gir alle draktene,
// mens v1 stopper på 100 (de eldste) og gratisnøkkelen bare gir to.
//
//   --force   hent på nytt også for klubber som allerede har drakt.
//
// Bildene lagres som public/fantasy-kits/<klubb>-home.png og <klubb>-gk.png (256 × 256), og
// lista over filene skrives til src/lib/fantasy/fantasy-kit-files.ts.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { normalizeName } from "../src/lib/fantasy/matching.ts";
import { kitSlug } from "../src/lib/fantasy/kits.ts";

const OUT_DIR = "public/fantasy-kits";
const LIST_FILE = "src/lib/fantasy/fantasy-kit-files.ts";
// Premium-nøkkelen tåler 100 forespørsler i minuttet.
const DELAY_MS = 700;
const COUNTRIES: Record<string, string[]> = { premier_league: ["England"], la_liga: ["Spain"], serie_a: ["Italy"], bundesliga: ["Germany"], ligue_1: ["France", "Monaco"] };
// Klubber som ikke finnes på navnet vårt eller API-Football-navnet: navnet hos TheSportsDB.
const SEARCH_NAMES: Record<string, string> = {
  "Athletic Club": "Athletic Bilbao",
  "Bayern München": "Bayern Munich",
  "Paris Saint-Germain": "Paris",
  "Brighton & Hove Albion": "Brighton",
  "Deportivo La Coruña": "Deportivo",
  "1. FC Köln": "Koln",
  "Hamburger SV": "Hamburg",
  "SV Elversberg": "Elversberg",
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Mangler ${name} i .env.local`);
  return value;
}

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const key = required("THESPORTSDB_API_KEY");

async function api<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await sleep(DELAY_MS);
    const response = await fetch(`https://www.thesportsdb.com/api/v2/json/${path}`, { headers: { "X-API-KEY": key } });
    if (response.status === 429 && attempt < 5) {
      console.log("  For mange forespørsler, venter ett minutt …");
      await sleep(60_000);
      continue;
    }
    if (!response.ok) throw new Error(`TheSportsDB svarte ${response.status} for ${path}`);
    return (await response.json()) as T;
  }
}

type Team = { idTeam: number; strTeam: string; strSport: string; strCountry: string | null; strGender: string | null };
type Equipment = { strSeason: string; strType: string; strEquipment: string | null };

const NOISE = new Set(["fc", "cf", "sc", "ac", "as", "afc", "ssc", "club", "de", "the", "and", "1", "04", "05", "07", "29", "1899"]);
const tokens = (name: string) => normalizeName(name.replace(/&/g, " and ")).split(" ").filter((token) => token && !NOISE.has(token));

// Kvinnelag, rekrutt-, ungdoms- og akademilag har ofte samme navn og står først i søket.
const OTHER_SQUAD = /\b(women|ii|b|youth|academy|juvenil|u\d+)\b/;

async function findTeam(names: string[], countries: readonly string[]) {
  const exact = new Set(names.map(normalizeName));
  const wanted = new Set(names.flatMap(tokens));
  for (const name of names) {
    const { search } = await api<{ search: Team[] | null }>(`search/team/${encodeURIComponent(normalizeName(name).replace(/ /g, "_"))}`);
    const candidates = (search ?? []).filter((candidate) => candidate.strSport === "Soccer" && candidate.strGender !== "Female"
      && countries.includes(candidate.strCountry ?? "") && !OTHER_SQUAD.test(normalizeName(candidate.strTeam)));
    // Helst samme navn («Paris» gir både Paris Saint-Germain og Paris FC), ellers et felles ord.
    const team = candidates.find((candidate) => exact.has(normalizeName(candidate.strTeam)))
      ?? candidates.find((candidate) => tokens(candidate.strTeam).some((token) => wanted.has(token)));
    if (team) return team;
  }
  return null;
}

// Den nyeste drakten av en type, men ikke nyere enn sesongen vi spiller. Sesongene skrives
// «2025-2026». TheSportsDB kaller hjemmedrakten «1st» (eldre: «Home») og keeperdrakten «4th».
function newest(equipment: Equipment[], types: readonly string[], latestSeason: string) {
  return equipment
    .filter((item) => item.strEquipment && item.strSeason && item.strSeason <= latestSeason && types.includes(item.strType.toLowerCase()))
    .sort((a, b) => b.strSeason.localeCompare(a.strSeason))[0] ?? null;
}

async function saveKit(url: string, file: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Klarte ikke å hente ${url} (${response.status})`);
  const output = await sharp(Buffer.from(await response.arrayBuffer()))
    .trim()
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  writeFileSync(file, output);
}

function writeList() {
  const files = readdirSync(OUT_DIR).filter((file) => file.endsWith(".png")).sort();
  writeFileSync(LIST_FILE, [
    "// Laget av scripts/fantasy-kits.ts – ikke rediger for hånd.",
    "// Draktbildene som finnes i public/fantasy-kits.",
    "export const FANTASY_KIT_FILES: ReadonlySet<string> = new Set([",
    ...files.map((file) => `  "${file}",`),
    "]);",
    "",
  ].join("\n"));
  return files.length;
}

const db = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const season = check(await db.from("fantasy_seasons").select("api_season").eq("is_current", true).single()).api_season as number;
const clubs = check(await db.from("football_season_teams").select("api_name, competition_code, football_clubs (name)").eq("api_season", season)) as unknown as { api_name: string; competition_code: string; football_clubs: { name: string } }[];
mkdirSync(OUT_DIR, { recursive: true });
const force = process.argv.includes("--force");
const latestSeason = `${season}-${season + 1}`;

const missing: string[] = [];
for (const club of clubs.sort((a, b) => a.football_clubs.name.localeCompare(b.football_clubs.name))) {
  const name = club.football_clubs.name;
  const slug = kitSlug(name);
  if (!force && existsSync(join(OUT_DIR, `${slug}-home.png`))) continue;
  const team = await findTeam([...new Set([SEARCH_NAMES[name], name, club.api_name].filter((value): value is string => Boolean(value)))], COUNTRIES[club.competition_code]);
  if (!team) {
    missing.push(`${name} (fant ikke klubben)`);
    continue;
  }
  const { lookup } = await api<{ lookup: Equipment[] | null }>(`lookup/team_equipment/${team.idTeam}`);
  const home = newest(lookup ?? [], ["1st", "home"], latestSeason);
  const keeper = newest(lookup ?? [], ["4th"], latestSeason);
  if (!home) {
    missing.push(`${name} (${team.strTeam} har ingen hjemmedrakt)`);
    continue;
  }
  await saveKit(home.strEquipment!, join(OUT_DIR, `${slug}-home.png`));
  if (keeper) await saveKit(keeper.strEquipment!, join(OUT_DIR, `${slug}-gk.png`));
  console.log(`${name} → ${team.strTeam}: hjemme ${home.strSeason}${keeper ? `, keeper ${keeper.strSeason}` : ", ingen keeperdrakt"}`);
}

if (missing.length) console.log(`\nUten drakt:\n  ${missing.join("\n  ")}`);
console.log(`\nFerdig: ${writeList()} draktbilder i ${OUT_DIR}.`);
