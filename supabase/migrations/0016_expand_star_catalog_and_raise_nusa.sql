-- 150 additional original player cards for the Manager Career catalog.
-- Visual identity remains app-original: only colour accents, no club or EA assets.
with new_catalog (slug, name, position, overall, price, accent) as (
  values
    -- Arsenal
    ('gabriel-magalhaes', 'Gabriel Magalhães', 'CB', 87, 175, '#d73a49'),
    ('jurrien-timber', 'Jurrien Timber', 'RB', 84, 105, '#d73a49'),
    ('ben-white', 'Ben White', 'RB', 82, 70, '#d73a49'),
    ('riccardo-calafiori', 'Riccardo Calafiori', 'LB', 81, 62, '#d73a49'),
    ('myles-lewis-skelly', 'Myles Lewis-Skelly', 'LB', 80, 50, '#d73a49'),
    ('oleksandr-zinchenko', 'Oleksandr Zinchenko', 'LB', 80, 48, '#d73a49'),
    ('mikel-merino', 'Mikel Merino', 'CM', 83, 78, '#d73a49'),
    ('kai-havertz', 'Kai Havertz', 'ST', 83, 82, '#d73a49'),
    ('gabriel-martinelli', 'Gabriel Martinelli', 'LW', 83, 80, '#d73a49'),
    ('leandro-trossard', 'Leandro Trossard', 'LW', 82, 68, '#d73a49'),
    ('ethan-nwaneri', 'Ethan Nwaneri', 'CAM', 79, 44, '#d73a49'),
    ('noni-madueke', 'Noni Madueke', 'RW', 81, 60, '#d73a49'),
    ('jakub-kiwior', 'Jakub Kiwior', 'CB', 79, 42, '#d73a49'),
    ('cristhian-mosquera', 'Cristhian Mosquera', 'CB', 78, 36, '#d73a49'),
    ('christian-norgaard', 'Christian Nørgaard', 'CDM', 77, 30, '#d73a49'),

    -- Manchester City
    ('james-trafford', 'James Trafford', 'GK', 80, 48, '#7bb8ff'),
    ('stefan-ortega', 'Stefan Ortega', 'GK', 79, 40, '#7bb8ff'),
    ('john-stones', 'John Stones', 'CB', 84, 102, '#7bb8ff'),
    ('manuel-akanji', 'Manuel Akanji', 'CB', 83, 82, '#7bb8ff'),
    ('nathan-ake', 'Nathan Aké', 'CB', 83, 84, '#7bb8ff'),
    ('rico-lewis', 'Rico Lewis', 'RB', 80, 50, '#7bb8ff'),
    ('rayan-ait-nouri', 'Rayan Aït-Nouri', 'LB', 81, 62, '#7bb8ff'),
    ('matheus-nunes', 'Matheus Nunes', 'CM', 80, 52, '#7bb8ff'),
    ('nico-gonzalez', 'Nico González', 'CDM', 80, 54, '#7bb8ff'),
    ('rayan-cherki', 'Rayan Cherki', 'CAM', 84, 96, '#7bb8ff'),
    ('jeremy-doku', 'Jérémy Doku', 'LW', 83, 80, '#7bb8ff'),
    ('claudio-echeverri', 'Claudio Echeverri', 'CAM', 78, 35, '#7bb8ff'),
    ('abdukodir-khusanov', 'Abdukodir Khusanov', 'CB', 78, 38, '#7bb8ff'),
    ('max-alleyne', 'Max Alleyne', 'CB', 70, 12, '#7bb8ff'),
    ('antoine-semenyo', 'Antoine Semenyo', 'RW', 82, 68, '#7bb8ff'),

    -- Barcelona
    ('joan-garcia', 'Joan García', 'GK', 82, 64, '#f2c94c'),
    ('wojciech-szczesny', 'Wojciech Szczęsny', 'GK', 83, 78, '#f2c94c'),
    ('alejandro-balde', 'Alejandro Balde', 'LB', 82, 70, '#f2c94c'),
    ('eric-garcia', 'Eric García', 'CB', 81, 62, '#f2c94c'),
    ('inigo-martinez', 'Iñigo Martínez', 'CB', 84, 100, '#f2c94c'),
    ('dani-olmo', 'Dani Olmo', 'CAM', 84, 95, '#f2c94c'),
    ('fermin-lopez', 'Fermín López', 'CAM', 82, 72, '#f2c94c'),
    ('marc-casado', 'Marc Casadó', 'CDM', 80, 52, '#f2c94c'),
    ('ferran-torres', 'Ferran Torres', 'ST', 83, 78, '#f2c94c'),
    ('marc-bernal', 'Marc Bernal', 'CDM', 78, 34, '#f2c94c'),
    ('gerard-martin', 'Gerard Martín', 'LB', 76, 24, '#f2c94c'),
    ('rooney-bardghji', 'Roony Bardghji', 'RW', 75, 22, '#f2c94c'),
    ('pau-victor', 'Pau Víctor', 'ST', 75, 22, '#f2c94c'),
    ('andreas-christensen', 'Andreas Christensen', 'CB', 83, 82, '#f2c94c'),
    ('marcus-rashford', 'Marcus Rashford', 'LW', 84, 96, '#f2c94c'),

    -- Bayern München
    ('manuel-neuer', 'Manuel Neuer', 'GK', 86, 145, '#d9252a'),
    ('dayot-upamecano', 'Dayot Upamecano', 'CB', 86, 140, '#d9252a'),
    ('kim-min-jae', 'Kim Min-jae', 'CB', 84, 100, '#d9252a'),
    ('jonathan-tah', 'Jonathan Tah', 'CB', 85, 120, '#d9252a'),
    ('raphael-guerreiro', 'Raphaël Guerreiro', 'LB', 82, 68, '#d9252a'),
    ('josip-stanisic', 'Josip Stanišić', 'RB', 81, 58, '#d9252a'),
    ('aleksandar-pavlovic', 'Aleksandar Pavlović', 'CDM', 82, 72, '#d9252a'),
    ('joao-palhinha', 'João Palhinha', 'CDM', 84, 96, '#d9252a'),
    ('leon-goretzka', 'Leon Goretzka', 'CM', 83, 80, '#d9252a'),
    ('serge-gnabry', 'Serge Gnabry', 'RW', 84, 92, '#d9252a'),
    ('leroy-sane', 'Leroy Sané', 'RW', 85, 112, '#d9252a'),
    ('hiroki-ito', 'Hiroki Ito', 'CB', 80, 50, '#d9252a'),
    ('sacha-boey', 'Sacha Boey', 'RB', 79, 42, '#d9252a'),
    ('mathys-tel', 'Mathys Tel', 'ST', 79, 44, '#d9252a'),
    ('tom-bischof', 'Tom Bischof', 'CAM', 78, 36, '#d9252a'),

    -- Liverpool
    ('giorgi-mamardashvili', 'Giorgi Mamardashvili', 'GK', 84, 102, '#d9252a'),
    ('andrew-robertson', 'Andrew Robertson', 'LB', 83, 78, '#d9252a'),
    ('conor-bradley', 'Conor Bradley', 'RB', 79, 42, '#d9252a'),
    ('joe-gomez', 'Joe Gomez', 'CB', 81, 58, '#d9252a'),
    ('milos-kerkez', 'Milos Kerkez', 'LB', 81, 58, '#d9252a'),
    ('jarell-quansah', 'Jarell Quansah', 'CB', 78, 34, '#d9252a'),
    ('ryan-gravenberch', 'Ryan Gravenberch', 'CM', 85, 116, '#d9252a'),
    ('dominik-szoboszlai', 'Dominik Szoboszlai', 'CAM', 85, 118, '#d9252a'),
    ('curtis-jones', 'Curtis Jones', 'CM', 81, 58, '#d9252a'),
    ('cody-gakpo', 'Cody Gakpo', 'LW', 85, 112, '#d9252a'),
    ('federico-chiesa', 'Federico Chiesa', 'RW', 83, 78, '#d9252a'),
    ('harvey-elliott', 'Harvey Elliott', 'CAM', 80, 48, '#d9252a'),
    ('wataru-endo', 'Wataru Endo', 'CDM', 79, 40, '#d9252a'),
    ('trey-nyoni', 'Trey Nyoni', 'CM', 72, 16, '#d9252a'),
    ('giovanni-leoni', 'Giovanni Leoni', 'CB', 76, 26, '#d9252a'),

    -- Real Madrid and Paris Saint-Germain
    ('eder-militao', 'Éder Militão', 'CB', 84, 102, '#f2c94c'),
    ('david-alaba', 'David Alaba', 'CB', 83, 80, '#f2c94c'),
    ('ferland-mendy', 'Ferland Mendy', 'LB', 82, 70, '#f2c94c'),
    ('fran-garcia', 'Fran García', 'LB', 78, 34, '#f2c94c'),
    ('dean-huijsen', 'Dean Huijsen', 'CB', 82, 70, '#f2c94c'),
    ('raul-asencio', 'Raúl Asencio', 'CB', 80, 50, '#f2c94c'),
    ('arda-guler', 'Arda Güler', 'CAM', 84, 94, '#f2c94c'),
    ('brahim-diaz', 'Brahim Díaz', 'RW', 83, 80, '#f2c94c'),
    ('endrick', 'Endrick', 'ST', 79, 44, '#f2c94c'),
    ('gonzalo-garcia', 'Gonzalo García', 'ST', 77, 30, '#f2c94c'),
    ('andriy-lunin', 'Andriy Lunin', 'GK', 81, 58, '#f2c94c'),
    ('desire-doue', 'Désiré Doué', 'CAM', 85, 115, '#203f91'),
    ('bradley-barcola', 'Bradley Barcola', 'LW', 85, 112, '#203f91'),
    ('joao-neves', 'João Neves', 'CM', 85, 114, '#203f91'),
    ('fabian-ruiz', 'Fabián Ruiz', 'CM', 85, 110, '#203f91'),

    -- Paris Saint-Germain and Chelsea
    ('warren-zaire-emery', 'Warren Zaïre-Emery', 'CM', 83, 82, '#203f91'),
    ('lee-kang-in', 'Lee Kang-in', 'CAM', 81, 58, '#203f91'),
    ('lucas-hernandez', 'Lucas Hernández', 'LB', 83, 80, '#203f91'),
    ('lucas-beraldo', 'Lucas Beraldo', 'CB', 80, 50, '#203f91'),
    ('matvey-safonov', 'Matvey Safonov', 'GK', 80, 48, '#203f91'),
    ('goncalo-ramos', 'Gonçalo Ramos', 'ST', 83, 78, '#203f91'),
    ('marc-cucurella', 'Marc Cucurella', 'LB', 84, 96, '#1355a0'),
    ('levi-colwill', 'Levi Colwill', 'CB', 82, 70, '#1355a0'),
    ('wesley-fofana', 'Wesley Fofana', 'CB', 80, 50, '#1355a0'),
    ('malo-gusto', 'Malo Gusto', 'RB', 81, 58, '#1355a0'),
    ('romeo-lavia', 'Roméo Lavia', 'CDM', 81, 60, '#1355a0'),
    ('pedro-neto', 'Pedro Neto', 'RW', 83, 82, '#1355a0'),
    ('estevao', 'Estêvão', 'RW', 82, 72, '#1355a0'),
    ('liam-delap', 'Liam Delap', 'ST', 80, 52, '#1355a0'),
    ('robert-sanchez', 'Robert Sánchez', 'GK', 81, 58, '#1355a0'),

    -- Manchester United and Inter
    ('andre-onana', 'André Onana', 'GK', 83, 80, '#d9252a'),
    ('lisandro-martinez', 'Lisandro Martínez', 'CB', 84, 96, '#d9252a'),
    ('leny-yoro', 'Leny Yoro', 'CB', 80, 52, '#d9252a'),
    ('diogo-dalot', 'Diogo Dalot', 'RB', 82, 68, '#d9252a'),
    ('luke-shaw', 'Luke Shaw', 'LB', 81, 58, '#d9252a'),
    ('kobbie-mainoo', 'Kobbie Mainoo', 'CM', 82, 70, '#d9252a'),
    ('amad-diallo', 'Amad Diallo', 'RW', 83, 80, '#d9252a'),
    ('matheus-cunha', 'Matheus Cunha', 'ST', 84, 96, '#d9252a'),
    ('bryan-mbeumo', 'Bryan Mbeumo', 'RW', 84, 98, '#d9252a'),
    ('joshua-zirkzee', 'Joshua Zirkzee', 'ST', 81, 58, '#d9252a'),
    ('casemiro', 'Casemiro', 'CDM', 82, 68, '#d9252a'),
    ('denzel-dumfries', 'Denzel Dumfries', 'RB', 84, 96, '#131f6b'),
    ('hakan-calhanoglu', 'Hakan Çalhanoğlu', 'CM', 86, 142, '#131f6b'),
    ('benjamin-pavard', 'Benjamin Pavard', 'CB', 83, 82, '#131f6b'),
    ('carlos-augusto', 'Carlos Augusto', 'LB', 81, 58, '#131f6b'),

    -- Serie A
    ('francesco-acerbi', 'Francesco Acerbi', 'CB', 83, 78, '#131f6b'),
    ('davide-frattesi', 'Davide Frattesi', 'CM', 82, 70, '#131f6b'),
    ('piotr-zielinski', 'Piotr Zieliński', 'CM', 82, 68, '#131f6b'),
    ('fikayo-tomori', 'Fikayo Tomori', 'CB', 83, 80, '#131f6b'),
    ('strahinja-pavlovic', 'Strahinja Pavlović', 'CB', 80, 48, '#131f6b'),
    ('tijjani-reijnders', 'Tijjani Reijnders', 'CM', 86, 140, '#131f6b'),
    ('christian-pulisic', 'Christian Pulisic', 'RW', 85, 110, '#131f6b'),
    ('santiago-gimenez', 'Santiago Gimenez', 'ST', 82, 70, '#131f6b'),
    ('youssouf-fofana', 'Youssouf Fofana', 'CDM', 82, 68, '#131f6b'),
    ('michele-di-gregorio', 'Michele Di Gregorio', 'GK', 83, 78, '#111111'),
    ('bremer', 'Bremer', 'CB', 86, 138, '#111111'),
    ('andrea-cambiaso', 'Andrea Cambiaso', 'LB', 83, 80, '#111111'),
    ('teun-koopmeiners', 'Teun Koopmeiners', 'CM', 84, 98, '#111111'),
    ('kenan-yildiz', 'Kenan Yıldız', 'LW', 84, 96, '#111111'),
    ('francisco-conceicao', 'Francisco Conceição', 'RW', 82, 70, '#111111'),

    -- Dortmund, Atlético and Premier League stars
    ('nico-schlotterbeck', 'Nico Schlotterbeck', 'CB', 86, 140, '#f2c94c'),
    ('waldemar-anton', 'Waldemar Anton', 'CB', 82, 68, '#f2c94c'),
    ('ramy-bensebaini', 'Ramy Bensebaini', 'LB', 81, 58, '#f2c94c'),
    ('felix-nmecha', 'Felix Nmecha', 'CM', 81, 58, '#f2c94c'),
    ('julian-brandt', 'Julian Brandt', 'CAM', 84, 96, '#f2c94c'),
    ('karim-adeyemi', 'Karim Adeyemi', 'RW', 83, 80, '#f2c94c'),
    ('serhou-guirassy', 'Serhou Guirassy', 'ST', 85, 116, '#f2c94c'),
    ('marcos-llorente', 'Marcos Llorente', 'CM', 84, 96, '#d9252a'),
    ('robin-le-normand', 'Robin Le Normand', 'CB', 83, 80, '#d9252a'),
    ('clement-lenglet', 'Clément Lenglet', 'CB', 81, 58, '#d9252a'),
    ('giuliano-simeone', 'Giuliano Simeone', 'RW', 80, 50, '#d9252a'),
    ('antoine-griezmann', 'Antoine Griezmann', 'ST', 86, 142, '#d9252a'),
    ('alexander-sorloth', 'Alexander Sørloth', 'ST', 84, 96, '#d9252a'),
    ('bruno-guimaraes', 'Bruno Guimarães', 'CM', 86, 142, '#111111'),
    ('emiliano-martinez', 'Emiliano Martínez', 'GK', 85, 116, '#7a5cff')
), calculated as (
  select slug, name, position, overall, price, accent,
    jsonb_build_object(
      'pace', least(99, greatest(20, overall + case when position = 'GK' then -12 when position in ('RW', 'LW') then 7 when position = 'ST' then 4 when position in ('RB', 'LB') then 3 else -1 end)),
      'shooting', least(99, greatest(20, overall + case when position = 'GK' then -22 when position = 'ST' then 6 when position in ('RW', 'LW', 'CAM') then 3 when position in ('CB', 'RB', 'LB') then -18 when position = 'CDM' then -9 else -2 end)),
      'passing', least(99, greatest(20, overall + case when position = 'GK' then -5 when position in ('CM', 'CAM', 'CDM') then 4 when position in ('CB', 'RB', 'LB') then -6 when position = 'ST' then -9 else 0 end)),
      'dribbling', least(99, greatest(20, overall + case when position = 'GK' then -6 when position in ('RW', 'LW', 'CAM') then 5 when position = 'ST' then 1 when position in ('CB', 'RB', 'LB') then -8 else 0 end)),
      'defending', least(99, greatest(20, overall + case when position = 'GK' then -3 when position = 'CB' then 6 when position in ('RB', 'LB') then 3 when position = 'CDM' then 4 when position in ('RW', 'LW', 'ST') then -25 when position = 'CAM' then -17 else -8 end)),
      'physical', least(99, greatest(20, overall + case when position = 'GK' then 0 when position in ('CB', 'ST') then 3 when position = 'CDM' then 2 when position in ('RW', 'LW') then -5 else -1 end))
    ) as attributes
  from new_catalog
)
insert into player_catalog (slug, name, position, overall, price, attributes, accent)
select slug, name, position, overall, price, attributes, accent from calculated
on conflict (slug) do nothing;

-- User-directed rating adjustment. Existing owners keep their acquisition price,
-- but their Antonio Nusa card receives the new permanent rating and attributes.
with nusa as (
  select id,
    jsonb_build_object(
      'pace', 89,
      'shooting', 78,
      'passing', 77,
      'dribbling', 88,
      'defending', 45,
      'physical', 67
    ) as attributes
  from player_catalog
  where slug = 'nusa'
)
update player_catalog
set overall = 83,
    price = 80,
    attributes = nusa.attributes
from nusa
where player_catalog.id = nusa.id;

update manager_cards
set overall = catalog.overall,
    attributes = catalog.attributes
from player_catalog as catalog
where manager_cards.catalog_id = catalog.id
  and catalog.slug = 'nusa';
