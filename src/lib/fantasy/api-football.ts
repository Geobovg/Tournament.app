// Klient for API-Football (api-football.com). Fila har ingen importer, så den kan
// brukes både av appen og av skriptene i scripts/ (som kjøres rett med node).
//
// Nøkkelen ligger i API_FOOTBALL_KEY. Gratisplanen gir 100 forespørsler per døgn og
// bare sesongene 2022–2024.

const BASE_URL = "https://v3.football.api-sports.io";

export type ApiTeam = { team: { id: number; name: string; logo: string | null } };

export type ApiPlayer = {
  player: { id: number; name: string; firstname: string | null; lastname: string | null; photo: string | null };
  // Én rad per lag og turnering spilleren har spilt i den sesongen. Tallene er sesongsummer.
  statistics: {
    team: { id: number };
    league: { id: number };
    games: { position: string | null; appearences: number | null; minutes: number | null; rating: string | null };
    goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null };
    cards: { yellow: number | null; red: number | null };
    penalty: { saved: number | null; missed: number | null };
  }[];
};

export type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; round: string };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
};

// En kamp med alle detaljer (/fixtures?ids=...): hendelser, oppstillinger og spillerstatistikk.
export type ApiFixtureDetails = ApiFixture & {
  events: { time: { elapsed: number | null; extra: number | null }; team: { id: number }; player: { id: number | null }; assist: { id: number | null }; type: string; detail: string }[];
  lineups: { team: { id: number }; startXI: { player: { id: number } }[] }[];
  players: {
    team: { id: number };
    players: {
      player: { id: number; name: string };
      statistics: {
        // position er G, D, M eller F i kampdataene.
        games: { minutes: number | null; rating: string | null; position: string | null };
        goals: { total: number | null; assists: number | null; saves: number | null };
        cards: { yellow: number | null; red: number | null };
        penalty: { saved: number | null; missed: number | null };
      }[];
    }[];
  }[];
};

// Squad slik /players/squads gir den: dagens stall, med posisjon.
export type ApiSquad = { team: { id: number }; players: { id: number; name: string; photo: string | null; position: string | null }[] };

type ApiResponse<T> = {
  errors: unknown[] | Record<string, string>;
  paging: { current: number; total: number };
  response: T[];
};

export class ApiFootballError extends Error {}

export class ApiFootballClient {
  // Hvor mange forespørsler som er igjen i dag, ifølge siste svar fra API-et.
  remainingToday: number | null = null;
  requestsMade = 0;
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  async get<T>(path: string, params: Record<string, string | number>): Promise<ApiResponse<T>> {
    const query = new URLSearchParams(Object.entries(params).map(([name, value]) => [name, String(value)]));
    let response = await fetch(`${BASE_URL}${path}?${query}`, { headers: { "x-apisports-key": this.key } });
    this.requestsMade += 1;
    // 429 betyr for mange forespørsler i minuttet (gratisplanen tillater 10). Vent og prøv igjen.
    for (let attempt = 0; response.status === 429 && attempt < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 61_000));
      response = await fetch(`${BASE_URL}${path}?${query}`, { headers: { "x-apisports-key": this.key } });
      this.requestsMade += 1;
    }
    const remaining = response.headers.get("x-ratelimit-requests-remaining");
    if (remaining !== null) this.remainingToday = Number(remaining);
    if (!response.ok) throw new ApiFootballError(`API-Football svarte ${response.status} på ${path}`);
    const body = (await response.json()) as ApiResponse<T>;
    // Feil kommer som et objekt ({ plan: "..." }) eller som en tom liste når alt er greit.
    const errors = Array.isArray(body.errors) ? body.errors.map(String) : Object.values(body.errors);
    if (errors.length) throw new ApiFootballError(`API-Football: ${errors.join(", ")}`);
    return body;
  }

  async teams(apiLeagueId: number, season: number) {
    return (await this.get<ApiTeam>("/teams", { league: apiLeagueId, season })).response;
  }

  async fixtures(apiLeagueId: number, season: number) {
    return (await this.get<ApiFixture>("/fixtures", { league: apiLeagueId, season })).response;
  }

  // Opptil 20 kamper med alle detaljer i én forespørsel (krever betalt plan).
  async fixtureDetails(fixtureIds: readonly number[]) {
    const details: ApiFixtureDetails[] = [];
    for (let start = 0; start < fixtureIds.length; start += 20) {
      details.push(...(await this.get<ApiFixtureDetails>("/fixtures", { ids: fixtureIds.slice(start, start + 20).join("-") })).response);
    }
    return details;
  }

  // Dagens stall for et lag, med posisjon. Én forespørsel per lag.
  async squad(apiTeamId: number) {
    return (await this.get<ApiSquad>("/players/squads", { team: apiTeamId })).response[0]?.players ?? [];
  }

  // Alle spillere som var i stallen til laget den sesongen. 20 per side. Gratisplanen
  // gir bare 3 sider, så da blir lista avkortet (complete: false).
  async teamPlayers(apiTeamId: number, season: number) {
    const players: ApiPlayer[] = [];
    for (let page = 1; ; page += 1) {
      let body: ApiResponse<ApiPlayer>;
      try {
        body = await this.get<ApiPlayer>("/players", { team: apiTeamId, season, page });
      } catch (error) {
        if (page > 1 && error instanceof ApiFootballError && error.message.includes("Page parameter")) return { players, complete: false };
        throw error;
      }
      players.push(...body.response);
      if (page >= body.paging.total) return { players, complete: true };
    }
  }
}

// API-Football bruker Goalkeeper, Defender, Midfielder og Attacker.
export function fantasyPosition(apiPosition: string | null) {
  switch (apiPosition) {
    case "Goalkeeper": return "GK";
    case "Defender": return "DEF";
    case "Midfielder": return "MID";
    case "Attacker": return "FWD";
    default: return null;
  }
}
