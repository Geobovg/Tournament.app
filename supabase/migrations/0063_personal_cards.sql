-- Personlige kort: et kort av en ekte manager i appen, med bilde av personen selv.
-- * Hver manager kan ha ett personlig kort, og bare eieren kan ha det. Kortet deles ut med
--   grant_personal_card (se nederst) når bildet er lagt i public/personal/<slug>.png.
-- * Kortet kan spille alle posisjoner (position = 'ALL'). I kampen tar det posisjonen til plassen det står på.
-- * Kortet kan ikke selges, hurtigselges, legges ut på markedet, byttes bort, leveres i SBC, kastes
--   eller trekkes i pakker. Det ligger ikke i katalogen.
-- * Ratingen starter på 80 og går opp 1 for hvert nytt nivå på AI-stigen (5 arenaer × 10 divisjoner).
--   Det er det høyeste nivået man har nådd som teller: rykker man ned, blir kortet ikke dårligere,
--   og man får ingen oppgradering før man er forbi det høyeste nivået igjen. Nivåer man allerede har
--   nådd før kortet ble laget, teller også.
-- * Kortet har ikke taket på 99 som andre kort. Divisjon 1 på Camp Nou gir 129, og første mestertittel
--   er det siste steget opp: 130.

create table if not exists personal_cards (
  user_id uuid primary key references profiles(id) on delete cascade,
  card_id uuid not null unique references manager_cards(id) on delete cascade,
  -- Filnavnet på bildet, uten .png, f.eks. personal-theodor. Det må også stå i personalPhotos i src/lib/player-photos.ts.
  slug text not null unique check (slug ~ '^personal-[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);
alter table personal_cards enable row level security;

-- Bare personlige kort (posisjon ALL) kan gå forbi 99.
alter table manager_cards drop constraint if exists manager_cards_overall_check;
alter table manager_cards add constraint manager_cards_overall_check
  check (overall between 40 and 99 or (position = 'ALL' and overall between 40 and 130));

-- 1) Ratingen. Nivå 0 er divisjon 10 i Gamle Gress, nivå 49 er divisjon 1 på Camp Nou.
create or replace function public.ai_ladder_level(target_arena integer, target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select (least(greatest(target_arena, 1), 5) - 1) * 10 + (10 - least(greatest(target_division, 1), 10)) $fn$;

create or replace function public.personal_card_overall(target_user uuid)
returns integer language sql stable set search_path = public, pg_temp
as $fn$
  select 80
    + coalesce((select max(public.ai_ladder_level(arena, division)) from career_ai_seasons where user_id = target_user), 0)
    + case when exists (select 1 from career_ai_seasons where user_id = target_user and outcome = 'champion') then 1 else 0 end
$fn$;

-- Alle seks attributtene er lik ratingen: kortet er like godt overalt på banen.
create or replace function public.personal_card_attributes(target_overall integer)
returns jsonb language sql immutable set search_path = public, pg_temp
as $fn$
  select jsonb_build_object('pace', target_overall, 'shooting', target_overall, 'passing', target_overall,
    'dribbling', target_overall, 'defending', target_overall, 'physical', target_overall)
$fn$;

-- Kortet blir aldri dårligere, selv om noe skulle gi et lavere tall.
create or replace function public.refresh_personal_card(target_user uuid)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  next_overall integer := public.personal_card_overall(target_user);
begin
  update manager_cards card
  set overall = greatest(card.overall, next_overall), attributes = public.personal_card_attributes(greatest(card.overall, next_overall))
  from personal_cards personal
  where personal.user_id = target_user and card.id = personal.card_id and card.overall < next_overall;
end;
$fn$;

-- En ny AI-sesong lages når man når en divisjon. Mestertittelen står i outcome når sesongen er ferdig.
create or replace function public.refresh_personal_card_on_season()
returns trigger language plpgsql set search_path = public, pg_temp
as $fn$
begin
  perform public.refresh_personal_card(new.user_id);
  return null;
end;
$fn$;

drop trigger if exists career_ai_seasons_refresh_personal_card on career_ai_seasons;
create trigger career_ai_seasons_refresh_personal_card
  after insert or update of arena, division, outcome on career_ai_seasons
  for each row execute function public.refresh_personal_card_on_season();

-- 2) Sperrene. De ligger i triggere, så alle veier ut av klubben er stengt, også de som kommer senere.
create or replace function public.is_personal_card(target_card uuid)
returns boolean language sql stable set search_path = public, pg_temp
as $fn$ select exists (select 1 from personal_cards where card_id = target_card) $fn$;

-- Kortet kan ikke slettes (hurtigsalg, kasting, SBC) eller bytte eier (markedet).
-- Slettes hele kontoen, er profilen allerede borte når kortet slettes, og da går det greit.
-- Skal en administrator fjerne et kort, slettes raden i personal_cards først.
create or replace function public.protect_personal_card()
returns trigger language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'DELETE' then
    if public.is_personal_card(old.id) and exists (select 1 from profiles where id = old.owner_id) then
      raise exception 'Personlige kort kan ikke selges, byttes eller leveres inn';
    end if;
    return old;
  end if;
  if new.owner_id is distinct from old.owner_id and public.is_personal_card(old.id) then
    raise exception 'Personlige kort kan ikke selges, byttes eller leveres inn';
  end if;
  return new;
end;
$fn$;

drop trigger if exists manager_cards_protect_personal on manager_cards;
create trigger manager_cards_protect_personal
  before delete or update of owner_id on manager_cards
  for each row execute function public.protect_personal_card();

create or replace function public.reject_personal_card_listing()
returns trigger language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if public.is_personal_card(new.card_id) then
    raise exception 'Personlige kort kan ikke selges, byttes eller leveres inn';
  end if;
  return new;
end;
$fn$;

drop trigger if exists market_listings_reject_personal on market_listings;
create trigger market_listings_reject_personal
  before insert on market_listings
  for each row execute function public.reject_personal_card_listing();

-- 3) Deler ut kortet. Kjøres for hånd i SQL-editoren, f.eks.
--      select public.grant_personal_card('Theodor', 'Theodor', 'personal-theodor');
--    Første argument er brukernavnet i appen, andre er navnet på kortet, tredje er bildefilen uten .png.
--    Kortet havner i troppen hvis det er plass, ellers på lageret.
create or replace function public.grant_personal_card(target_username text, card_name text, card_slug text)
returns uuid language plpgsql set search_path = public, pg_temp
as $fn$
declare
  target_user uuid;
  card_overall integer;
  slot text;
  new_card uuid;
begin
  select id into target_user from profiles where username_key = lower(trim(target_username));
  if target_user is null then raise exception 'Fant ingen manager med brukernavnet %', target_username; end if;
  if exists (select 1 from personal_cards where user_id = target_user) then raise exception '% har allerede et personlig kort', target_username; end if;
  -- Har personen aldri åpnet managerkarrieren, lages profilen (og startertroppen) nå.
  insert into player_profiles (user_id) values (target_user) on conflict (user_id) do nothing;
  card_overall := public.personal_card_overall(target_user);
  slot := coalesce(public.next_card_location(target_user), 'storage');
  insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, tradable, is_starter, acquired_price, location)
  values (target_user, null, trim(card_name), 'ALL', card_overall, public.personal_card_attributes(card_overall), false, false, 0, slot)
  returning id into new_card;
  insert into personal_cards (user_id, card_id, slug) values (target_user, new_card, card_slug);
  return new_card;
end;
$fn$;

revoke all on function public.ai_ladder_level(integer, integer) from public, anon, authenticated;
revoke all on function public.personal_card_overall(uuid) from public, anon, authenticated;
revoke all on function public.personal_card_attributes(integer) from public, anon, authenticated;
revoke all on function public.refresh_personal_card(uuid) from public, anon, authenticated;
revoke all on function public.refresh_personal_card_on_season() from public, anon, authenticated;
revoke all on function public.is_personal_card(uuid) from public, anon, authenticated;
revoke all on function public.protect_personal_card() from public, anon, authenticated;
revoke all on function public.reject_personal_card_listing() from public, anon, authenticated;
revoke all on function public.grant_personal_card(text, text, text) from public, anon, authenticated;
grant execute on function public.ai_ladder_level(integer, integer) to service_role;
grant execute on function public.personal_card_overall(uuid) to service_role;
grant execute on function public.personal_card_attributes(integer) to service_role;
grant execute on function public.refresh_personal_card(uuid) to service_role;
grant execute on function public.is_personal_card(uuid) to service_role;
grant execute on function public.grant_personal_card(text, text, text) to service_role;
