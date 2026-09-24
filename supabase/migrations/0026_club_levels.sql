-- Klubbnivå: manager- og turneringskamper gir XP, og hvert opprykk gir MB og etter hvert gratis Gullpakker.
-- Kurven og belønningene speiles i src/lib/club-level.ts, så de to må endres sammen.

alter table public.player_profiles
  add column if not exists club_xp integer not null default 0 check (club_xp >= 0);

alter table public.career_reward_events
  add column if not exists club_xp integer not null default 0 check (club_xp >= 0);

-- Opprykk lagres som egne belønningshendelser. Den gamle sjekken på source_type byttes ut uansett hva den heter.
do $fn$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.career_reward_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%source_type%'
  loop
    execute format('alter table public.career_reward_events drop constraint %I', constraint_name);
  end loop;
end
$fn$;

alter table public.career_reward_events
  add constraint career_reward_events_source_type_check check (source_type in (
    'starter', 'tournament_match', 'tournament_champion', 'tournament_finalist', 'career_match', 'market_sale', 'club_level'
  ));

-- Gratispakker fra opprykk ligger her til spilleren åpner dem, fordi åpning kan stoppes av duplikater eller full tropp.
create table if not exists public.manager_pack_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_key text not null references public.manager_packs(key),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, pack_key)
);
alter table public.manager_pack_inventory enable row level security;

-- Nivå 1 til 10 koster 100 XP per nivå, deretter 150 XP per nivå.
create or replace function public.club_level_for_xp(xp integer)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select case when xp < 900 then 1 + xp / 100 else 10 + (xp - 900) / 150 end
$fn$;

create or replace function public.grant_club_xp(target_user uuid, amount integer)
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  old_xp integer;
  old_level integer;
  new_level integer;
  reward_id uuid;
  reward_budget integer;
  reward_packs integer;
begin
  if amount <= 0 then return 0; end if;
  select club_xp into old_xp from player_profiles where user_id = target_user for update;
  if not found then return 0; end if;

  old_level := club_level_for_xp(old_xp);
  new_level := club_level_for_xp(old_xp + amount);
  update player_profiles set club_xp = old_xp + amount, updated_at = now() where user_id = target_user;

  for reached in old_level + 1 .. new_level loop
    reward_budget := case when reached <= 4 then 10 when reached <= 9 then 20 else 50 end;
    reward_packs := case when reached <= 4 then 0 when reached <= 9 then 1 else 2 end;

    -- Kilden er brukeren selv, slik at unik-nøkkelen stopper dobbel utbetaling av samme nivå.
    insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
    values (target_user, 'club_level', target_user, 'level_' || reached, reward_budget)
    on conflict (user_id, source_type, source_id, reward_key) do nothing
    returning id into reward_id;

    if reward_id is not null then
      update player_profiles
      set manager_budget = manager_budget + reward_budget,
          manager_budget_earned = manager_budget_earned + reward_budget,
          updated_at = now()
      where user_id = target_user;

      if reward_packs > 0 then
        insert into manager_pack_inventory (user_id, pack_key, quantity)
        values (target_user, 'gull', reward_packs)
        on conflict (user_id, pack_key) do update
          set quantity = manager_pack_inventory.quantity + excluded.quantity, updated_at = now();
      end if;
    end if;
  end loop;

  return new_level;
end;
$fn$;

-- Samme signatur som før, så settle_finished_manager_matches trenger ingen endring.
create or replace function public.award_manager_match_result(
  target_user uuid,
  target_match uuid,
  target_reward_key text,
  target_manager_budget integer,
  target_record_column text
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  reward_id uuid;
  reward_xp integer;
begin
  reward_xp := case target_reward_key when 'manager_win' then 30 when 'manager_draw' then 15 when 'manager_loss' then 10 else 0 end;

  insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget, club_xp)
  values (target_user, 'career_match', target_match, target_reward_key, target_manager_budget, reward_xp)
  on conflict (user_id, source_type, source_id, reward_key) do nothing
  returning id into reward_id;

  if reward_id is null then
    return false;
  end if;

  update player_profiles
  set
    manager_budget = manager_budget + target_manager_budget,
    manager_budget_earned = manager_budget_earned + target_manager_budget,
    updated_at = now()
  where user_id = target_user;

  perform increment_career_record(target_user, target_record_column);
  perform grant_club_xp(target_user, reward_xp);
  return true;
end;
$fn$;

-- En gratispakke åpnes med den vanlige pakkelogikken. Prisen legges inn i budsjettet rett før og trekkes
-- av open_manager_pack igjen, så alle regler for duplikater og plass gjelder likt. Feiler åpningen, rulles alt tilbake.
create or replace function public.open_free_manager_pack(target_user uuid, target_pack text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  pack_price integer;
  pulls jsonb;
begin
  update manager_pack_inventory
  set quantity = quantity - 1, updated_at = now()
  where user_id = target_user and pack_key = target_pack and quantity > 0;
  if not found then raise exception 'Du har ingen gratis pakker av denne typen'; end if;

  select price into pack_price from manager_packs where key = target_pack and active;
  if not found then raise exception 'Pakken finnes ikke'; end if;

  update player_profiles set manager_budget = manager_budget + pack_price where user_id = target_user;
  pulls := open_manager_pack(target_user, target_pack);

  update pack_openings set price = 0
  where id = (select id from pack_openings where user_id = target_user and pack_key = target_pack order by created_at desc limit 1);
  return pulls;
end;
$fn$;

revoke all on function public.club_level_for_xp(integer) from public, anon, authenticated;
revoke all on function public.grant_club_xp(uuid, integer) from public, anon, authenticated;
revoke all on function public.award_manager_match_result(uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.open_free_manager_pack(uuid, text) from public, anon, authenticated;

-- Engangsutdeling for kamper spilt før klubbnivå fantes. Hendelser som allerede har XP hoppes over,
-- så en ny kjøring av migrasjonen gir ikke dobbelt opp.
do $fn$
declare
  earned record;
begin
  for earned in
    select user_id, sum(case
      when source_type = 'career_match' and reward_key = 'manager_win' then 30
      when source_type = 'career_match' and reward_key = 'manager_draw' then 15
      when source_type = 'career_match' and reward_key = 'manager_loss' then 10
      when source_type = 'tournament_match' and reward_key = 'win' then 20
      when source_type = 'tournament_match' and reward_key = 'draw' then 10
      when source_type = 'tournament_match' and reward_key = 'loss' then 5
      else 0 end)::integer as xp
    from career_reward_events
    where club_xp = 0 and source_type in ('career_match', 'tournament_match')
    group by user_id
  loop
    perform grant_club_xp(earned.user_id, earned.xp);
  end loop;

  update career_reward_events
  set club_xp = case
    when source_type = 'career_match' and reward_key = 'manager_win' then 30
    when source_type = 'career_match' and reward_key = 'manager_draw' then 15
    when source_type = 'career_match' and reward_key = 'manager_loss' then 10
    when source_type = 'tournament_match' and reward_key = 'win' then 20
    when source_type = 'tournament_match' and reward_key = 'draw' then 10
    when source_type = 'tournament_match' and reward_key = 'loss' then 5
    else 0 end
  where club_xp = 0 and source_type in ('career_match', 'tournament_match');
end
$fn$;
