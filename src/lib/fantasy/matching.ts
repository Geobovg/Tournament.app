// Kobler navn fra API-Football til klubbene og spillerne våre. Ingen importer, så
// fila kan brukes av skriptene i scripts/ også.

// Lagsnavn hos API-Football som skrives annerledes enn i player_catalog.club.
// Navn som er like etter normalizeName() trenger ikke stå her.
export const API_TEAM_ALIASES: Record<string, string> = {
  "Bournemouth": "AFC Bournemouth",
  "Brighton": "Brighton & Hove Albion",
  "Ipswich": "Ipswich Town",
  "Leicester": "Leicester City",
  "Newcastle": "Newcastle United",
  "Tottenham": "Tottenham Hotspur",
  "West Ham": "West Ham United",
  "Wolves": "Wolverhampton Wanderers",
  "Coventry": "Coventry City",
  "Leeds": "Leeds United",
  "Alaves": "Alavés",
  "Atletico Madrid": "Atlético Madrid",
  "Deportivo La Coruna": "Deportivo La Coruña",
  "Racing Santander": "Racing de Santander",
  "Oviedo": "Real Oviedo",
  "AS Roma": "Roma",
  "Verona": "Hellas Verona",
  "1899 Hoffenheim": "Hoffenheim",
  "1. FC Heidenheim": "Heidenheim",
  "FC Augsburg": "Augsburg",
  "FC Schalke 04": "Schalke 04",
  "FC St. Pauli": "St. Pauli",
  "FSV Mainz 05": "Mainz 05",
  "SC Freiburg": "Freiburg",
  "SC Paderborn 07": "Paderborn",
  "VfB Stuttgart": "Stuttgart",
  "VfL Wolfsburg": "Wolfsburg",
  "Paris Saint Germain": "Paris Saint-Germain",
  "Stade Brestois 29": "Brest",
  "Estac Troyes": "Troyes",
};

// API-Football sender noen tegn som HTML, f.eks. «O&apos;Riley».
export function decodeApiText(value: string) {
  return value.replace(/&apos;|&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// Små bokstaver, uten aksenter og tegn: «Atlético Madrid» blir «atletico madrid».
export function normalizeName(value: string) {
  return decodeApiText(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Finner klubben vår for et lag hos API-Football, eller null hvis vi ikke har den.
export function matchClubName(apiName: string, clubNames: readonly string[]) {
  const wanted = normalizeName(API_TEAM_ALIASES[apiName] ?? apiName);
  return clubNames.find((name) => normalizeName(name) === wanted) ?? null;
}

export type CatalogCandidate = { id: string; name: string; club: string };
export type ApiPlayerName = { name: string; firstName: string | null; lastName: string | null };

// Hvor sikkert en katalogspiller og en spiller hos API-Football er samme person.
// Katalogen har som regel kjent navn («Erling Haaland»), API-et har fullt navn
// («Erling» + «Braut Haaland») og forkortelse («E. Haaland»).
//   strong: hele navnet, eller både fornavn og etternavn, stemmer.
//   weak:   etternavnet og forbokstaven stemmer («Joe Gomez» og «J. Gomez» / Joseph).
//           Kan like gjerne være en annen spiller med samme etternavn.
export function playerMatchStrength(catalogName: string, api: ApiPlayerName): "strong" | "weak" | null {
  const catalog = normalizeName(catalogName);
  const display = normalizeName(api.name);
  const firstTokens = normalizeName(api.firstName ?? "").split(" ").filter(Boolean);
  const lastTokens = normalizeName(api.lastName ?? "").split(" ").filter(Boolean);
  if (catalog === display || catalog === [...firstTokens, ...lastTokens].join(" ")) return "strong";

  const catalogTokens = catalog.split(" ");
  // Ett navn i katalogen («Rodri») må stemme med hele navnet, som over.
  if (catalogTokens.length < 2) return null;
  // Viser API-et et fullt kjent navn («João Virgínia»), må det slutte likt som i katalogen.
  const displayTokens = display.split(" ");
  const displayIsFullName = displayTokens.length >= 2 && displayTokens[0].length > 1;
  if (displayIsFullName && displayTokens[displayTokens.length - 1] !== catalogTokens[catalogTokens.length - 1]) return null;
  const catalogFirst = catalogTokens[0];
  const catalogLast = catalogTokens.slice(1).join(" ");
  const lastName = lastTokens.join(" ");
  // Etternavnet i katalogen må stemme med starten eller slutten av etternavnet hos API-et,
  // ikke bare et ord midt i («Neves» i «Neves Virgínia» er ikke João Neves).
  const lastMatches = lastName === catalogLast || lastName.endsWith(` ${catalogLast}`) || lastName.startsWith(`${catalogLast} `);
  if (!lastMatches) return null;
  if (firstTokens.includes(catalogFirst)) return "strong";
  // Forkortelsen «E. Haaland» må ha samme etternavn som katalogen.
  const abbreviated = /^[a-z] /.test(display) && display.slice(2) === catalogLast;
  return abbreviated && firstTokens[0]?.[0] === catalogFirst[0] ? "weak" : null;
}

export type CatalogMatch = { candidate: CatalogCandidate; strength: "strong" | "weak" };

// Velger katalogspilleren som er samme person. Først i samme klubb, ellers i hele
// katalogen, men da bare sikre treff på fullt navn. Er det flere mulige, kobles ingen.
export function matchCatalogPlayer(api: ApiPlayerName, clubName: string, catalog: readonly CatalogCandidate[]): CatalogMatch | null {
  const scored = catalog.flatMap((candidate) => {
    const strength = playerMatchStrength(candidate.name, api);
    return strength ? [{ candidate, strength }] : [];
  });
  const inClub = scored.filter((match) => match.candidate.club === clubName);
  const strongInClub = inClub.filter((match) => match.strength === "strong");
  if (strongInClub.length) return strongInClub.length === 1 ? strongInClub[0] : null;
  if (inClub.length) return inClub.length === 1 ? inClub[0] : null;
  // Navn på ett ord («Marquinhos») deles av flere spillere, så de kobles bare i samme klubb.
  const strongAnywhere = scored.filter((match) => match.strength === "strong" && normalizeName(match.candidate.name).includes(" "));
  return strongAnywhere.length === 1 ? strongAnywhere[0] : null;
}

// Flere API-spillere kan peke på samme katalogspiller (f.eks. Kalvin og Killian
// Phillips). Da beholdes det ene sikre treffet; ellers kobles ingen av dem.
export function resolveDuplicateMatches<T extends { match: CatalogMatch }>(entries: readonly T[]) {
  const byCatalog = new Map<string, T[]>();
  for (const entry of entries) byCatalog.set(entry.match.candidate.id, [...(byCatalog.get(entry.match.candidate.id) ?? []), entry]);
  return [...byCatalog.values()].flatMap((group) => {
    if (group.length === 1) return group;
    const strong = group.filter((entry) => entry.match.strength === "strong");
    return strong.length === 1 ? strong : [];
  });
}
