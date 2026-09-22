-- Retter klubb for spillerne som ikke ble bekreftet i 0018, kontrollert mot Wikipedia 22.09.2026.
-- Fire av dem er utlånt for 2026/27 og står på klubben de faktisk spiller for, som ellers i katalogen.
with club_map (slug, club) as (
  values
    ('nypan', 'Lommel SK'),              -- utlånt fra Manchester City 11.07.2026
    ('marc-casado', 'Deportivo La Coruña'), -- utlånt fra Barcelona 01.09.2026
    ('darwin-nunez', 'Al-Diriyah'),      -- utlånt fra Al-Hilal 22.08.2026
    ('dovbyk', 'Bologna'),               -- utlånt fra Roma 30.07.2026
    ('thorsby', 'Cremonese')             -- permanent overgang fra Genoa 02.02.2026
)
update player_catalog as catalog
set club = club_map.club
from club_map
where catalog.slug = club_map.slug and catalog.club is distinct from club_map.club;
