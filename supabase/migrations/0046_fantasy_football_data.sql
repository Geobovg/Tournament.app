-- Fantasy, steg 1: de fem store ligaene, hvilke klubber som spiller i dem, og ekte
-- lag, spillere og terminliste fra API-Football. Dataene hentes med
-- `npm run fantasy:sync` (scripts/fantasy-sync.ts).
--
-- Spillerkatalogen har klubben som fri tekst (player_catalog.club). Her kobles
-- klubbnavnet til en liga, og senere til lagets id hos API-Football, slik at
-- ekte terminliste og kampstatistikk kan hentes. Klubbnavnene skrives nøyaktig
-- som i player_catalog.club.
--
-- Ligakodene er de samme som player_catalog.league fra 0045_sbc.sql. Ligaene
-- står også i src/lib/fantasy/competitions.ts. TS og SQL må stemme.

create table football_competitions (
  code text primary key,
  name text not null,
  country text not null,
  -- Ligaens id hos API-Football (api-football.com).
  api_league_id integer not null unique,
  sort_order integer not null
);

-- Ingen policyer: bare service role (serveren) kan lese og skrive.
alter table football_competitions enable row level security;

insert into football_competitions (code, name, country, api_league_id, sort_order) values
  ('premier_league', 'Premier League', 'GB', 39, 1),
  ('la_liga', 'La Liga', 'ES', 140, 2),
  ('serie_a', 'Serie A', 'IT', 135, 3),
  ('bundesliga', 'Bundesliga', 'DE', 78, 4),
  ('ligue_1', 'Ligue 1', 'FR', 61, 5);

create table football_clubs (
  id bigint generated always as identity primary key,
  -- Samme navn som i player_catalog.club.
  name text not null unique,
  competition_code text references football_competitions (code),
  -- Lagets id hos API-Football. Fylles inn når vi henter data derfra.
  api_team_id integer unique,
  created_at timestamptz not null default now()
);

create index football_clubs_competition_idx on football_clubs (competition_code);

alter table football_clubs enable row level security;

-- Lagene i sesongen 2026/27. Málaga, SV Elversberg, Le Mans og Troyes har
-- ingen spillere i katalogen ennå. De fylles inn når stallene hentes fra API-et.
insert into football_clubs (name, competition_code) values
  -- Premier League (20)
  ('Arsenal', 'premier_league'),
  ('Aston Villa', 'premier_league'),
  ('AFC Bournemouth', 'premier_league'),
  ('Brentford', 'premier_league'),
  ('Brighton & Hove Albion', 'premier_league'),
  ('Chelsea', 'premier_league'),
  ('Coventry City', 'premier_league'),
  ('Crystal Palace', 'premier_league'),
  ('Everton', 'premier_league'),
  ('Fulham', 'premier_league'),
  ('Hull City', 'premier_league'),
  ('Ipswich Town', 'premier_league'),
  ('Leeds United', 'premier_league'),
  ('Liverpool', 'premier_league'),
  ('Manchester City', 'premier_league'),
  ('Manchester United', 'premier_league'),
  ('Newcastle United', 'premier_league'),
  ('Nottingham Forest', 'premier_league'),
  ('Sunderland', 'premier_league'),
  ('Tottenham Hotspur', 'premier_league'),
  -- La Liga (20)
  ('Alavés', 'la_liga'),
  ('Athletic Club', 'la_liga'),
  ('Atlético Madrid', 'la_liga'),
  ('Barcelona', 'la_liga'),
  ('Celta Vigo', 'la_liga'),
  ('Deportivo La Coruña', 'la_liga'),
  ('Elche', 'la_liga'),
  ('Espanyol', 'la_liga'),
  ('Getafe', 'la_liga'),
  ('Levante', 'la_liga'),
  ('Málaga', 'la_liga'),
  ('Osasuna', 'la_liga'),
  ('Racing de Santander', 'la_liga'),
  ('Rayo Vallecano', 'la_liga'),
  ('Real Betis', 'la_liga'),
  ('Real Madrid', 'la_liga'),
  ('Real Sociedad', 'la_liga'),
  ('Sevilla', 'la_liga'),
  ('Valencia', 'la_liga'),
  ('Villarreal', 'la_liga'),
  -- Serie A (20)
  ('Atalanta', 'serie_a'),
  ('Bologna', 'serie_a'),
  ('Cagliari', 'serie_a'),
  ('Como', 'serie_a'),
  ('Fiorentina', 'serie_a'),
  ('Frosinone', 'serie_a'),
  ('Genoa', 'serie_a'),
  ('Inter', 'serie_a'),
  ('Juventus', 'serie_a'),
  ('Lazio', 'serie_a'),
  ('Lecce', 'serie_a'),
  ('AC Milan', 'serie_a'),
  ('Monza', 'serie_a'),
  ('Napoli', 'serie_a'),
  ('Parma', 'serie_a'),
  ('Roma', 'serie_a'),
  ('Sassuolo', 'serie_a'),
  ('Torino', 'serie_a'),
  ('Udinese', 'serie_a'),
  ('Venezia', 'serie_a'),
  -- Bundesliga (18)
  ('Augsburg', 'bundesliga'),
  ('Union Berlin', 'bundesliga'),
  ('Werder Bremen', 'bundesliga'),
  ('Borussia Dortmund', 'bundesliga'),
  ('SV Elversberg', 'bundesliga'),
  ('Eintracht Frankfurt', 'bundesliga'),
  ('Freiburg', 'bundesliga'),
  ('Hamburger SV', 'bundesliga'),
  ('Hoffenheim', 'bundesliga'),
  ('1. FC Köln', 'bundesliga'),
  ('RB Leipzig', 'bundesliga'),
  ('Bayer Leverkusen', 'bundesliga'),
  ('Mainz 05', 'bundesliga'),
  ('Borussia Mönchengladbach', 'bundesliga'),
  ('Bayern München', 'bundesliga'),
  ('Paderborn', 'bundesliga'),
  ('Schalke 04', 'bundesliga'),
  ('Stuttgart', 'bundesliga'),
  -- Ligue 1 (18)
  ('Angers', 'ligue_1'),
  ('Auxerre', 'ligue_1'),
  ('Brest', 'ligue_1'),
  ('Le Havre', 'ligue_1'),
  ('Le Mans', 'ligue_1'),
  ('Lens', 'ligue_1'),
  ('Lille', 'ligue_1'),
  ('Lorient', 'ligue_1'),
  ('Lyon', 'ligue_1'),
  ('Marseille', 'ligue_1'),
  ('Monaco', 'ligue_1'),
  ('Nice', 'ligue_1'),
  ('Paris FC', 'ligue_1'),
  ('Paris Saint-Germain', 'ligue_1'),
  ('Rennes', 'ligue_1'),
  ('Strasbourg', 'ligue_1'),
  ('Toulouse', 'ligue_1'),
  ('Troyes', 'ligue_1');

-- Sesongene vi henter data for. api_season er året sesongen starter (2024 = 2024/25).
-- Bare én sesong er den som spilles nå. Vi tester på 2024/25 fordi gratisplanen hos
-- API-Football ikke gir tilgang til inneværende sesong.
create table fantasy_seasons (
  api_season integer primary key,
  label text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index fantasy_seasons_one_current_idx on fantasy_seasons (is_current) where is_current;

alter table fantasy_seasons enable row level security;

insert into fantasy_seasons (api_season, label, is_current) values (2024, '2024/25', true);

-- Lagene i hver liga i en sesong, slik API-Football har dem. Koblet til vår klubb.
create table football_season_teams (
  api_season integer not null references fantasy_seasons (api_season) on delete cascade,
  api_team_id integer not null,
  competition_code text not null references football_competitions (code),
  club_id bigint not null references football_clubs (id),
  -- Navnet hos API-Football, f.eks. «Wolves» der vi skriver «Wolverhampton Wanderers».
  api_name text not null,
  logo_url text,
  -- Når stallen sist ble hentet. Tom betyr at den ikke er hentet ennå.
  squad_synced_at timestamptz,
  primary key (api_season, api_team_id)
);

create index football_season_teams_club_idx on football_season_teams (club_id);

alter table football_season_teams enable row level security;

-- Ekte spillere fra API-Football. catalog_id peker på samme spiller i spillerkatalogen
-- når vi finner ham der, så vi kan bruke rating, pris og bilde derfra.
create table football_players (
  api_player_id integer primary key,
  name text not null,
  first_name text,
  last_name text,
  photo_url text,
  catalog_id uuid references player_catalog (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index football_players_catalog_idx on football_players (catalog_id);

alter table football_players enable row level security;

-- Hvilket lag og hvilken fantasy-posisjon en spiller har i en sesong. Bytter han lag
-- i løpet av sesongen, står det siste laget her.
create table football_season_players (
  api_season integer not null,
  api_player_id integer not null references football_players (api_player_id) on delete cascade,
  api_team_id integer not null,
  position text not null check (position in ('GK', 'DEF', 'MID', 'FWD')),
  primary key (api_season, api_player_id),
  foreign key (api_season, api_team_id) references football_season_teams (api_season, api_team_id) on delete cascade
);

create index football_season_players_team_idx on football_season_players (api_season, api_team_id);

alter table football_season_players enable row level security;

-- Terminlista. status er API-Footballs korte status: NS (ikke startet), 1H, HT, 2H,
-- FT (ferdig), PST (utsatt) osv.
create table football_fixtures (
  api_fixture_id integer primary key,
  api_season integer not null,
  competition_code text not null references football_competitions (code),
  round text not null,
  kickoff_at timestamptz not null,
  status text not null,
  home_team_id integer not null,
  away_team_id integer not null,
  home_goals integer,
  away_goals integer,
  updated_at timestamptz not null default now(),
  foreign key (api_season, home_team_id) references football_season_teams (api_season, api_team_id) on delete cascade,
  foreign key (api_season, away_team_id) references football_season_teams (api_season, api_team_id) on delete cascade
);

create index football_fixtures_season_kickoff_idx on football_fixtures (api_season, kickoff_at);

alter table football_fixtures enable row level security;

-- player_catalog.league (brukt av SBC) ble satt med lagene fra 2025/26. Nå følger
-- den football_clubs: klubber som har rykket ned fra de fem ligaene blir 'other',
-- og klubber som har rykket opp får riktig liga.
update player_catalog set league = 'other'
where league in (select code from football_competitions)
  and club not in (select name from football_clubs where competition_code is not null);

update player_catalog as catalog set league = club.competition_code
from football_clubs as club
where club.name = catalog.club
  and club.competition_code is not null
  and catalog.league is distinct from club.competition_code;