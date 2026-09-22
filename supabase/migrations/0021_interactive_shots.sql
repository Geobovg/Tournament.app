-- Straffespark og store sjanser som spillerne selv avgjør.
--
-- Valgene kan ikke ligge i career_matches.events, fordi begge managerne skriver samtidig:
-- to samtidige lese-endre-skrive på den samme jsonb-kolonnen ville mistet det ene valget.
-- Hver rad her har en kolonne per rolle, så skytter og keeper aldri skriver over hverandre.
create table if not exists career_match_shots (
  match_id uuid not null references career_matches(id) on delete cascade,
  minute integer not null check (minute between 1 and 90),
  kind text not null check (kind in ('penalty', 'chance')),
  side text not null check (side in ('home', 'away')),
  shooter_cell integer check (shooter_cell between 0 and 11),
  keeper_cell integer check (keeper_cell between 0 and 11),
  outcome text check (outcome in ('goal', 'saved', 'missed')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (match_id, minute)
);

create index if not exists career_match_shots_match_idx on career_match_shots (match_id);
alter table career_match_shots enable row level security;

-- Første valg gjelder: coalesce gjør at et nytt trykk ikke overskriver det som alt er valgt,
-- og raden røres ikke i det hele tatt etter at utfallet er avgjort.
create or replace function public.record_shot_choice(
  target_match uuid,
  target_minute integer,
  target_kind text,
  target_side text,
  target_role text,
  target_cell integer
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if target_role not in ('shooter', 'keeper') then
    raise exception 'Ukjent rolle';
  end if;

  insert into career_match_shots (match_id, minute, kind, side, shooter_cell, keeper_cell)
  values (
    target_match,
    target_minute,
    target_kind,
    target_side,
    case when target_role = 'shooter' then target_cell end,
    case when target_role = 'keeper' then target_cell end
  )
  on conflict (match_id, minute) do update
  set
    shooter_cell = case
      when target_role = 'shooter' then coalesce(career_match_shots.shooter_cell, excluded.shooter_cell)
      else career_match_shots.shooter_cell
    end,
    keeper_cell = case
      when target_role = 'keeper' then coalesce(career_match_shots.keeper_cell, excluded.keeper_cell)
      else career_match_shots.keeper_cell
    end
  where career_match_shots.outcome is null;
end;
$$;

-- Oppgjøret må vente til kampen faktisk er ferdig. Lengden varierer nå med antall straffer
-- og store sjanser, siden klokka står stille i ti sekunder for hver av dem:
-- 120 sek spill + 5 sek pause + 10 sek byttevindu + 10 sek per skudd.
create or replace function public.settle_finished_manager_matches(target_match uuid default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  match_row career_matches%rowtype;
  home_goals integer;
  away_goals integer;
  shot_count integer;
  planned_seconds numeric;
  match_winner uuid;
  settled_count integer := 0;
begin
  for match_row in
    select *
    from career_matches
    where mode = 'manager'
      and status = 'live'
      and started_at <= now() - interval '135 seconds'
      and (target_match is null or id = target_match)
    order by started_at asc
    for update skip locked
  loop
    select count(*) into shot_count
    from jsonb_array_elements(match_row.events) as event(value)
    where event.value ->> 'type' = 'shot';

    planned_seconds := 135 + shot_count * 10;
    if match_row.started_at > now() - make_interval(secs => planned_seconds) then
      continue;
    end if;

    select
      count(*) filter (where goal.event ->> 'side' = 'home'),
      count(*) filter (where goal.event ->> 'side' = 'away')
    into home_goals, away_goals
    from jsonb_array_elements(match_row.events) as goal(event)
    where goal.event ->> 'type' = 'goal';

    -- Mål fra straffer og store sjanser lever i sin egen tabell, ikke i events.
    home_goals := home_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'home' and outcome = 'goal');
    away_goals := away_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'away' and outcome = 'goal');

    match_winner := case
      when home_goals = away_goals then null
      when home_goals > away_goals then match_row.home_user_id
      else match_row.away_user_id
    end;

    update career_matches
    set
      status = 'completed',
      home_score = home_goals,
      away_score = away_goals,
      winner_id = match_winner,
      completed_at = now(),
      events = case
        when exists (
          select 1 from jsonb_array_elements(match_row.events) as event
          where event ->> 'type' = 'full_time'
        ) then match_row.events
        else match_row.events || jsonb_build_array(jsonb_build_object(
          'type', 'full_time',
          'minute', 90,
          'homeScore', home_goals,
          'awayScore', away_goals
        ))
      end
    where id = match_row.id and status = 'live';

    if not found then
      continue;
    end if;

    if match_row.challenge_id is not null then
      update career_challenges
      set status = 'completed'
      where id = match_row.challenge_id and status <> 'completed';
    end if;

    if match_winner is null then
      perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
    else
      perform award_manager_match_result(match_winner, match_row.id, 'manager_win', 5, 'manager_career_wins');
      perform award_manager_match_result(
        case when match_winner = match_row.home_user_id then match_row.away_user_id else match_row.home_user_id end,
        match_row.id,
        'manager_loss',
        0,
        'manager_career_losses'
      );
    end if;

    settled_count := settled_count + 1;
  end loop;

  return settled_count;
end;
$$;

revoke all on function public.record_shot_choice(uuid, integer, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
grant execute on function public.record_shot_choice(uuid, integer, text, text, text, integer) to service_role;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;
