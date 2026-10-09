-- Ny start i Managerkarrieren: alle starter på nytt, likt.
-- * Alle kort, lag, annonser, bud og pakker slettes. Alle får 120 MB og Academy-troppen.
-- * Det personlige kortet beholdes, men starter på nytt på 70. Det går opp 1 for hvert nytt nivå man når
--   på AI-stigen etter nullstillingen, og første mestertittel etter nullstillingen gir +1.
-- * Alle settes til divisjon 10 på Camp Nou (arena 5). Sesonger som pågår, avsluttes uten resultat;
--   ferdige sesonger blir stående i historikken. Arenabelønningene er allerede gitt og gis ikke på nytt.
-- * Klubbnivå, XP, kamphistorikk, SBC-historikk, vennesesonger, turneringer og Femmer røres ikke.

-- 1) Det personlige kortet regner nivåer fra et startpunkt. Nye kort teller fra bunnen av stigen
--    (nivå 0) og alle sesonger, som før; kortene som finnes nå, teller fra nivå 40 og nullstillingen.
alter table personal_cards add column if not exists ladder_start integer not null default 0 check (ladder_start between 0 and 49);
alter table personal_cards add column if not exists counted_from timestamptz not null default '-infinity';

create or replace function public.personal_card_overall(target_user uuid)
returns integer language sql stable set search_path = public, pg_temp
as $fn$
  with personal as (
    select coalesce((select ladder_start from personal_cards where user_id = target_user), 0) as ladder_start,
      coalesce((select counted_from from personal_cards where user_id = target_user), '-infinity'::timestamptz) as counted_from
  ), seasons as (
    select season.* from career_ai_seasons season, personal
    where season.user_id = target_user and season.created_at >= personal.counted_from
  )
  select 70
    + greatest(0, coalesce((select max(public.ai_ladder_level(arena, division)) from seasons), 0) - (select ladder_start from personal))
    + case when exists (select 1 from seasons where outcome = 'champion') then 1 else 0 end
$fn$;

-- 2) Startertroppen lages også når man bare har det personlige kortet, og det kortet settes på benken.
create or replace function public.seed_manager_starter_squad(target_user uuid) returns void
language plpgsql set search_path = public, pg_temp
as $fn$
declare
  card_ids uuid[];
  personal_card uuid;
begin
  if exists (select 1 from manager_cards where owner_id = target_user and not public.is_personal_card(id)) then return; end if;
  select card_id into personal_card from personal_cards where user_id = target_user;
  with inserted as (
    insert into manager_cards (owner_id, name, position, overall, tradable, is_starter, attributes)
    select target_user, name, position, overall, false, true, jsonb_build_object('pace', overall, 'shooting', overall, 'passing', overall, 'dribbling', overall, 'defending', overall, 'physical', overall)
    from (values (1, 'Academy GK', 'GK', 58), (2, 'Academy RB', 'RB', 57), (3, 'Academy CB', 'CB', 60), (4, 'Academy CB', 'CB', 59), (5, 'Academy LB', 'LB', 57), (6, 'Academy CM', 'CM', 60), (7, 'Academy CM', 'CM', 59), (8, 'Academy RW', 'RW', 58), (9, 'Academy CAM', 'CAM', 61), (10, 'Academy LW', 'LW', 58), (11, 'Academy ST', 'ST', 61)) as squad(slot, name, position, overall)
    order by slot
    returning id
  ) select array_agg(id) into card_ids from inserted;
  insert into manager_lineups (user_id, starters, bench)
  values (target_user, card_ids, case when personal_card is null then '{}'::uuid[] else array[personal_card] end)
  on conflict (user_id) do nothing;
end;
$fn$;

revoke all on function public.seed_manager_starter_squad(uuid) from public, anon, authenticated;

-- 3) Nullstillingen.
update career_challenges set status = 'expired' where status in ('pending', 'accepted');
delete from market_bids;
delete from market_listings;
delete from manager_lineups;
delete from manager_cards card where not exists (select 1 from personal_cards personal where personal.card_id = card.id);
delete from manager_pack_inventory;
update player_profiles set manager_budget = 120, manager_budget_earned = 120, updated_at = now();

update personal_cards set ladder_start = public.ai_ladder_level(5, 10), counted_from = now();
update manager_cards card set overall = 70, attributes = public.personal_card_attributes(70), location = 'squad'
from personal_cards personal where personal.card_id = card.id;

-- Pågående AI-sesonger slettes (med kampoppsettet), og alle får en ny sesong i divisjon 10 på Camp Nou.
delete from career_ai_seasons where status = 'active';
insert into career_arena_unlocks (user_id, arena)
select profile.user_id, arena from player_profiles profile cross join generate_series(2, 5) as arena
on conflict (user_id, arena) do nothing;

do $$
declare
  profile_id uuid;
begin
  for profile_id in select user_id from player_profiles loop
    perform public.seed_manager_starter_squad(profile_id);
    perform public.create_ai_season(profile_id, 5, 10,
      coalesce((select max(season_number) from career_ai_seasons where user_id = profile_id), 0) + 1);
  end loop;
end $$;
