-- Klubb som metadata på spillerkatalogen, slik at spillermarkedet kan filtreres på klubb.
-- Dette er ren tekst – ingen logoer, merker eller andre lisensierte ressurser.
alter table player_catalog add column if not exists club text not null default 'Ukjent klubb';

with club_map (slug, club) as (
  values
    -- Arsenal
    ('odegaard', 'Arsenal'), ('saka', 'Arsenal'), ('saliba', 'Arsenal'), ('raya', 'Arsenal'),
    ('declan-rice', 'Arsenal'), ('zubimendi', 'Arsenal'), ('eze', 'Arsenal'), ('gyokeres', 'Arsenal'),
    ('gabriel-jesus', 'Arsenal'), ('hincapie', 'Arsenal'), ('gabriel-magalhaes', 'Arsenal'),
    ('jurrien-timber', 'Arsenal'), ('ben-white', 'Arsenal'), ('riccardo-calafiori', 'Arsenal'),
    ('myles-lewis-skelly', 'Arsenal'), ('oleksandr-zinchenko', 'Arsenal'), ('mikel-merino', 'Arsenal'),
    ('kai-havertz', 'Arsenal'), ('gabriel-martinelli', 'Arsenal'), ('leandro-trossard', 'Arsenal'),
    ('ethan-nwaneri', 'Arsenal'), ('noni-madueke', 'Arsenal'), ('jakub-kiwior', 'Arsenal'),
    ('cristhian-mosquera', 'Arsenal'), ('christian-norgaard', 'Arsenal'),

    -- Manchester City
    ('haaland', 'Manchester City'), ('rodri', 'Manchester City'), ('foden', 'Manchester City'),
    ('bernardo-silva', 'Manchester City'), ('gvardiol', 'Manchester City'), ('ruben-dias', 'Manchester City'),
    ('savinho', 'Manchester City'), ('marmoush', 'Manchester City'), ('oscar-bobb', 'Manchester City'),
    ('donnarumma', 'Manchester City'), ('tijjani-reijnders', 'Manchester City'), ('nypan', 'Manchester City'),
    ('james-trafford', 'Manchester City'), ('stefan-ortega', 'Manchester City'), ('john-stones', 'Manchester City'),
    ('manuel-akanji', 'Manchester City'), ('nathan-ake', 'Manchester City'), ('rico-lewis', 'Manchester City'),
    ('rayan-ait-nouri', 'Manchester City'), ('matheus-nunes', 'Manchester City'), ('nico-gonzalez', 'Manchester City'),
    ('rayan-cherki', 'Manchester City'), ('jeremy-doku', 'Manchester City'), ('claudio-echeverri', 'Manchester City'),
    ('abdukodir-khusanov', 'Manchester City'), ('max-alleyne', 'Manchester City'), ('antoine-semenyo', 'Manchester City'),

    -- Liverpool
    ('salah', 'Liverpool'), ('van-dijk', 'Liverpool'), ('alisson', 'Liverpool'), ('konate', 'Liverpool'),
    ('mac-allister', 'Liverpool'), ('ekitike', 'Liverpool'), ('wirtz', 'Liverpool'), ('isak', 'Liverpool'),
    ('frimpong', 'Liverpool'), ('giorgi-mamardashvili', 'Liverpool'), ('andrew-robertson', 'Liverpool'),
    ('conor-bradley', 'Liverpool'), ('joe-gomez', 'Liverpool'), ('milos-kerkez', 'Liverpool'),
    ('jarell-quansah', 'Liverpool'), ('ryan-gravenberch', 'Liverpool'), ('dominik-szoboszlai', 'Liverpool'),
    ('curtis-jones', 'Liverpool'), ('cody-gakpo', 'Liverpool'), ('federico-chiesa', 'Liverpool'),
    ('harvey-elliott', 'Liverpool'), ('wataru-endo', 'Liverpool'), ('trey-nyoni', 'Liverpool'),
    ('giovanni-leoni', 'Liverpool'),

    -- Real Madrid
    ('mbappe', 'Real Madrid'), ('vinicius', 'Real Madrid'), ('bellingham', 'Real Madrid'),
    ('courtois', 'Real Madrid'), ('carvajal', 'Real Madrid'), ('valverde', 'Real Madrid'),
    ('tchouameni', 'Real Madrid'), ('camavinga', 'Real Madrid'), ('rodrygo', 'Real Madrid'),
    ('trent', 'Real Madrid'), ('eder-militao', 'Real Madrid'), ('david-alaba', 'Real Madrid'),
    ('ferland-mendy', 'Real Madrid'), ('fran-garcia', 'Real Madrid'), ('dean-huijsen', 'Real Madrid'),
    ('raul-asencio', 'Real Madrid'), ('arda-guler', 'Real Madrid'), ('brahim-diaz', 'Real Madrid'),
    ('endrick', 'Real Madrid'), ('gonzalo-garcia', 'Real Madrid'), ('andriy-lunin', 'Real Madrid'),

    -- Barcelona
    ('lamine-yamal', 'Barcelona'), ('pedri', 'Barcelona'), ('raphinha', 'Barcelona'),
    ('lewandowski', 'Barcelona'), ('ter-stegen', 'Barcelona'), ('araujo', 'Barcelona'),
    ('cubarsi', 'Barcelona'), ('gavi', 'Barcelona'), ('de-jong', 'Barcelona'), ('kounde', 'Barcelona'),
    ('joan-garcia', 'Barcelona'), ('wojciech-szczesny', 'Barcelona'), ('alejandro-balde', 'Barcelona'),
    ('eric-garcia', 'Barcelona'), ('inigo-martinez', 'Barcelona'), ('dani-olmo', 'Barcelona'),
    ('fermin-lopez', 'Barcelona'), ('marc-casado', 'Barcelona'), ('ferran-torres', 'Barcelona'),
    ('marc-bernal', 'Barcelona'), ('gerard-martin', 'Barcelona'), ('rooney-bardghji', 'Barcelona'),
    ('pau-victor', 'Barcelona'), ('andreas-christensen', 'Barcelona'), ('marcus-rashford', 'Barcelona'),

    -- Bayern München
    ('kane', 'Bayern München'), ('musiala', 'Bayern München'), ('kimmich', 'Bayern München'),
    ('davies', 'Bayern München'), ('olise', 'Bayern München'), ('luis-diaz', 'Bayern München'),
    ('manuel-neuer', 'Bayern München'), ('dayot-upamecano', 'Bayern München'), ('kim-min-jae', 'Bayern München'),
    ('jonathan-tah', 'Bayern München'), ('raphael-guerreiro', 'Bayern München'), ('josip-stanisic', 'Bayern München'),
    ('aleksandar-pavlovic', 'Bayern München'), ('joao-palhinha', 'Bayern München'), ('leon-goretzka', 'Bayern München'),
    ('serge-gnabry', 'Bayern München'), ('leroy-sane', 'Bayern München'), ('hiroki-ito', 'Bayern München'),
    ('sacha-boey', 'Bayern München'), ('mathys-tel', 'Bayern München'), ('tom-bischof', 'Bayern München'),

    -- Paris Saint-Germain
    ('hakimi', 'Paris Saint-Germain'), ('dembele', 'Paris Saint-Germain'), ('vitinha', 'Paris Saint-Germain'),
    ('marquinhos', 'Paris Saint-Germain'), ('nuno-mendes', 'Paris Saint-Germain'), ('kvaratskhelia', 'Paris Saint-Germain'),
    ('pacho', 'Paris Saint-Germain'), ('desire-doue', 'Paris Saint-Germain'), ('bradley-barcola', 'Paris Saint-Germain'),
    ('joao-neves', 'Paris Saint-Germain'), ('fabian-ruiz', 'Paris Saint-Germain'), ('warren-zaire-emery', 'Paris Saint-Germain'),
    ('lee-kang-in', 'Paris Saint-Germain'), ('lucas-hernandez', 'Paris Saint-Germain'), ('lucas-beraldo', 'Paris Saint-Germain'),
    ('matvey-safonov', 'Paris Saint-Germain'), ('goncalo-ramos', 'Paris Saint-Germain'),

    -- Chelsea
    ('palmer', 'Chelsea'), ('enzo-fernandez', 'Chelsea'), ('caicedo', 'Chelsea'), ('reece-james', 'Chelsea'),
    ('garnacho', 'Chelsea'), ('marc-cucurella', 'Chelsea'), ('levi-colwill', 'Chelsea'),
    ('wesley-fofana', 'Chelsea'), ('malo-gusto', 'Chelsea'), ('romeo-lavia', 'Chelsea'),
    ('pedro-neto', 'Chelsea'), ('estevao', 'Chelsea'), ('liam-delap', 'Chelsea'), ('robert-sanchez', 'Chelsea'),

    -- Manchester United
    ('bruno-fernandes', 'Manchester United'), ('de-ligt', 'Manchester United'), ('sesko', 'Manchester United'),
    ('andre-onana', 'Manchester United'), ('lisandro-martinez', 'Manchester United'), ('leny-yoro', 'Manchester United'),
    ('diogo-dalot', 'Manchester United'), ('luke-shaw', 'Manchester United'), ('kobbie-mainoo', 'Manchester United'),
    ('amad-diallo', 'Manchester United'), ('matheus-cunha', 'Manchester United'), ('bryan-mbeumo', 'Manchester United'),
    ('joshua-zirkzee', 'Manchester United'), ('casemiro', 'Manchester United'),

    -- Inter
    ('lautaro', 'Inter'), ('barella', 'Inter'), ('bastoni', 'Inter'), ('dimarco', 'Inter'),
    ('thuram', 'Inter'), ('sommer', 'Inter'), ('denzel-dumfries', 'Inter'), ('hakan-calhanoglu', 'Inter'),
    ('benjamin-pavard', 'Inter'), ('carlos-augusto', 'Inter'), ('francesco-acerbi', 'Inter'),
    ('davide-frattesi', 'Inter'), ('piotr-zielinski', 'Inter'),

    -- AC Milan
    ('maignan', 'AC Milan'), ('leao', 'AC Milan'), ('fikayo-tomori', 'AC Milan'),
    ('strahinja-pavlovic', 'AC Milan'), ('christian-pulisic', 'AC Milan'), ('santiago-gimenez', 'AC Milan'),
    ('youssouf-fofana', 'AC Milan'),

    -- Juventus
    ('vlahovic', 'Juventus'), ('jonathan-david', 'Juventus'), ('openda', 'Juventus'),
    ('michele-di-gregorio', 'Juventus'), ('bremer', 'Juventus'), ('andrea-cambiaso', 'Juventus'),
    ('teun-koopmeiners', 'Juventus'), ('kenan-yildiz', 'Juventus'), ('francisco-conceicao', 'Juventus'),

    -- Borussia Dortmund
    ('kobel', 'Borussia Dortmund'), ('ryerson', 'Borussia Dortmund'), ('nico-schlotterbeck', 'Borussia Dortmund'),
    ('waldemar-anton', 'Borussia Dortmund'), ('ramy-bensebaini', 'Borussia Dortmund'), ('felix-nmecha', 'Borussia Dortmund'),
    ('julian-brandt', 'Borussia Dortmund'), ('karim-adeyemi', 'Borussia Dortmund'), ('serhou-guirassy', 'Borussia Dortmund'),

    -- Atlético Madrid
    ('oblak', 'Atlético Madrid'), ('julian-alvarez', 'Atlético Madrid'), ('marcos-llorente', 'Atlético Madrid'),
    ('robin-le-normand', 'Atlético Madrid'), ('clement-lenglet', 'Atlético Madrid'), ('giuliano-simeone', 'Atlético Madrid'),
    ('antoine-griezmann', 'Atlético Madrid'), ('alexander-sorloth', 'Atlético Madrid'),

    -- Øvrige klubber
    ('pope', 'Newcastle United'), ('tonali', 'Newcastle United'), ('gordon', 'Newcastle United'),
    ('bruno-guimaraes', 'Newcastle United'),
    ('pedro-porro', 'Tottenham Hotspur'), ('solanke', 'Tottenham Hotspur'), ('xavi-simons', 'Tottenham Hotspur'),
    ('watkins', 'Aston Villa'), ('emiliano-martinez', 'Aston Villa'),
    ('de-bruyne', 'Napoli'), ('hojlund', 'Napoli'),
    ('mateta', 'Crystal Palace'),
    ('grimaldo', 'Bayer Leverkusen'), ('boniface', 'Bayer Leverkusen'),
    ('nusa', 'RB Leipzig'),
    ('nico-williams', 'Athletic Club'),
    ('diogo-costa', 'FC Porto'),
    ('aursnes', 'Benfica'),
    ('ederson', 'Fenerbahçe'), ('enesyri', 'Fenerbahçe'),
    ('osimhen', 'Galatasaray'),
    ('lookman', 'Atalanta'),
    ('dovbyk', 'Roma'),
    ('thorsby', 'Genoa'),
    ('darwin-nunez', 'Al-Hilal'), ('theo-hernandez', 'Al-Hilal'),
    ('coman', 'Al-Nassr'),
    ('retegui', 'Al-Qadsiah'),
    ('messi', 'Inter Miami'),
    ('son', 'LAFC'),
    ('strand-larsen', 'Wolverhampton Wanderers'),
    ('ajer', 'Brentford'),
    ('sander-berge', 'Fulham'),
    ('patrick-berg', 'Bodø/Glimt')
)
update player_catalog as catalog
set club = club_map.club
from club_map
where catalog.slug = club_map.slug;

create index if not exists player_catalog_club_idx on player_catalog(club);
