-- Engelsk er hovedspråket i appen. Managerkarrierens datastyrte klubber og standardverdier får
-- engelske navn. Appen oversetter dem tilbake til norsk for dem som har valgt norsk.
-- Kan kjøres før den nye koden er ute: appen viser både gamle og nye verdier riktig.

-- 1) Nye AI-sesonger trekker klubber fra engelske navn (samme rekkefølge som de gamle norske).
create or replace function public.create_ai_season(target_user uuid, target_division integer, target_number integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  club_names text[] := array['Riverside FC', 'Northbridge United', 'Ashford Town', 'Kingsmere City', 'Harbourne Rovers', 'Westbrook Athletic', 'Stonegate FC', 'Redcliffe United',
    'Oakfield Wanderers', 'Blackwater Town', 'Elmstead Albion', 'Highmoor City', 'Castlebury Rangers', 'Millbrook FC', 'Fairhaven Athletic', 'Thornbury United'];
  picked text[];
  base integer := public.ai_division_rating(target_division);
  teams jsonb := '[]';
  season_id uuid;
  -- Deltaker 0 er brukeren, 1–5 er AI-klubbene.
  rotation integer[];
  lineup integer[];
  round_index integer;
  pair_index integer;
  a integer;
  b integer;
  home_part integer;
  away_part integer;
begin
  select array_agg(name) into picked from (select unnest(club_names) as name order by random() limit 5) as chosen;
  for i in 1..5 loop
    teams := teams || jsonb_build_object('key', 'ai' || i, 'name', picked[i], 'rating', base + (i - 3));
  end loop;

  insert into career_ai_seasons (user_id, season_number, division, teams)
  values (target_user, target_number, target_division, teams)
  returning id into season_id;

  -- Rundkast med sirkelmetoden: deltaker 0 står fast, resten roterer. Andre halvdel speiler første med byttet hjemmebane.
  rotation := array[1, 2, 3, 4, 5];
  for round_index in 0..4 loop
    lineup := array[0] || rotation[(round_index % 5) + 1:5] || rotation[1:(round_index % 5)];
    for pair_index in 0..2 loop
      a := lineup[pair_index + 1];
      b := lineup[6 - pair_index];
      if (round_index + pair_index) % 2 = 0 then home_part := a; away_part := b; else home_part := b; away_part := a; end if;
      insert into career_season_matches (ai_season_id, round, home_user_id, home_ai_key, away_user_id, away_ai_key)
      values (season_id, round_index + 1,
        case when home_part = 0 then target_user end, case when home_part <> 0 then 'ai' || home_part end,
        case when away_part = 0 then target_user end, case when away_part <> 0 then 'ai' || away_part end);
      insert into career_season_matches (ai_season_id, round, home_user_id, home_ai_key, away_user_id, away_ai_key)
      values (season_id, round_index + 6,
        case when away_part = 0 then target_user end, case when away_part <> 0 then 'ai' || away_part end,
        case when home_part = 0 then target_user end, case when home_part <> 0 then 'ai' || home_part end);
    end loop;
  end loop;

  return season_id;
end;
$fn$;

-- 2) Klubbene i AI-sesonger som pågår, får det engelske navnet på samme plass i lista.
--    Ferdige sesonger og spilte kamper beholder navnene sine i historikken.
with names(old_name, new_name) as (
  select * from unnest(
    array['Fjordby FK', 'Nordvik IL', 'Bølgen SK', 'Granli BK', 'Solstad FK', 'Havøy IL', 'Myrvang SK', 'Tindheim FK',
      'Elvebakken IL', 'Skogsrud BK', 'Kvitberg FK', 'Løvøya SK', 'Steinvik IL', 'Aurdal FK', 'Brattli BK', 'Vesthavn FK'],
    array['Riverside FC', 'Northbridge United', 'Ashford Town', 'Kingsmere City', 'Harbourne Rovers', 'Westbrook Athletic', 'Stonegate FC', 'Redcliffe United',
      'Oakfield Wanderers', 'Blackwater Town', 'Elmstead Albion', 'Highmoor City', 'Castlebury Rangers', 'Millbrook FC', 'Fairhaven Athletic', 'Thornbury United'])
)
update career_ai_seasons as s
set teams = coalesce((
  select jsonb_agg(case when n.new_name is null then team else jsonb_set(team, '{name}', to_jsonb(n.new_name)) end order by position)
  from jsonb_array_elements(s.teams) with ordinality as t(team, position)
  left join names as n on n.old_name = t.team ->> 'name'
), s.teams)
where s.status = 'active';

-- 3) Standardverdier på engelsk.
alter table player_profiles alter column club_name set default 'My team';
update player_profiles set club_name = 'My team' where club_name = 'Mitt lag';
alter table player_catalog alter column club set default 'Unknown club';
update player_catalog set club = 'Unknown club' where club = 'Ukjent klubb';

-- 4) Språket som ble lagret automatisk før engelsk ble hovedspråk, nullstilles.
--    Alle starter på engelsk og velger norsk selv med språkknappen.
update profiles set locale = null;
