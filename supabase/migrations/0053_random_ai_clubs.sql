-- AI-klubbene i nye sesonger trekkes nå faktisk tilfeldig. Før ble lista sortert tilfeldig før den ble
-- pakket ut, så det ble alltid de fem første navnene. Sesonger som pågår, beholder klubbene sine.

-- Nye AI-sesonger: fire klubber rundt divisjonsnivået og én favoritt som er klart bedre.
create or replace function public.create_ai_season(target_user uuid, target_division integer, target_number integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  picked text[];
  base integer := public.ai_division_rating(target_division);
  offsets integer[] := array[-2, -1, 0, 1, 5];
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
  select array_agg(name) into picked from (select name from unnest(public.ai_club_names()) as name order by random() limit 5) as chosen;
  for i in 1..5 loop
    teams := teams || jsonb_build_object('key', 'ai' || i, 'name', picked[i], 'rating', base + offsets[i]);
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
