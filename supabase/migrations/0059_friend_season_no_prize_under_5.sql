-- Vennesesonger med færre enn 5 managere gir ingen premie.
-- 5–6 managere gir fortsatt premie til topp 2, og 7 eller flere til topp 3.
-- 1. plass: 1 elitepakke, 2 gullpakker og 50 MB. 2. plass: 2 gullpakker og 50 MB. 3. plass: 1 gullpakke og 25 MB.
create or replace function public.finish_friend_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  standing record;
  member_count integer;
  prize_places integer;
  reward_budget integer;
  gold_packs integer;
  elite_packs integer;
begin
  perform 1 from career_friend_seasons where id = target_season and status = 'active' for update;
  if not found then return; end if;
  if exists (select 1 from career_season_matches where friend_season_id = target_season and status <> 'completed') then return; end if;
  update career_friend_seasons set status = 'completed', completed_at = now() where id = target_season;
  select count(*) into member_count from career_friend_season_members where season_id = target_season;
  prize_places := case when member_count < 5 then 0 when member_count <= 6 then 2 else 3 end;
  for standing in select * from public.season_standings(null, target_season) loop
    update career_friend_season_members set final_position = standing.table_position where season_id = target_season and user_id = standing.participant::uuid;
    if standing.table_position > prize_places then continue; end if;
    reward_budget := case standing.table_position when 1 then 50 when 2 then 50 else 25 end;
    gold_packs := case standing.table_position when 1 then 2 when 2 then 2 else 1 end;
    elite_packs := case standing.table_position when 1 then 1 else 0 end;
    insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
    values (standing.participant::uuid, 'friend_season', target_season, 'position_' || standing.table_position, reward_budget)
    on conflict (user_id, source_type, source_id, reward_key) do nothing;
    if found then
      update player_profiles set manager_budget = manager_budget + reward_budget, manager_budget_earned = manager_budget_earned + reward_budget, updated_at = now() where user_id = standing.participant::uuid;
      insert into manager_pack_inventory (user_id, pack_key, quantity) values (standing.participant::uuid, 'gull', gold_packs)
      on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + gold_packs, updated_at = now();
      if elite_packs > 0 then
        insert into manager_pack_inventory (user_id, pack_key, quantity) values (standing.participant::uuid, 'elite', elite_packs)
        on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + elite_packs, updated_at = now();
      end if;
    end if;
  end loop;
end;
$fn$;

revoke all on function public.finish_friend_season(uuid) from public, anon, authenticated;
grant execute on function public.finish_friend_season(uuid) to service_role;
