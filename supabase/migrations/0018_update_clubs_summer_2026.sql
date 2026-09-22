-- Oppdaterer klubb for spillere som byttet lag i overgangsvinduet sommeren 2026.
-- Kilder: klubbenes egne 2026/27-stallister og ESPNs oversikt over Premier League-overganger,
-- kontrollert 22.09.2026. Utlånte spillere står oppført på klubben de spiller for nå.
with club_map (slug, club) as (
  values
    -- Premier League
    ('bruno-guimaraes', 'Arsenal'),
    ('jakub-kiwior', 'FC Porto'), ('leandro-trossard', 'Beşiktaş'), ('christian-norgaard', 'Everton'),
    ('gabriel-jesus', 'Barcelona'), ('ethan-nwaneri', 'Borussia Dortmund'),
    ('enzo-fernandez', 'Manchester City'),
    ('manuel-akanji', 'Inter'), ('john-stones', 'Inter'), ('bernardo-silva', 'Real Madrid'),
    ('nathan-ake', 'Fenerbahçe'), ('james-trafford', 'Leeds United'), ('rodri', 'Barcelona'),
    ('tijjani-reijnders', 'Al-Qadsiah'), ('savinho', 'Tottenham Hotspur'), ('marmoush', 'Tottenham Hotspur'),
    ('nico-gonzalez', 'Newcastle United'), ('claudio-echeverri', 'Benfica'), ('stefan-ortega', 'Uten klubb'),
    ('salah', 'Trabzonspor'), ('andrew-robertson', 'Tottenham Hotspur'), ('konate', 'Real Madrid'),
    ('curtis-jones', 'Inter'), ('harvey-elliott', 'Valencia'),
    ('araujo', 'Liverpool'), ('bradley-barcola', 'Liverpool'),
    ('marc-cucurella', 'Real Madrid'), ('liam-delap', 'Nottingham Forest'), ('robert-sanchez', 'Como'),
    ('garnacho', 'Aston Villa'), ('emiliano-martinez', 'Chelsea'),
    ('casemiro', 'Inter Miami'), ('andre-onana', 'Trabzonspor'), ('marcus-rashford', 'Manchester United'),
    ('gordon', 'Barcelona'), ('tonali', 'Tottenham Hotspur'),
    ('watkins', 'Al-Hilal'), ('leon-goretzka', 'Aston Villa'),
    ('strand-larsen', 'Crystal Palace'),

    -- La Liga
    ('carvajal', 'Uten klubb'), ('david-alaba', 'Uten klubb'),
    ('fran-garcia', 'Real Betis'), ('gonzalo-garcia', 'Fulham'),
    ('lewandowski', 'Chicago Fire'), ('ferran-torres', 'Paris Saint-Germain'),
    ('ter-stegen', 'Ajax'), ('inigo-martinez', 'Al-Nassr'), ('pau-victor', 'SC Braga'),
    ('karim-adeyemi', 'Barcelona'),
    ('antoine-griezmann', 'Orlando City'), ('clement-lenglet', 'Benfica'),
    ('grimaldo', 'Atlético Madrid'), ('lookman', 'Atlético Madrid'),
    ('jonathan-david', 'Atlético Madrid'), ('lee-kang-in', 'Atlético Madrid'),

    -- Bundesliga
    ('raphael-guerreiro', 'Uten klubb'), ('joao-palhinha', 'Benfica'),
    ('leroy-sane', 'Galatasaray'), ('mathys-tel', 'Tottenham Hotspur'),
    ('julian-brandt', 'Ajax'),

    -- Serie A
    ('sommer', 'Club Brugge'), ('francesco-acerbi', 'Uten klubb'),
    ('denzel-dumfries', 'Real Madrid'), ('davide-frattesi', 'Lazio'),
    ('leao', 'Galatasaray'), ('goncalo-ramos', 'AC Milan'),
    ('vlahovic', 'Beşiktaş'), ('openda', 'Lyon'), ('michele-di-gregorio', 'AFC Bournemouth'),

    -- Øvrige
    ('enesyri', 'Al-Ittihad')
)
update player_catalog as catalog
set club = club_map.club
from club_map
where catalog.slug = club_map.slug and catalog.club is distinct from club_map.club;
