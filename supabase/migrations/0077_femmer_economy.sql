-- Femmer: strammere økonomi.
-- * Gratispakken er fjernet. open_five_pack tar bare imot pakker som koster mynter.
-- * Kampene gir 40 mynter for seier, 15 for uavgjort og 0 for tap (regnes ut i src/lib/femmer/rules.ts).
-- * Oppgradering med mynter starter lavere og blir brattere jo høyere kortet er:
--   60 + 10 per rating over 70 + (rating over 70)². 60 fra 70, 260 fra 80, 660 fra 90, 1124 fra 98.
--   Speiler fiveUpgradeCost i src/lib/femmer/rules.ts.

create or replace function public.five_upgrade_cost(current_overall integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select 60 + greatest(0, current_overall - 70) * 10 + greatest(0, current_overall - 70) * greatest(0, current_overall - 70) $fn$;

create or replace function public.open_five_pack(target_user uuid, card_count integer, pack_price integer)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if card_count < 1 or card_count > 5 or pack_price <= 0 then raise exception 'Ugyldig pakke'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  update five_profiles set coins = coins - pack_price where user_id = target_user and coins >= pack_price;
  if not found then raise exception 'Du har ikke nok mynter'; end if;
  return public.five_pull_cards(target_user, card_count, false);
end;
$fn$;

revoke all on function public.five_upgrade_cost(integer) from public, anon, authenticated;
revoke all on function public.open_five_pack(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.five_upgrade_cost(integer) to service_role;
grant execute on function public.open_five_pack(uuid, integer, integer) to service_role;
