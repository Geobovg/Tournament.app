-- Rettelse av nullstillingen i 0079: alle skulle starte nederst på stigen, i divisjon 10 på Gamle Gress
-- (arena 1), ikke på Camp Nou.
-- * Pågående AI-sesonger slettes, og alle får en ny sesong i divisjon 10 på Gamle Gress.
-- * Arenaene regnes ikke lenger som nådd, så belønningen for en ny arena gis igjen når man når den.
-- * Det personlige kortet settes tilbake til 70 og teller nivåer fra bunnen av stigen og fra nå:
--   divisjon 1 på Camp Nou gir 119, og første mestertittel etter nullstillingen gir 120.
-- Kort, MB og pakker røres ikke; de ble nullstilt i 0079.

update personal_cards set ladder_start = 0, counted_from = now();
update manager_cards card set overall = 70, attributes = public.personal_card_attributes(70)
from personal_cards personal where personal.card_id = card.id;

delete from career_ai_seasons where status = 'active';
delete from career_arena_unlocks;

do $$
declare
  profile_id uuid;
begin
  for profile_id in select user_id from player_profiles loop
    perform public.create_ai_season(profile_id, 1, 10,
      coalesce((select max(season_number) from career_ai_seasons where user_id = profile_id), 0) + 1);
  end loop;
end $$;
