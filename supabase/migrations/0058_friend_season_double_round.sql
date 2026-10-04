-- Vennesesongen får dobbel serie (alle møter alle hjemme og borte) når det er 10 eller færre managere.
-- Er det flere, møtes alle bare én gang. Sesonger som allerede er i gang beholder oppsettet sitt.
create or replace function public.start_friend_season(target_user uuid, target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_row career_friend_seasons%rowtype;
  players uuid[];
  player_count integer;
  first_slots uuid[];
  slots uuid[];
  slot_count integer;
  rounds_per_leg integer;
  leg_count integer;
  leg integer;
  round_index integer;
  pair_index integer;
  home_player uuid;
  away_player uuid;
begin
  select * into season_row from career_friend_seasons where id = target_season for update;
  if not found or season_row.created_by <> target_user then raise exception 'Bare den som opprettet sesongen kan starte den'; end if;
  if season_row.status <> 'open' then raise exception 'Sesongen er allerede i gang'; end if;
  delete from career_friend_season_members where season_id = target_season and status <> 'joined';
  select array_agg(user_id order by random()) into players from career_friend_season_members where season_id = target_season;
  player_count := coalesce(array_length(players, 1), 0);
  if player_count < 2 then raise exception 'Minst to managere må ha blitt med'; end if;

  -- Oddetall får en «fri runde» (null), så sirkelmetoden går opp.
  first_slots := case when player_count % 2 = 1 then players || array[null::uuid] else players end;
  slot_count := array_length(first_slots, 1);
  rounds_per_leg := slot_count - 1;
  leg_count := case when player_count <= 10 then 2 else 1 end;
  for leg in 0..leg_count - 1 loop
    -- Andre runde i serien har samme rekkefølge, men med hjemme og borte byttet.
    slots := first_slots;
    for round_index in 0..rounds_per_leg - 1 loop
      for pair_index in 0..slot_count / 2 - 1 loop
        home_player := slots[pair_index + 1];
        away_player := slots[slot_count - pair_index];
        if home_player is not null and away_player is not null then
          if (round_index % 2 = 1) <> (leg = 1) then
            insert into career_season_matches (friend_season_id, round, home_user_id, away_user_id) values (target_season, leg * rounds_per_leg + round_index + 1, away_player, home_player);
          else
            insert into career_season_matches (friend_season_id, round, home_user_id, away_user_id) values (target_season, leg * rounds_per_leg + round_index + 1, home_player, away_player);
          end if;
        end if;
      end loop;
      -- Roter alle unntatt første plass.
      slots := array[slots[1]] || array[slots[slot_count]] || slots[2:slot_count - 1];
    end loop;
  end loop;

  update career_friend_seasons set status = 'active', started_at = now() where id = target_season;
end;
$fn$;

-- Premiene avhenger av hvor mange som er med:
-- under 5 managere får bare vinneren premie, 5–6 gir premie til topp 2, og 7 eller flere til topp 3.
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
  prize_places := case when member_count < 5 then 1 when member_count <= 6 then 2 else 3 end;
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

revoke all on function public.start_friend_season(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_friend_season(uuid) from public, anon, authenticated;
grant execute on function public.start_friend_season(uuid, uuid) to service_role;
grant execute on function public.finish_friend_season(uuid) to service_role;
