-- Vennesesonger får en invitasjonslenke (/join/sesong/KODE). Alle som har lenken kan bli med
-- mens sesongen ennå ikke er startet, også de som ikke er venner med den som opprettet den.
-- Eksisterende sesonger får en kode hver, siden standardverdien regnes ut per rad.
alter table career_friend_seasons add column if not exists invite_code text not null default public.generate_invite_code();
create unique index if not exists career_friend_seasons_invite_code_idx on career_friend_seasons (invite_code);

-- Låser sesongen som start_friend_season gjør, så ingen blir med etter at kampoppsettet er laget.
-- Den som allerede var invitert, regnes som at de har takket ja.
create or replace function public.join_friend_season(target_user uuid, target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_status text;
begin
  select status into season_status from career_friend_seasons where id = target_season for update;
  if not found or season_status <> 'open' then raise exception 'Sesongen er allerede i gang'; end if;
  insert into career_friend_season_members (season_id, user_id, status, joined_at)
  values (target_season, target_user, 'joined', now())
  on conflict (season_id, user_id) do update set status = 'joined', joined_at = coalesce(career_friend_season_members.joined_at, now());
end;
$fn$;

revoke all on function public.join_friend_season(uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_friend_season(uuid, uuid) to service_role;
