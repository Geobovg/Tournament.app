// Henter draktene til fantasy-klubbene fra TheSportsDB: den nyeste hjemmedrakten og
// keeperdrakten for hver klubb, til og med gjeldende sesong. Kjøres med `npm run fantasy:kits`.
// Som i FPL skal alle draktene vises rett forfra. TheSportsDB har flere bilder per drakt, også
// skrå produktbilder og drakter som ligger flatt, så skriptet tar den nyeste drakten som er
// tatt rett forfra (se frontFacing), og går inntil to sesonger tilbake for å finne en.
// Krever en premium-nøkkel i THESPORTSDB_API_KEY i .env.local: v2-API-et gir alle draktene,
// mens v1 stopper på 100 (de eldste) og gratisnøkkelen bare gir to.
//
//   --force         hent på nytt også for klubber som allerede har drakt.
//   --from=<klubb>  start på klubben (alfabetisk), f.eks. for å fortsette etter en feil.
//
// Klubber uten keeperdrakt får hjemmedrakten farget om (se recolorForKeeper).
//
// Bildene lagres som public/fantasy-kits/<klubb>-home.png og <klubb>-gk.png (256 × 256), og
// lista over filene skrives til src/lib/fantasy/fantasy-kit-files.ts.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
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

// Draktene av en type, nyeste først, men ikke nyere enn sesongen vi spiller. Sesongene skrives
// «2025-2026». TheSportsDB kaller hjemmedrakten «1st» (eldre: «Home») og keeperdrakten «4th».
function candidates(equipment: Equipment[], types: readonly string[], latestSeason: string) {
  return equipment
    .filter((item) => item.strEquipment && item.strSeason && item.strSeason <= latestSeason && types.includes(item.strType.toLowerCase()))
    .sort((a, b) => b.strSeason.localeCompare(a.strSeason));
}

// Hvordan et draktbilde ser ut:
// - front: tatt rett forfra. Venstre og høyre halvdel er (nesten) speilbilder av hverandre, og
//   drakten er høyere enn den er bred. Skrå produktbilder er mindre symmetriske, og drakter som
//   ligger flatt med ermene rett ut er bredere enn de er høye.
// - transparent: uten bakgrunn (hjørnene er gjennomsiktige).
// - colors: andelen av drakten i hver av 64 fargegrupper, for å sammenligne farger.
const MIN_SYMMETRY = 0.9;
const MAX_ASPECT = 0.95;
async function analyze(image: Buffer) {
  const raw = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const corners = [[0, 0], [raw.info.width - 1, 0], [0, raw.info.height - 1], [raw.info.width - 1, raw.info.height - 1]];
  const transparent = corners.every(([x, y]) => raw.data[(y * raw.info.width + x) * 4 + 3] < 40);
  const { data, info } = await sharp(image).trim().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const colors = new Array<number>(64).fill(0);
  let same = 0;
  let filled = 0;
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const left = data[index + 3] > 40;
      const right = data[(y * width + (width - 1 - x)) * 4 + 3] > 40;
      if (left || right) {
        filled++;
        if (left === right) same++;
      }
      if (left) {
        opaque++;
        colors[(data[index] >> 6) * 16 + (data[index + 1] >> 6) * 4 + (data[index + 2] >> 6)]++;
      }
    }
  }
  return {
    front: filled > 0 && same / filled >= MIN_SYMMETRY && width / height <= MAX_ASPECT,
    transparent,
    colors: colors.map((count) => count / Math.max(opaque, 1)),
  };
}

// Hvor like fargene i to drakter er, fra 0 (helt ulike) til 1 (like).
const colorOverlap = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + Math.min(value, b[index]), 0);
const MIN_COLOR_OVERLAP = 0.45;

// Prøver fem ganger, siden forbindelsen til bildeserveren av og til brytes.
async function download(url: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Klarte ikke å hente ${url} (${response.status})`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 5) throw error;
      await sleep(5000 * attempt);
    }
  }
}

// Den nyeste drakten som er tatt rett forfra og uten bakgrunn, høyst to sesonger eldre enn den
// nyeste. Med sameColors må den også ha omtrent samme farger som den nyeste: TheSportsDB har
// av og til bortedrakter registrert som hjemmedrakt. Keeperdraktene skifter farge fra år til år,
// så der sjekkes ikke fargene. Finnes ingen rett forfra, brukes den nyeste uten bakgrunn.
async function bestKit(list: Equipment[], sameColors: boolean) {
  if (!list.length) return null;
  const oldest = `${Number(list[0].strSeason.slice(0, 4)) - 2}`;
  let fallback: { item: Equipment; image: Buffer; front: boolean } | null = null;
  let reference: number[] | null = null;
  for (const item of list) {
    if (item.strSeason < oldest) break;
    const image = await download(item.strEquipment!);
    const look = await analyze(image);
    reference ??= look.colors;
    if (!look.transparent || (sameColors && colorOverlap(look.colors, reference) < MIN_COLOR_OVERLAP)) continue;
    if (look.front) return { item, image, front: true };
    fallback ??= { item, image, front: false };
  }
  return fallback ?? { item: list[0], image: await download(list[0].strEquipment!), front: false };
}

async function saveKit(image: Buffer, file: string) {
  const output = await sharp(image)
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
const from = process.argv.find((arg) => arg.startsWith("--from="))?.slice("--from=".length);
const latestSeason = `${season}-${season + 1}`;

const missing: string[] = [];
const notFront: string[] = [];
for (const club of clubs.sort((a, b) => a.football_clubs.name.localeCompare(b.football_clubs.name))) {
  const name = club.football_clubs.name;
  const slug = kitSlug(name);
  if (from && name.localeCompare(from) < 0) continue;
  if (!force && existsSync(join(OUT_DIR, `${slug}-home.png`))) continue;
  const team = await findTeam([...new Set([SEARCH_NAMES[name], name, club.api_name].filter((value): value is string => Boolean(value)))], COUNTRIES[club.competition_code]);
  if (!team) {
    missing.push(`${name} (fant ikke klubben)`);
    continue;
  }
  const { lookup } = await api<{ lookup: Equipment[] | null }>(`lookup/team_equipment/${team.idTeam}`);
  const home = await bestKit(candidates(lookup ?? [], ["1st", "home"], latestSeason), true);
  const keeper = await bestKit(candidates(lookup ?? [], ["4th"], latestSeason), false);
  if (!home) {
    missing.push(`${name} (${team.strTeam} har ingen hjemmedrakt)`);
    continue;
  }
  await saveKit(home.image, join(OUT_DIR, `${slug}-home.png`));
  if (keeper) await saveKit(keeper.image, join(OUT_DIR, `${slug}-gk.png`));
  // En gammel, omfarget keeperdrakt lages på nytt fra den nye hjemmedrakten nedenfor.
  else if (existsSync(join(OUT_DIR, `${slug}-gk.png`))) unlinkSync(join(OUT_DIR, `${slug}-gk.png`));
  for (const [label, kit] of [["hjemme", home], ["keeper", keeper]] as const) if (kit && !kit.front) notFront.push(`${name} (${label})`);
  console.log(`${name} → ${team.strTeam}: hjemme ${home.item.strSeason}${keeper ? `, keeper ${keeper.item.strSeason}` : ", ingen keeperdrakt"}`);
}

// Klubber uten keeperdrakt hos TheSportsDB: keeperen får hjemmedrakten farget om, så han skiller
// seg ut på banen som i FPL. Fargen er den av keeperfargene som er lengst unna hjemmedrakten.
const KEEPER_COLORS = [{ r: 160, g: 230, b: 40 }, { r: 255, g: 140, b: 0 }, { r: 240, g: 80, b: 170 }, { r: 30, g: 200, b: 210 }];
async function recolorForKeeper(homeFile: string, keeperFile: string) {
  const { data } = await sharp(homeFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sum = { r: 0, g: 0, b: 0, count: 0 };
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 40) continue;
    sum.r += data[index];
    sum.g += data[index + 1];
    sum.b += data[index + 2];
    sum.count++;
  }
  const mean = { r: sum.r / sum.count, g: sum.g / sum.count, b: sum.b / sum.count };
  const distance = (color: { r: number; g: number; b: number }) => (color.r - mean.r) ** 2 + (color.g - mean.g) ** 2 + (color.b - mean.b) ** 2;
  const color = KEEPER_COLORS.reduce((best, candidate) => (distance(candidate) > distance(best) ? candidate : best));
  // Omfargingen beholder hvor lys drakten er, så mørke drakter lysnes opp for å få en tydelig farge.
  const lightness = 0.299 * mean.r + 0.587 * mean.g + 0.114 * mean.b;
  const brightness = lightness < 110 ? 110 / Math.max(lightness, 40) : 1;
  writeFileSync(keeperFile, await sharp(homeFile).modulate({ brightness }).tint(color).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer());
}
const recolored: string[] = [];
for (const file of readdirSync(OUT_DIR).filter((name) => name.endsWith("-home.png"))) {
  const keeperFile = join(OUT_DIR, file.replace(/-home\.png$/, "-gk.png"));
  if (existsSync(keeperFile)) continue;
  await recolorForKeeper(join(OUT_DIR, file), keeperFile);
  recolored.push(file.replace(/-home\.png$/, ""));
}

if (recolored.length) console.log(`\nKeeperdrakt farget om fra hjemmedrakten:\n  ${recolored.join("\n  ")}`);
if (missing.length) console.log(`\nUten drakt:\n  ${missing.join("\n  ")}`);
if (notFront.length) console.log(`\nFant ingen drakt rett forfra (bruker den nyeste):\n  ${notFront.join("\n  ")}`);
console.log(`\nFerdig: ${writeList()} draktbilder i ${OUT_DIR}.`);
