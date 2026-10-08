-- Femmer, del 2 (bygger på 0075):
-- * Kampene spilles live: klokka går på serveren og kan ikke hoppes over. Straffer og store sjanser
--   avgjøres av den som spiller (sikte som skytter, kaste seg som keeper). Kampen gjøres opp når den er ferdig.
-- * Mynter for alle kamper, uten daglig grense.
-- * Posisjon på kortene (keeper, forsvar, midtbane, angrep). Første valg er gratis, senere bytter koster mynter.
-- * Kort kan oppgraderes med mynter.
-- * Inform: hver fredag kl. 18 får de tre beste i Femmer forrige uke et inform-kort. Det er et eget kort
--   som blir værende, og blir personen inform igjen, bygger det nye kortet på det forrige.
-- * Vennesesonger, utfordringer med premier, daglig innloggingsbonus.
-- Alt skrives fra serveren med service_role; tabellene er stengt for alle andre.

-- 1) Inform-runder. En rad per uke, også når ingen fikk inform (da er runden tom).
create table if not exists five_inform_rounds (
  week_start timestamptz primary key,
  created_at timestamptz not null default now()
);
alter table five_inform_rounds enable row level security;

create table if not exists five_informs (
  id uuid primary key default gen_random_uuid(),
  week_start timestamptz not null references five_inform_rounds(week_start) on delete cascade,
  person_id uuid not null references personal_cards(user_id) on delete cascade,
  rank integer not null,
  points integer not null,
  boost integer not null,
  overall integer not null check (overall between 40 and 99),
  created_at timestamptz not null default now(),
  unique (week_start, person_id)
);
create index if not exists five_informs_person_idx on five_informs (person_id, overall desc);
alter table five_informs enable row level security;

-- 2) Kortene: posisjon, og hvilket inform-kort det er (null = vanlig-kortet).
alter table five_cards add column if not exists position text check (position in ('GK', 'D', 'M', 'A'));
alter table five_cards add column if not exists inform_id uuid references five_informs(id) on delete cascade;
alter table five_cards drop constraint if exists five_cards_owner_id_person_id_key;
create unique index if not exists five_cards_owner_person_version_idx on five_cards (owner_id, person_id, inform_id) nulls not distinct;

-- 3) Profilen: innloggingsbonus.
alter table five_profiles add column if not exists login_streak integer not null default 0;
alter table five_profiles add column if not exists last_login_on date;

-- 4) Vennesesonger.
create table if not exists five_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'active', 'completed')),
  invite_code text not null unique default public.generate_invite_code(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
alter table five_seasons enable row level security;

create table if not exists five_season_members (
  season_id uuid not null references five_seasons(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  joined_at timestamptz,
  final_rank integer,
  prize integer not null default 0,
  primary key (season_id, user_id)
);
create index if not exists five_season_members_user_idx on five_season_members (user_id);
alter table five_season_members enable row level security;

-- 5) Kampene: status, klokke, hvem som styrer kampen, og sesongkamper.
alter table five_matches drop constraint if exists five_matches_kind_check;
alter table five_matches add constraint five_matches_kind_check check (kind in ('ai', 'friend', 'season'));
alter table five_matches add column if not exists status text not null default 'completed' check (status in ('live', 'completed'));
alter table five_matches add column if not exists started_at timestamptz;
alter table five_matches add column if not exists completed_at timestamptz;
-- Den som spiller kampen og tar valgene. For AI- og vennekamper er det alltid hjemmelaget.
alter table five_matches add column if not exists controller_id uuid references profiles(id) on delete cascade;
alter table five_matches add column if not exists controller_side text not null default 'home' check (controller_side in ('home', 'away'));
alter table five_matches add column if not exists season_id uuid references five_seasons(id) on delete cascade;
alter table five_matches add column if not exists away_coins integer not null default 0;
update five_matches set completed_at = created_at where completed_at is null and status = 'completed';
update five_matches set controller_id = home_user_id where controller_id is null;
-- Bare én kamp om gangen per manager.
create unique index if not exists five_matches_one_live_idx on five_matches (controller_id) where status = 'live';
create index if not exists five_matches_completed_idx on five_matches (completed_at) where status = 'completed';

create table if not exists five_season_fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references five_seasons(id) on delete cascade,
  round integer not null,
  home_user_id uuid not null references profiles(id) on delete cascade,
  away_user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid references five_matches(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'played'))
);
create index if not exists five_season_fixtures_season_idx on five_season_fixtures (season_id, round);
alter table five_season_fixtures enable row level security;

-- Straffer og store sjanser. Utfallet avgjøres på serveren når valget kommer, eller når tiden er ute.
create table if not exists five_match_shots (
  match_id uuid not null references five_matches(id) on delete cascade,
  minute integer not null,
  side text not null check (side in ('home', 'away')),
  kind text not null check (kind in ('penalty', 'chance')),
  shooter_cell integer,
  keeper_cell integer,
  outcome text check (outcome in ('goal', 'saved', 'missed')),
  resolved_at timestamptz,
  primary key (match_id, minute)
);
alter table five_match_shots enable row level security;

-- 6) Utfordringer. En rad per premie som er hentet, så den ikke kan hentes to ganger i samme periode.
create table if not exists five_objective_claims (
  user_id uuid not null references profiles(id) on delete cascade,
  objective text not null,
  period_start timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, objective, period_start)
);
alter table five_objective_claims enable row level security;

-- ---------------------------------------------------------------------------
-- Inform
-- ---------------------------------------------------------------------------

-- Lager ukens runde første gang noen trenger den. De tre med flest poeng i Femmer forrige uke
-- (3 for seier, 1 for uavgjort; deretter målforskjell og mål) får inform, så sant de har et
-- personlig kort og minst ett poeng. Nr. 1 får +5, nr. 2 +4 og nr. 3 +3 på sitt forrige inform
-- (eller på 70 første gang).
create or replace function public.ensure_five_inform_round()
returns timestamptz language plpgsql set search_path = public, pg_temp
as $fn$
declare
  this_week timestamptz := (public.sbc_week_bounds(now())->>'week_start')::timestamptz;
  last_week timestamptz := this_week - interval '7 days';
begin
  insert into five_inform_rounds (week_start) values (this_week) on conflict do nothing;
  if not found then return this_week; end if;
  with results as (
    select home_user_id as user_id, home_score as scored, away_score as conceded from five_matches
    where status = 'completed' and completed_at >= last_week and completed_at < this_week
    union all
    select away_user_id, away_score, home_score from five_matches
    where status = 'completed' and away_user_id is not null and completed_at >= last_week and completed_at < this_week
  ), totals as (
    select r.user_id, sum(case when scored > conceded then 3 when scored = conceded then 1 else 0 end)::int as points,
      sum(scored - conceded)::int as diff, sum(scored)::int as goals
    from results r join personal_cards p on p.user_id = r.user_id
    group by r.user_id
  ), ranked as (
    select *, row_number() over (order by points desc, diff desc, goals desc, random())::int as place from totals where points > 0
  )
  insert into five_informs (week_start, person_id, rank, points, boost, overall)
  select this_week, ranked.user_id, place, points, 6 - place,
    least(99, coalesce((select max(i.overall) from five_informs i where i.person_id = ranked.user_id), 70) + 6 - place)
  from ranked where place <= 3;
  return this_week;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Pakker
-- ---------------------------------------------------------------------------

-- Trekker kort til en manager. Hvert kort har 6 % sjanse for å være et av ukens inform-kort
-- (want_inform garanterer det, hvis runden har noen). Har man kortet fra før, blir det 1 bedre.
-- Nye kort havner på benken hvis det er plass, og har ingen posisjon før eieren velger en.
drop function if exists public.open_five_pack(uuid, integer, integer);
create or replace function public.five_pull_cards(target_user uuid, card_count integer, want_inform boolean)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
declare
  this_week timestamptz := public.ensure_five_inform_round();
  person uuid;
  inform five_informs%rowtype;
  existing five_cards%rowtype;
  new_card uuid;
  start_overall integer;
  pulls jsonb := '[]'::jsonb;
  current_bench uuid[];
begin
  for i in 1..card_count loop
    inform := null;
    if (want_inform and i = 1) or random() < 0.06 then
      select * into inform from five_informs where week_start = this_week order by random() limit 1;
    end if;
    if inform.id is not null then
      person := inform.person_id; start_overall := inform.overall;
    else
      select user_id into person from personal_cards order by random() limit 1;
      start_overall := 70;
    end if;
    if person is null then raise exception 'Det finnes ingen personlige kort ennå'; end if;
    select * into existing from five_cards where owner_id = target_user and person_id = person and inform_id is not distinct from inform.id;
    if found then
      update five_cards set overall = least(99, overall + 1) where id = existing.id;
      pulls := pulls || jsonb_build_object('card_id', existing.id, 'person_id', person, 'inform_id', inform.id, 'overall', least(99, existing.overall + 1), 'upgrade', true);
    else
      insert into five_cards (owner_id, person_id, inform_id, overall) values (target_user, person, inform.id, start_overall) returning id into new_card;
      select bench into current_bench from five_lineups where user_id = target_user for update;
      -- Samme person kan ikke stå to steder i laget (f.eks. vanlig-kortet og informen).
      if current_bench is not null and cardinality(current_bench) < 5 and not exists (
        select 1 from five_lineups lineup join five_cards card on card.id = any(lineup.starters || lineup.bench)
        where lineup.user_id = target_user and card.person_id = person
      ) then
        update five_lineups set bench = bench || new_card, updated_at = now() where user_id = target_user;
      end if;
      pulls := pulls || jsonb_build_object('card_id', new_card, 'person_id', person, 'inform_id', inform.id, 'overall', start_overall, 'upgrade', false);
    end if;
  end loop;
  return pulls;
end;
$fn$;

-- Pris 0 er dagens gratispakke (én per dag, norsk tid). Prisen og antallet bestemmes av serveren (src/lib/femmer/rules.ts).
create or replace function public.open_five_pack(target_user uuid, card_count integer, pack_price integer)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
declare
  today date := (now() at time zone 'Europe/Oslo')::date;
begin
  if card_count < 1 or card_count > 5 or pack_price < 0 then raise exception 'Ugyldig pakke'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  if pack_price = 0 then
    update five_profiles set last_free_pack_on = today where user_id = target_user and last_free_pack_on is distinct from today;
    if not found then raise exception 'Du har allerede åpnet dagens gratispakke'; end if;
  else
    update five_profiles set coins = coins - pack_price where user_id = target_user and coins >= pack_price;
    if not found then raise exception 'Du har ikke nok mynter'; end if;
  end if;
  return public.five_pull_cards(target_user, card_count, false);
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Kort: posisjon og oppgradering
-- ---------------------------------------------------------------------------

-- Speiler fiveUpgradeCost og FIVE_POSITION_CHANGE_COST i src/lib/femmer/rules.ts.
create or replace function public.five_upgrade_cost(current_overall integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select 150 + greatest(0, current_overall - 70) * 30 $fn$;

create or replace function public.upgrade_five_card(target_user uuid, target_card uuid)
returns integer language plpgsql set search_path = public, pg_temp
as $fn$
declare
  card five_cards%rowtype;
  cost integer;
begin
  perform 1 from five_profiles where user_id = target_user for update;
  select * into card from five_cards where id = target_card and owner_id = target_user for update;
  if not found then raise exception 'Du eier ikke alle kortene'; end if;
  if card.overall >= 99 then raise exception 'Kortet er allerede på 99'; end if;
  cost := public.five_upgrade_cost(card.overall);
  update five_profiles set coins = coins - cost where user_id = target_user and coins >= cost;
  if not found then raise exception 'Du har ikke nok mynter'; end if;
  update five_cards set overall = overall + 1 where id = target_card;
  return card.overall + 1;
end;
$fn$;

create or replace function public.set_five_card_position(target_user uuid, target_card uuid, next_position text)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  card five_cards%rowtype;
begin
  if next_position not in ('GK', 'D', 'M', 'A') then raise exception 'Ugyldig posisjon'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  select * into card from five_cards where id = target_card and owner_id = target_user for update;
  if not found then raise exception 'Du eier ikke alle kortene'; end if;
  if card.position = next_position then return; end if;
  -- Første gang er gratis, deretter koster det 200 mynter.
  if card.position is not null then
    update five_profiles set coins = coins - 200 where user_id = target_user and coins >= 200;
    if not found then raise exception 'Du har ikke nok mynter'; end if;
  end if;
  update five_cards set position = next_position where id = target_card;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Kamper
-- ---------------------------------------------------------------------------

-- Erfaring, mål og målgivende til kortene til én manager. Hver hele 100 xp blir +1 rating.
create or replace function public.five_apply_card_stats(target_user uuid, card_stats jsonb)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  stat jsonb;
  gained integer;
begin
  for stat in select * from jsonb_array_elements(coalesce(card_stats, '[]'::jsonb)) loop
    gained := greatest(0, coalesce((stat->>'xp')::int, 0));
    update five_cards set
      appearances = appearances + 1,
      goals = goals + greatest(0, coalesce((stat->>'goals')::int, 0)),
      assists = assists + greatest(0, coalesce((stat->>'assists')::int, 0)),
      overall = least(99, overall + (xp + gained) / 100),
      xp = case when overall + (xp + gained) / 100 >= 99 then 0 else (xp + gained) % 100 end
    where id = (stat->>'id')::uuid and owner_id = target_user;
  end loop;
end;
$fn$;

-- Gjør opp en ferdig kamp: resultat, mynter, erfaring, tabell, AI-stigen og sesongen.
-- Kjøres bare én gang per kamp; svarer false hvis kampen allerede var gjort opp.
drop function if exists public.record_five_match(uuid, text, uuid, text, integer, integer, integer, jsonb, integer, jsonb);
create or replace function public.settle_five_match(
  target_match uuid, score_home integer, score_away integer,
  reward_home integer, reward_away integer, stats_home jsonb, stats_away jsonb
) returns boolean language plpgsql set search_path = public, pg_temp
as $fn$
declare
  game five_matches%rowtype;
  home_result text := case when score_home > score_away then 'win' when score_home = score_away then 'draw' else 'loss' end;
begin
  update five_matches set status = 'completed', completed_at = now(), home_score = score_home, away_score = score_away,
    coins = reward_home, away_coins = reward_away
  where id = target_match and status = 'live'
  returning * into game;
  if not found then return false; end if;

  update five_profiles set
    coins = coins + reward_home,
    wins = wins + (home_result = 'win')::int,
    draws = draws + (home_result = 'draw')::int,
    losses = losses + (home_result = 'loss')::int,
    ai_level = case when game.kind = 'ai' and home_result = 'win' and game.ai_level = ai_level then least(30, ai_level + 1) else ai_level end,
    best_ai_level = greatest(best_ai_level, case when game.kind = 'ai' and home_result = 'win' and game.ai_level = ai_level then least(30, ai_level + 1) else ai_level end)
  where user_id = game.home_user_id;
  perform public.five_apply_card_stats(game.home_user_id, stats_home);

  if game.away_user_id is not null then
    update five_profiles set
      coins = coins + reward_away,
      wins = wins + (home_result = 'loss')::int,
      draws = draws + (home_result = 'draw')::int,
      losses = losses + (home_result = 'win')::int
    where user_id = game.away_user_id;
    perform public.five_apply_card_stats(game.away_user_id, stats_away);
  end if;

  if game.season_id is not null then
    update five_season_fixtures set status = 'played' where match_id = target_match;
    perform public.finish_five_season(game.season_id);
  end if;
  return true;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Vennesesonger
-- ---------------------------------------------------------------------------

create or replace function public.join_five_season(target_user uuid, target_season uuid)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  season_status text;
begin
  select status into season_status from five_seasons where id = target_season for update;
  if not found or season_status <> 'open' then raise exception 'Sesongen er allerede i gang'; end if;
  if not exists (select 1 from five_profiles where user_id = target_user) then raise exception 'Du har ikke startet Femmer'; end if;
  if (select count(*) from five_season_members where season_id = target_season and status = 'joined' and user_id <> target_user) >= 16 then
    raise exception 'Sesongen er full';
  end if;
  insert into five_season_members (season_id, user_id, status, joined_at) values (target_season, target_user, 'joined', now())
  on conflict (season_id, user_id) do update set status = 'joined', joined_at = coalesce(five_season_members.joined_at, now());
end;
$fn$;

-- Kampoppsettet lages på serveren (src/lib/femmer/seasons.ts) og sendes inn her, der alt sjekkes og låses.
-- fixtures: [{ "round": n, "home": bruker-id, "away": bruker-id }]
create or replace function public.start_five_season(target_user uuid, target_season uuid, fixtures jsonb)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  season five_seasons%rowtype;
  joined uuid[];
begin
  select * into season from five_seasons where id = target_season for update;
  if not found or season.owner_id <> target_user then raise exception 'Bare den som opprettet sesongen kan starte den'; end if;
  if season.status <> 'open' then raise exception 'Sesongen er allerede i gang'; end if;
  select array_agg(user_id) into joined from five_season_members where season_id = target_season and status = 'joined';
  if coalesce(cardinality(joined), 0) < 2 then raise exception 'Sesongen trenger minst to managere'; end if;
  if exists (select 1 from jsonb_array_elements(fixtures) f where not ((f->>'home')::uuid = any(joined) and (f->>'away')::uuid = any(joined))) then
    raise exception 'Kampoppsettet passer ikke med deltakerne';
  end if;
  delete from five_season_members where season_id = target_season and status <> 'joined';
  insert into five_season_fixtures (season_id, round, home_user_id, away_user_id)
  select target_season, (f->>'round')::int, (f->>'home')::uuid, (f->>'away')::uuid from jsonb_array_elements(fixtures) f;
  update five_seasons set status = 'active', started_at = now() where id = target_season;
end;
$fn$;

-- Avslutter sesongen når siste kamp er spilt, og deler ut premiene: 1000, 500 og 250 mynter
-- til de tre beste, men aldri til alle (med to managere får bare vinneren premie).
create or replace function public.finish_five_season(target_season uuid)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  member_count integer;
begin
  if exists (select 1 from five_season_fixtures where season_id = target_season and status <> 'played') then return; end if;
  update five_seasons set status = 'completed', completed_at = now() where id = target_season and status = 'active';
  if not found then return; end if;
  select count(*) into member_count from five_season_members where season_id = target_season and status = 'joined';
  with games as (
    select f.home_user_id as user_id, m.home_score as scored, m.away_score as conceded
    from five_season_fixtures f join five_matches m on m.id = f.match_id where f.season_id = target_season
    union all
    select f.away_user_id, m.away_score, m.home_score
    from five_season_fixtures f join five_matches m on m.id = f.match_id where f.season_id = target_season
  ), totals as (
    select member.user_id,
      coalesce(sum(case when g.scored > g.conceded then 3 when g.scored = g.conceded then 1 else 0 end), 0) as points,
      coalesce(sum(g.scored - g.conceded), 0) as diff, coalesce(sum(g.scored), 0) as goals
    from five_season_members member left join games g on g.user_id = member.user_id
    where member.season_id = target_season and member.status = 'joined'
    group by member.user_id
  ), ranked as (
    select user_id, row_number() over (order by points desc, diff desc, goals desc, user_id)::int as place from totals
  )
  update five_season_members member set final_rank = ranked.place,
    prize = case when ranked.place <= least(3, member_count - 1) then (array[1000, 500, 250])[ranked.place] else 0 end
  from ranked where member.season_id = target_season and member.user_id = ranked.user_id;
  update five_profiles profile set coins = coins + member.prize
  from five_season_members member where member.season_id = target_season and member.user_id = profile.user_id and member.prize > 0;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Utfordringer og innloggingsbonus
-- ---------------------------------------------------------------------------

-- Fremgangen sjekkes på serveren (src/lib/femmer/objectives.ts) før denne kalles. Premien er mynter,
-- en pakke med pack_cards kort, og/eller et garantert inform-kort.
create or replace function public.claim_five_objective(target_user uuid, objective_key text, period timestamptz, reward_coins integer, pack_cards integer, with_inform boolean)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
declare
  pulls jsonb := '[]'::jsonb;
begin
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  insert into five_objective_claims (user_id, objective, period_start) values (target_user, objective_key, period) on conflict do nothing;
  if not found then raise exception 'Du har allerede hentet denne premien'; end if;
  update five_profiles set coins = coins + greatest(0, reward_coins) where user_id = target_user;
  if with_inform then pulls := pulls || public.five_pull_cards(target_user, 1, true); end if;
  if pack_cards > 0 then pulls := pulls || public.five_pull_cards(target_user, least(pack_cards, 5), false); end if;
  return pulls;
end;
$fn$;

-- Dag 1–6 gir 50, 75, 100, 125, 150 og 200 mynter, dag 7 en pakke med tre kort. Så begynner det på nytt.
-- Hopper man over en dag, starter rekka på dag 1 igjen. Speiler fiveLoginRewards i rules.ts.
create or replace function public.claim_five_login(target_user uuid)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
declare
  today date := (now() at time zone 'Europe/Oslo')::date;
  profile five_profiles%rowtype;
  streak integer;
  day integer;
  reward integer;
  pulls jsonb := '[]'::jsonb;
begin
  select * into profile from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  if profile.last_login_on = today then raise exception 'Du har allerede hentet dagens bonus'; end if;
  streak := case when profile.last_login_on = today - 1 then profile.login_streak + 1 else 1 end;
  day := ((streak - 1) % 7) + 1;
  reward := (array[50, 75, 100, 125, 150, 200, 0])[day];
  update five_profiles set login_streak = streak, last_login_on = today, coins = coins + reward where user_id = target_user;
  if day = 7 then pulls := public.five_pull_cards(target_user, 3, false); end if;
  return jsonb_build_object('streak', streak, 'day', day, 'coins', reward, 'pulls', pulls);
end;
$fn$;

-- Oppstarten fra 0075 setter nå også posisjon på kortene: eget kort i mål, resten valgt av brukeren.
drop function if exists public.start_five_career(uuid, uuid[]);
create or replace function public.start_five_career(target_user uuid, picked uuid[], positions text[])
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  own boolean := exists (select 1 from personal_cards where user_id = target_user);
  everyone uuid[];
  team uuid[];
begin
  if exists (select 1 from five_profiles where user_id = target_user) then raise exception 'Du har allerede startet Femmer'; end if;
  if picked is null or cardinality(picked) <> (case when own then 4 else 5 end) then raise exception 'Velg riktig antall kort'; end if;
  if (select count(distinct person) from unnest(picked) person) <> cardinality(picked) then raise exception 'Du kan ikke velge samme kort to ganger'; end if;
  if target_user = any(picked) then raise exception 'Ditt eget kort er allerede med'; end if;
  if (select count(*) from personal_cards where user_id = any(picked)) <> cardinality(picked) then raise exception 'Fant ikke alle kortene'; end if;
  everyone := case when own then array[target_user] || picked else picked end;
  if positions is null or cardinality(positions) <> cardinality(everyone) or exists (select 1 from unnest(positions) p where p not in ('GK', 'D', 'M', 'A')) then
    raise exception 'Ugyldig posisjon';
  end if;

  insert into five_profiles (user_id) values (target_user);
  insert into five_cards (owner_id, person_id, position)
  select target_user, everyone[i], positions[i] from generate_subscripts(everyone, 1) i;
  -- Startfemmeren står i samme rekkefølge som valgt; keeperen (hvis noen) settes i mål.
  select array_agg(card.id order by card.position <> 'GK', array_position(everyone, card.person_id)) into team
  from five_cards card where card.owner_id = target_user;
  insert into five_lineups (user_id, starters, bench) values (target_user, team, '{}');
end;
$fn$;

revoke all on function public.ensure_five_inform_round() from public, anon, authenticated;
revoke all on function public.five_pull_cards(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.open_five_pack(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.five_upgrade_cost(integer) from public, anon, authenticated;
revoke all on function public.upgrade_five_card(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_five_card_position(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.five_apply_card_stats(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.settle_five_match(uuid, integer, integer, integer, integer, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.join_five_season(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_five_season(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.finish_five_season(uuid) from public, anon, authenticated;
revoke all on function public.claim_five_objective(uuid, text, timestamptz, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.claim_five_login(uuid) from public, anon, authenticated;
revoke all on function public.start_five_career(uuid, uuid[], text[]) from public, anon, authenticated;
grant execute on function public.ensure_five_inform_round() to service_role;
grant execute on function public.five_pull_cards(uuid, integer, boolean) to service_role;
grant execute on function public.open_five_pack(uuid, integer, integer) to service_role;
grant execute on function public.five_upgrade_cost(integer) to service_role;
grant execute on function public.upgrade_five_card(uuid, uuid) to service_role;
grant execute on function public.set_five_card_position(uuid, uuid, text) to service_role;
grant execute on function public.five_apply_card_stats(uuid, jsonb) to service_role;
grant execute on function public.settle_five_match(uuid, integer, integer, integer, integer, jsonb, jsonb) to service_role;
grant execute on function public.join_five_season(uuid, uuid) to service_role;
grant execute on function public.start_five_season(uuid, uuid, jsonb) to service_role;
grant execute on function public.finish_five_season(uuid) to service_role;
grant execute on function public.claim_five_objective(uuid, text, timestamptz, integer, integer, boolean) to service_role;
grant execute on function public.claim_five_login(uuid) to service_role;
grant execute on function public.start_five_career(uuid, uuid[], text[]) to service_role;
