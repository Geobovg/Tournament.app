// Henter utklipp (bilder uten bakgrunn) fra TheSportsDB for fantasy-spillere som ikke har
// et utklipp fra managerkarrieren, så kortene viser overkroppen i stedet for API-Footballs
// tette ansiktsbilder. Kjøres med `npm run fantasy:cutouts`, eventuelt med valg:
//
//   --limit 200   bare så mange spillere denne gangen (de dyreste først). Standard: alle.
//   --retry       prøv også spillere som ikke ble funnet sist (lønner seg med premium-nøkkel,
//                 som gir alle søketreff i stedet for bare to).
//   --refresh     se etter nyere bilder for alle spillerne, også de som har bilde fra før.
//                 Kjør den f.eks. en gang i måneden: TheSportsDB får nye bilder utover sesongen.
//
// Når et bilde ble lastet opp til TheSportsDB står i filnavnet (et tidsstempel). Hvilken dag vi
// sist hentet bilde av hver spiller står i scripts/fantasy-cutouts-fetched.json, så --refresh
// bare laster ned bilder som er nyere enn det vi har. I Fantasy vises et hentet bilde foran
// bildet fra managerkarrieren (se fantasyPhoto i src/lib/fantasy/data.ts).
//
// Bildene lagres som public/fantasy-players/<api_player_id>.png (256 × 256), og lista over
// hvem som har bilde skrives til src/lib/fantasy/fantasy-cutouts.ts. Et treff godtas bare når
// både etternavnet og klubben stemmer, så vi ikke får bildet av en annen spiller.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { decodeApiText, normalizeName } from "../src/lib/fantasy/matching.ts";

const OUT_DIR = "public/fantasy-players";
const LIST_FILE = "src/lib/fantasy/fantasy-cutouts.ts";
const NOT_FOUND_FILE = join(tmpdir(), "fantasy-cutouts-not-found.json");
const FETCHED_FILE = "scripts/fantasy-cutouts-fetched.json";
// Dagene bildene som fantes før fantasy-cutouts-fetched.json ble hentet: managerkarrierens
// bilder 22. september 2026 og de første fantasy-utklippene 1. oktober 2026.
const CATALOG_FETCHED = "2026-09-22";
const FANTASY_FETCHED = "2026-10-01";
const CATALOG_DIR = "public/players";
// Med THESPORTSDB_API_KEY (premium) tåles 100 forespørsler i minuttet, med gratisnøkkelen rundt 30.
const API_KEY = process.env.THESPORTSDB_API_KEY ?? "123";
const SEARCH_DELAY_MS = process.env.THESPORTSDB_API_KEY ? 700 : 2100;

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

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

// Ord som ikke skiller klubber fra hverandre («FC», «United», «Real» …).
const CLUB_NOISE = new Set(["fc", "cf", "sc", "ac", "as", "afc", "ssc", "ss", "us", "rc", "club", "de", "la", "le", "the", "and", "of", "sv", "vfb", "vfl", "fsv", "tsg", "bv", "stade", "real", "united", "city", "town", "calcio", "hotspur", "wanderers", "albion", "hove", "1", "04", "05", "07", "29", "1899", "1846", "1907", "1909", "1910", "1913"]);

function clubTokens(name: string) {
  return normalizeName(name.replace(/&/g, " and ")).split(" ").filter((token) => token && !CLUB_NOISE.has(token));
}

// Kvinnelag, rekrutt- og ungdomslag har samme klubbnavn («Everton FC Women», «Liverpool U21»).
const OTHER_SQUAD = /\b(women|ii|b|youth|academy|juvenil|u\d+)\b/;

function sameClub(theirs: string, ours: readonly string[]) {
  if (OTHER_SQUAD.test(normalizeName(theirs))) return false;
  const their = new Set(clubTokens(theirs));
  return ours.some((name) => clubTokens(name).some((token) => their.has(token)));
}

function surnameMatches(theirName: string, lastNames: readonly string[]) {
  const their = new Set(normalizeName(theirName).split(" "));
  return lastNames.some((last) => normalizeName(last).split(" ").some((token) => token.length >= 3 && their.has(token)));
}

// Fornavnet må begynne på samme bokstav («O. Sissoko» er ikke «Teninsoun Sissoko»), med
// mindre en av dem bare har ett navn (Vitinha, Alti).
function firstNameMatches(theirName: string, firstInitials: ReadonlySet<string>) {
  const their = normalizeName(theirName).split(" ");
  return firstInitials.size === 0 || their.length === 1 || firstInitials.has(their[0][0]);
}

type Candidate = { strPlayer: string; strTeam: string | null; strSport: string; strCutout: string | null };

async function search(query: string): Promise<Candidate[]> {
  for (let attempt = 0; ; attempt++) {
    await sleep(SEARCH_DELAY_MS);
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php?p=${encodeURIComponent(query)}`);
    if (response.status === 429 && attempt < 5) {
      console.log("  For mange forespørsler, venter ett minutt …");
      await sleep(60_000);
      continue;
    }
    if (!response.ok) throw new Error(`TheSportsDB svarte ${response.status} for «${query}»`);
    const body = (await response.json()) as { player: Candidate[] | null };
    return (body.player ?? []).filter((player) => player.strSport === "Soccer");
  }
}

// Dagen bildet ble lastet opp til TheSportsDB, fra tidsstempelet i filnavnet («…nvp3jz1788606720.png»).
function uploadedOn(url: string) {
  const stamp = url.match(/(\d{10})\.(png|jpg|jpeg|webp)$/i);
  return stamp ? new Date(Number(stamp[1]) * 1000).toISOString().slice(0, 10) : null;
}

async function saveCutout(url: string, file: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Klarte ikke å hente ${url} (${response.status})`);
  const input = Buffer.from(await response.arrayBuffer());
  // Som utklippene i managerkarrieren: 256 × 256, gjennomsiktig, spilleren står nederst.
  const output = await sharp(input)
    .trim()
    .resize(256, 256, { fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  writeFileSync(file, output);
}

function writeList() {
  const ids = readdirSync(OUT_DIR).filter((file) => file.endsWith(".png")).map((file) => Number(file.replace(".png", ""))).filter(Number.isInteger).sort((a, b) => a - b);
  const lines: string[] = [];
  for (let index = 0; index < ids.length; index += 12) lines.push(`  ${ids.slice(index, index + 12).join(", ")},`);
  writeFileSync(LIST_FILE, [
    "// Laget av scripts/fantasy-cutouts.ts – ikke rediger for hånd.",
    "// API-Football-id-ene til spillerne som har et utklipp i public/fantasy-players.",
    "export const FANTASY_CUTOUT_IDS: ReadonlySet<number> = new Set([",
    ...lines,
    "]);",
    "",
  ].join("\n"));
  return ids.length;
}

type Row = {
  api_player_id: number;
  price: number;
  api_team_id: number;
  football_players: { name: string; first_name: string | null; last_name: string | null; player_catalog: { name: string; slug: string } | null };
  football_season_teams: { api_name: string; football_clubs: { name: string } };
};

const db = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const season = check(await db.from("fantasy_seasons").select("api_season").eq("is_current", true).single()).api_season as number;
const rows: Row[] = [];
for (let offset = 0; ; offset += 1000) {
  const page = check(await db
    .from("football_season_players")
    .select("api_player_id, price, api_team_id, football_players (name, first_name, last_name, player_catalog (name, slug)), football_season_teams (api_name, football_clubs (name))")
    .eq("api_season", season)
    .order("price", { ascending: false })
    .order("api_player_id")
    .range(offset, offset + 999)) as unknown as Row[];
  rows.push(...page);
  if (page.length < 1000) break;
}

mkdirSync(OUT_DIR, { recursive: true });
const catalogPhotos = new Set(readdirSync(CATALOG_DIR).map((file) => file.replace(".png", "")));
const refresh = process.argv.includes("--refresh");
const notFound = new Set<number>(existsSync(NOT_FOUND_FILE) && !process.argv.includes("--retry") && !refresh ? JSON.parse(readFileSync(NOT_FOUND_FILE, "utf8")) : []);
const fetched: Record<string, string> = existsSync(FETCHED_FILE) ? JSON.parse(readFileSync(FETCHED_FILE, "utf8")) : {};
const hasCatalogPhoto = (row: Row) => Boolean(row.football_players.player_catalog?.slug && catalogPhotos.has(row.football_players.player_catalog.slug));
// Dagen vi sist hentet bilde av spilleren, eller null når han ikke har bilde.
const lastFetched = (row: Row) => fetched[row.api_player_id] ?? (existsSync(join(OUT_DIR, `${row.api_player_id}.png`)) ? FANTASY_FETCHED : hasCatalogPhoto(row) ? CATALOG_FETCHED : null);
const todo = rows.filter((row) => refresh || (lastFetched(row) === null && !notFound.has(row.api_player_id))).slice(0, Number(option("limit") ?? Infinity));

console.log(`${todo.length} spillere å ${refresh ? "se etter nyere bilder for" : "lete etter"} (sesong ${season}).`);
let found = 0;
let unchanged = 0;
for (const [index, row] of todo.entries()) {
  const player = row.football_players;
  const name = decodeApiText(player.name);
  const first = player.first_name ? decodeApiText(player.first_name).split(" ")[0] : null;
  const last = player.last_name ? decodeApiText(player.last_name) : null;
  // API-navnet er ofte forkortet («P. Aubameyang»), så katalognavnet og fullt navn prøves først.
  const queries = [...new Set([
    player.player_catalog?.name,
    first && last ? `${first} ${last}` : null,
    last,
    name.includes(".") ? null : name,
  ].filter((query): query is string => Boolean(query)).map((query) => normalizeName(query)))];
  const lastNames = [last, name.split(" ").at(-1), player.player_catalog?.name.split(" ").at(-1)].filter((value): value is string => Boolean(value));
  // Forbokstavene i alle fornavnene vi kjenner: «P. Højbjerg», «Pierre-Emile», katalognavnet.
  // Navn med ett ord (Antony, Dodô) gir ingen, og da sjekkes ikke fornavnet.
  const fullNames = [name, player.player_catalog?.name].filter((value): value is string => Boolean(value) && value.trim().includes(" "));
  const firstInitials = new Set([...fullNames.map((value) => normalizeName(value)[0]), ...(player.first_name ? normalizeName(decodeApiText(player.first_name)).split(" ").map((token) => token[0]) : [])].filter(Boolean));
  const clubs = [row.football_season_teams.football_clubs.name, row.football_season_teams.api_name];

  let match: Candidate | undefined;
  for (const query of queries) {
    match = (await search(query)).find((candidate) => candidate.strCutout && candidate.strTeam && sameClub(candidate.strTeam, clubs)
      && surnameMatches(candidate.strPlayer, lastNames) && firstNameMatches(candidate.strPlayer, firstInitials));
    if (match) break;
  }
  const label = `[${index + 1}/${todo.length}] ${name} (${clubs[0]})`;
  if (!match) {
    if (!refresh) {
      notFound.add(row.api_player_id);
      writeFileSync(NOT_FOUND_FILE, JSON.stringify([...notFound]));
    }
    console.log(`${label}: ikke funnet`);
    continue;
  }
  // Bildet er ikke nyere enn det vi har (samme dag eller før vi sist hentet).
  const uploaded = uploadedOn(match.strCutout!);
  const previous = lastFetched(row);
  if (previous && (!uploaded || uploaded <= previous)) {
    unchanged++;
    continue;
  }
  try {
    await saveCutout(match.strCutout!, join(OUT_DIR, `${row.api_player_id}.png`));
    fetched[row.api_player_id] = new Date().toISOString().slice(0, 10);
    writeFileSync(FETCHED_FILE, `${JSON.stringify(fetched, null, 2)}\n`);
    found++;
    console.log(`${label}: ${match.strPlayer} – ${match.strTeam} (${row.api_player_id})${previous ? `, nytt bilde fra ${uploaded}` : ""}`);
  } catch (error) {
    console.log(`${label}: ${(error as Error).message}`);
  }
}

console.log(`Ferdig: ${found} nye utklipp${refresh ? `, ${unchanged} hadde allerede det nyeste bildet` : ""}. ${writeList()} spillere har nå utklipp i ${OUT_DIR}.`);
