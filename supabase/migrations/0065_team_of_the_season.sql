-- Spesialkort, andre type: TOTS (Team of the Season, som i FC).
-- * 200 spillere fra topp 500 i katalogen, valgt per liga: 35 hver fra Premier League, La Liga, Serie A og
--   Bundesliga, alle 26 fra Ligue 1 som er i topp 500, og 34 fra resten av verden. Innen hver liga er det
--   omtrent en tropp: 4 keepere, 12 forsvarere, 10 midtbanespillere og 9 angripere (3 keepere i resten av
--   verden). Mangler en liga spillere i en gruppe, tas de beste som er igjen. Spillere uten klubb er ikke med.
-- * Ratingen følger vanlig-kortet på tvers av alle 200: 79 blir 88 og 92 blir 95, lineært, og kortet er alltid
--   bedre enn vanlig-kortet. Alle stats får samme løft som ratingen, og de to-tre viktigste for posisjonen får
--   +2 ekstra (maks 99). Kortet koster 2 ganger verdien på den nye ratingen.
-- * Alle 200 kommer på én gang i én TOTS-runde, og de slutter ikke å gjelde.
-- * Vanlige pakker kan gi TOTS med halvparten av inform-sjansen. Spesialpakken (SBC) trekker blant alle
--   spesialkort, så den kan også gi TOTS. TOTS-kort fra vanlige pakker kan selges på markedet.

-- 1) TOTS er en ny type i rundene og kortene. Boosten kan være større enn for inform.
alter table special_rounds drop constraint if exists special_rounds_kind_check;
alter table special_rounds add constraint special_rounds_kind_check check (kind in ('inform', 'tots'));
alter table special_cards drop constraint if exists special_cards_kind_check;
alter table special_cards add constraint special_cards_kind_check check (kind in ('inform', 'tots'));
alter table special_cards drop constraint if exists special_cards_boost_check;
alter table special_cards add constraint special_cards_boost_check check (boost >= 1 and (kind <> 'inform' or boost <= 3));

-- 2) TOTS-runden og de 200 kortene.
insert into special_rounds (kind, starts_at, ends_at) values ('tots', '2026-10-05 00:00:00+02', '2100-01-01 00:00:00+00')
on conflict (kind, starts_at) do nothing;

with picks (slug, overall) as (values
  -- Premier League (35)
  ('haaland', 95),                -- Erling Haaland, ST, Manchester City, 92
  ('odegaard', 94),               -- Martin Ødegaard, CAM, Arsenal, 90
  ('alisson', 93),                -- Alisson, GK, Liverpool, 89
  ('donnarumma', 93),             -- Gianluigi Donnarumma, GK, Manchester City, 89
  ('van-dijk', 93),               -- Virgil van Dijk, CB, Liverpool, 89
  ('ruben-dias', 93),             -- Rúben Dias, CB, Manchester City, 88
  ('wirtz', 93),                  -- Florian Wirtz, CAM, Liverpool, 88
  ('bruno-fernandes', 92),        -- Bruno Fernandes, CAM, Manchester United, 87
  ('declan-rice', 92),            -- Declan Rice, CDM, Arsenal, 87
  ('foden', 92),                  -- Phil Foden, CAM, Manchester City, 87
  ('gabriel-magalhaes', 92),      -- Gabriel Magalhães, CB, Arsenal, 87
  ('saka', 92),                   -- Bukayo Saka, RW, Arsenal, 87
  ('saliba', 92),                 -- William Saliba, CB, Arsenal, 87
  ('araujo', 92),                 -- Ronald Araújo, CB, Liverpool, 86
  ('bruno-guimaraes', 92),        -- Bruno Guimarães, CM, Arsenal, 86
  ('gyokeres', 92),               -- Viktor Gyökeres, ST, Arsenal, 86
  ('bradley-barcola', 91),        -- Bradley Barcola, LW, Liverpool, 85
  ('cody-gakpo', 91),             -- Cody Gakpo, LW, Liverpool, 85
  ('dominik-szoboszlai', 91),     -- Dominik Szoboszlai, CAM, Liverpool, 85
  ('emiliano-martinez', 91),      -- Emiliano Martínez, GK, Chelsea, 85
  ('gvardiol', 91),               -- Joško Gvardiol, CB, Manchester City, 85
  ('isak', 91),                   -- Alexander Isak, ST, Liverpool, 85
  ('mac-allister', 91),           -- Alexis Mac Allister, CM, Liverpool, 85
  ('palmer', 91),                 -- Cole Palmer, CAM, Chelsea, 85
  ('raya', 91),                   -- David Raya, GK, Arsenal, 85
  ('ryan-gravenberch', 91),       -- Ryan Gravenberch, CM, Liverpool, 85
  ('bryan-mbeumo', 91),           -- Bryan Mbeumo, RW, Manchester United, 84
  ('de-ligt', 91),                -- Matthijs de Ligt, CB, Manchester United, 84
  ('frimpong', 91),               -- Jeremie Frimpong, RB, Liverpool, 84
  ('jurrien-timber', 91),         -- Jurrien Timber, RB, Arsenal, 84
  ('lisandro-martinez', 91),      -- Lisandro Martínez, CB, Manchester United, 84
  ('marc-guehi', 91),             -- Marc Guéhi, CB, Manchester City, 84
  ('marcus-rashford', 91),        -- Marcus Rashford, LW, Manchester United, 84
  ('marmoush', 91),               -- Omar Marmoush, ST, Tottenham Hotspur, 84
  ('micky-van-de-ven', 91),       -- Micky van de Ven, CB, Tottenham Hotspur, 84
  -- La Liga (35)
  ('mbappe', 94),                 -- Kylian Mbappé, ST, Real Madrid, 91
  ('rodri', 94),                  -- Rodri, CDM, Barcelona, 91
  ('lamine-yamal', 94),           -- Lamine Yamal, RW, Barcelona, 90
  ('raphinha', 94),               -- Raphinha, RW, Barcelona, 90
  ('vinicius', 94),               -- Vinícius Júnior, LW, Real Madrid, 90
  ('bellingham', 93),             -- Jude Bellingham, CAM, Real Madrid, 89
  ('courtois', 93),               -- Thibaut Courtois, GK, Real Madrid, 88
  ('pedri', 93),                  -- Pedri, CM, Barcelona, 88
  ('valverde', 93),               -- Federico Valverde, CM, Real Madrid, 88
  ('alexander-sorloth', 92),      -- Alexander Sørloth, ST, Atlético Madrid, 87
  ('oblak', 92),                  -- Jan Oblak, GK, Atlético Madrid, 87
  ('bernardo-silva', 92),         -- Bernardo Silva, CM, Real Madrid, 86
  ('de-jong', 92),                -- Frenkie de Jong, CM, Barcelona, 86
  ('rodrygo', 92),                -- Rodrygo, RW, Real Madrid, 86
  ('antonio-rudiger', 91),        -- Antonio Rüdiger, CB, Real Madrid, 85
  ('camavinga', 91),              -- Eduardo Camavinga, CM, Real Madrid, 85
  ('cristian-romero', 91),        -- Cristian Romero, CB, Atlético Madrid, 85
  ('julian-alvarez', 91),         -- Julián Álvarez, ST, Atlético Madrid, 85
  ('konate', 91),                 -- Ibrahima Konaté, CB, Real Madrid, 85
  ('kounde', 91),                 -- Jules Koundé, RB, Barcelona, 85
  ('tchouameni', 91),             -- Aurélien Tchouaméni, CDM, Real Madrid, 85
  ('trent', 91),                  -- Trent Alexander-Arnold, RB, Real Madrid, 85
  ('arda-guler', 91),             -- Arda Güler, CAM, Real Madrid, 84
  ('dani-olmo', 91),              -- Dani Olmo, CAM, Barcelona, 84
  ('denzel-dumfries', 91),        -- Denzel Dumfries, RB, Real Madrid, 84
  ('eder-militao', 91),           -- Éder Militão, CB, Real Madrid, 84
  ('grimaldo', 91),               -- Álex Grimaldo, LB, Atlético Madrid, 84
  ('lookman', 91),                -- Ademola Lookman, LW, Atlético Madrid, 84
  ('marc-cucurella', 91),         -- Marc Cucurella, LB, Real Madrid, 84
  ('nico-williams', 91),          -- Nico Williams, LW, Athletic Club, 84
  ('andreas-christensen', 90),    -- Andreas Christensen, CB, Barcelona, 83
  ('robin-le-normand', 90),       -- Robin Le Normand, CB, Atlético Madrid, 83
  ('unai-simon', 90),             -- Unai Simón, GK, Athletic Club, 83
  ('wojciech-szczesny', 90),      -- Wojciech Szczęsny, GK, Barcelona, 83
  ('alejandro-balde', 90),        -- Alejandro Balde, LB, Barcelona, 82
  -- Serie A (35)
  ('de-bruyne', 93),              -- Kevin De Bruyne, CAM, Napoli, 88
  ('lautaro', 93),                -- Lautaro Martínez, ST, Inter, 88
  ('maignan', 92),                -- Mike Maignan, GK, AC Milan, 87
  ('barella', 92),                -- Nicolò Barella, CM, Inter, 86
  ('bastoni', 92),                -- Alessandro Bastoni, CB, Inter, 86
  ('bremer', 92),                 -- Bremer, CB, Juventus, 86
  ('hakan-calhanoglu', 92),       -- Hakan Çalhanoğlu, CM, Inter, 86
  ('christian-pulisic', 91),      -- Christian Pulisic, RW, AC Milan, 85
  ('dimarco', 91),                -- Federico Dimarco, LB, Inter, 85
  ('scott-mctominay', 91),        -- Scott McTominay, CM, Napoli, 85
  ('guglielmo-vicario', 91),      -- Guglielmo Vicario, GK, Juventus, 84
  ('john-stones', 91),            -- John Stones, CB, Inter, 84
  ('kenan-yildiz', 91),           -- Kenan Yıldız, LW, Juventus, 84
  ('luka-modric', 91),            -- Luka Modrić, CM, AC Milan, 84
  ('stanislav-lobotka', 91),      -- Stanislav Lobotka, CDM, Napoli, 84
  ('teun-koopmeiners', 91),       -- Teun Koopmeiners, CM, Juventus, 84
  ('thuram', 91),                 -- Marcus Thuram, ST, Inter, 84
  ('andrea-cambiaso', 90),        -- Andrea Cambiaso, LB, Juventus, 83
  ('benjamin-pavard', 90),        -- Benjamin Pavard, CB, Inter, 83
  ('david-de-gea', 90),           -- David de Gea, GK, Fiorentina, 83
  ('dovbyk', 90),                 -- Artem Dovbyk, ST, Bologna, 83
  ('fikayo-tomori', 90),          -- Fikayo Tomori, CB, AC Milan, 83
  ('goncalo-ramos', 90),          -- Gonçalo Ramos, ST, AC Milan, 83
  ('manuel-akanji', 90),          -- Manuel Akanji, CB, Inter, 83
  ('mile-svilar', 90),            -- Mile Svilar, GK, Roma, 83
  ('alessandro-buongiorno', 90),  -- Alessandro Buongiorno, CB, Napoli, 82
  ('davide-frattesi', 90),        -- Davide Frattesi, CM, Lazio, 82
  ('francisco-conceicao', 90),    -- Francisco Conceição, RW, Juventus, 82
  ('giovanni-di-lorenzo', 90),    -- Giovanni Di Lorenzo, RB, Napoli, 82
  ('moise-kean', 90),             -- Moise Kean, ST, Como, 82
  ('piotr-zielinski', 90),        -- Piotr Zieliński, CM, Inter, 82
  ('santiago-gimenez', 90),       -- Santiago Gimenez, ST, AC Milan, 82
  ('youssouf-fofana', 90),        -- Youssouf Fofana, CDM, AC Milan, 82
  ('amir-rrahmani', 89),          -- Amir Rrahmani, CB, Napoli, 81
  ('carlos-augusto', 89),         -- Carlos Augusto, LB, Inter, 81
  -- Bundesliga (35)
  ('kane', 94),                   -- Harry Kane, ST, Bayern München, 90
  ('kimmich', 93),                -- Joshua Kimmich, CDM, Bayern München, 88
  ('musiala', 93),                -- Jamal Musiala, CAM, Bayern München, 88
  ('dayot-upamecano', 92),        -- Dayot Upamecano, CB, Bayern München, 86
  ('kobel', 92),                  -- Gregor Kobel, GK, Borussia Dortmund, 86
  ('manuel-neuer', 92),           -- Manuel Neuer, GK, Bayern München, 86
  ('nico-schlotterbeck', 92),     -- Nico Schlotterbeck, CB, Borussia Dortmund, 86
  ('jonathan-tah', 91),           -- Jonathan Tah, CB, Bayern München, 85
  ('olise', 91),                  -- Michael Olise, RW, Bayern München, 85
  ('serhou-guirassy', 91),        -- Serhou Guirassy, ST, Borussia Dortmund, 85
  ('davies', 91),                 -- Alphonso Davies, LB, Bayern München, 84
  ('kim-min-jae', 91),            -- Kim Min-jae, CB, Bayern München, 84
  ('luis-diaz', 91),              -- Luis Díaz, LW, Bayern München, 84
  ('serge-gnabry', 91),           -- Serge Gnabry, RW, Bayern München, 84
  ('nusa', 90),                   -- Antonio Nusa, LW, RB Leipzig, 83
  ('aleksandar-pavlovic', 90),    -- Aleksandar Pavlović, CDM, Bayern München, 82
  ('angelo-stiller', 90),         -- Angelo Stiller, CDM, Stuttgart, 82
  ('edmond-tapsoba', 90),         -- Edmond Tapsoba, CB, Bayer Leverkusen, 82
  ('konrad-laimer', 90),          -- Konrad Laimer, RB, Bayern München, 82
  ('waldemar-anton', 90),         -- Waldemar Anton, CB, Borussia Dortmund, 82
  ('boniface', 89),               -- Victor Boniface, ST, Bayer Leverkusen, 81
  ('castello-lukeba', 89),        -- Castello Lukeba, CB, RB Leipzig, 81
  ('christopher-nkunku', 89),     -- Christopher Nkunku, ST, RB Leipzig, 81
  ('exequiel-palacios', 89),      -- Exequiel Palacios, CM, Bayer Leverkusen, 81
  ('felix-nmecha', 89),           -- Felix Nmecha, CM, Borussia Dortmund, 81
  ('josip-stanisic', 89),         -- Josip Stanišić, RB, Bayern München, 81
  ('patrik-schick', 89),          -- Patrik Schick, ST, Bayer Leverkusen, 81
  ('ramy-bensebaini', 89),        -- Ramy Bensebaini, LB, Borussia Dortmund, 81
  ('hiroki-ito', 89),             -- Hiroki Ito, CB, Bayern München, 80
  ('malik-tillman', 89),          -- Malik Tillman, CAM, Bayer Leverkusen, 80
  ('marcel-sabitzer', 89),        -- Marcel Sabitzer, CM, Borussia Dortmund, 80
  ('oliver-baumann', 89),         -- Oliver Baumann, GK, Hoffenheim, 80
  ('aleix-garcia', 88),           -- Aleix García, CM, Bayer Leverkusen, 79
  ('ethan-nwaneri', 88),          -- Ethan Nwaneri, CAM, Borussia Dortmund, 79
  ('mark-flekken', 88),           -- Mark Flekken, GK, Bayer Leverkusen, 79
  -- Ligue 1 (26)
  ('dembele', 93),                -- Ousmane Dembélé, RW, Paris Saint-Germain, 88
  ('marquinhos', 92),             -- Marquinhos, CB, Paris Saint-Germain, 87
  ('vitinha', 92),                -- Vitinha, CM, Paris Saint-Germain, 87
  ('hakimi', 92),                 -- Achraf Hakimi, RB, Paris Saint-Germain, 86
  ('kvaratskhelia', 92),          -- Khvicha Kvaratskhelia, LW, Paris Saint-Germain, 86
  ('desire-doue', 91),            -- Désiré Doué, CAM, Paris Saint-Germain, 85
  ('fabian-ruiz', 91),            -- Fabián Ruiz, CM, Paris Saint-Germain, 85
  ('joao-neves', 91),             -- João Neves, CM, Paris Saint-Germain, 85
  ('nuno-mendes', 91),            -- Nuno Mendes, LB, Paris Saint-Germain, 85
  ('pacho', 91),                  -- Willian Pacho, CB, Paris Saint-Germain, 85
  ('ferran-torres', 90),          -- Ferran Torres, ST, Paris Saint-Germain, 83
  ('lucas-hernandez', 90),        -- Lucas Hernández, LB, Paris Saint-Germain, 83
  ('openda', 90),                 -- Loïs Openda, ST, Lyon, 83
  ('warren-zaire-emery', 90),     -- Warren Zaïre-Emery, CM, Paris Saint-Germain, 83
  ('lucas-chevalier', 90),        -- Lucas Chevalier, GK, Paris Saint-Germain, 82
  ('brice-samba', 89),            -- Brice Samba, GK, Rennes, 80
  ('denis-zakaria', 89),          -- Denis Zakaria, CDM, Monaco, 80
  ('lucas-beraldo', 89),          -- Lucas Beraldo, CB, Paris Saint-Germain, 80
  ('lukas-hradecky', 89),         -- Lukáš Hrádecký, GK, Monaco, 80
  ('maghnes-akliouche', 89),      -- Maghnes Akliouche, CAM, Paris Saint-Germain, 80
  ('matvey-safonov', 89),         -- Matvey Safonov, GK, Paris Saint-Germain, 80
  ('aleksandr-golovin', 88),      -- Aleksandr Golovin, CAM, Monaco, 79
  ('amine-gouiri', 88),           -- Amine Gouiri, ST, Marseille, 79
  ('lamine-camara', 88),          -- Lamine Camara, CM, Monaco, 79
  ('lucas-digne', 88),            -- Lucas Digne, LB, Paris Saint-Germain, 79
  ('mohamed-amoura', 88),         -- Mohamed Amoura, ST, Nice, 79
  -- Resten av verden (34)
  ('messi', 93),                  -- Lionel Messi, CAM, Inter Miami, 89
  ('salah', 93),                  -- Mohamed Salah, RW, Trabzonspor, 89
  ('lewandowski', 93),            -- Robert Lewandowski, ST, Chicago Fire, 88
  ('ter-stegen', 92),             -- Marc-André ter Stegen, GK, Ajax, 87
  ('theo-hernandez', 92),         -- Theo Hernández, LB, Al-Hilal, 87
  ('antoine-griezmann', 92),      -- Antoine Griezmann, ST, Orlando City, 86
  ('ederson', 92),                -- Ederson, GK, Fenerbahçe, 86
  ('leao', 92),                   -- Rafael Leão, LW, Galatasaray, 86
  ('osimhen', 92),                -- Victor Osimhen, ST, Galatasaray, 86
  ('tijjani-reijnders', 92),      -- Tijjani Reijnders, CM, Al-Qadsiah, 86
  ('cristiano-ronaldo', 91),      -- Cristiano Ronaldo, ST, Al-Nassr, 85
  ('leroy-sane', 91),             -- Leroy Sané, RW, Galatasaray, 85
  ('sommer', 91),                 -- Yann Sommer, GK, Club Brugge, 85
  ('son', 91),                    -- Heung-Min Son, LW, LAFC, 85
  ('coman', 91),                  -- Kingsley Coman, LW, Al-Nassr, 84
  ('inigo-martinez', 91),         -- Iñigo Martínez, CB, Al-Nassr, 84
  ('joao-palhinha', 91),          -- João Palhinha, CDM, Benfica, 84
  ('julian-brandt', 91),          -- Julian Brandt, CAM, Ajax, 84
  ('nathan-ake', 90),             -- Nathan Aké, CB, Fenerbahçe, 83
  ('casemiro', 90),               -- Casemiro, CDM, Inter Miami, 82
  ('ruben-neves', 90),            -- Rúben Neves, CDM, Al-Hilal, 82
  ('sergej-milinkovic-savic', 90),-- Sergej Milinković-Savić, CM, Al-Hilal, 82
  ('aursnes', 89),                -- Fredrik Aursnes, CM, Benfica, 81
  ('clement-lenglet', 89),        -- Clément Lenglet, CB, Benfica, 81
  ('goncalo-inacio', 89),         -- Gonçalo Inácio, CB, Sporting CP, 81
  ('lucas-paqueta', 89),          -- Lucas Paquetá, CAM, Flamengo, 81
  ('marcelo-brozovic', 89),       -- Marcelo Brozović, CM, Al-Nassr, 81
  ('milan-skriniar', 89),         -- Milan Škriniar, CB, Fenerbahçe, 81
  ('ousmane-diomande', 89),       -- Ousmane Diomande, CB, Sporting CP, 81
  ('kalidou-koulibaly', 89),      -- Kalidou Koulibaly, CB, Al-Hilal, 80
  ('kieran-trippier', 89),        -- Kieran Trippier, RB, Wolverhampton Wanderers, 80
  ('davinson-sanchez', 88),       -- Davinson Sánchez, CB, Galatasaray, 79
  ('jakub-kiwior', 88),           -- Jakub Kiwior, CB, FC Porto, 79
  ('merih-demiral', 88)           -- Merih Demiral, CB, Al-Ahli, 79
),
round as (select id from special_rounds where kind = 'tots' and starts_at = '2026-10-05 00:00:00+02'),
base as (
  select catalog.id, catalog.position, catalog.attributes,
    least(95, greatest(picks.overall, catalog.overall + 1)) as overall, catalog.overall as from_overall
  from picks join player_catalog catalog on catalog.slug = picks.slug
),
-- De viktigste statsene for hver posisjon får +2 ekstra.
key_stats (position, stats) as (values
  ('GK', array['defending', 'physical']),
  ('CB', array['defending', 'physical']),
  ('RB', array['pace', 'defending']),
  ('LB', array['pace', 'defending']),
  ('CDM', array['defending', 'passing']),
  ('CM', array['passing', 'dribbling']),
  ('CAM', array['passing', 'dribbling', 'shooting']),
  ('RW', array['pace', 'dribbling', 'shooting']),
  ('LW', array['pace', 'dribbling', 'shooting']),
  ('ST', array['shooting', 'pace', 'physical'])
)
insert into special_cards (round_id, kind, catalog_id, overall, boost, attributes, price)
select round.id, 'tots', base.id, base.overall, base.overall - base.from_overall,
  coalesce((select jsonb_object_agg(attribute.key, least(99, attribute.value::integer + base.overall - base.from_overall
    + case when attribute.key = any(key_stats.stats) then 2 else 0 end)) from jsonb_each_text(base.attributes) as attribute), '{}'::jsonb),
  ceil(public.card_value_for_overall(base.overall) * 2)::integer
from base cross join round left join key_stats on key_stats.position = base.position
on conflict (round_id, catalog_id) do nothing;

-- 3) TOTS-sjansen i vanlige pakker, halvparten av inform-sjansen.
alter table manager_packs add column if not exists tots_chance numeric not null default 0 check (tots_chance between 0 and 1);
update manager_packs set tots_chance = 0.0015 where key = 'bronse';
update manager_packs set tots_chance = 0.0025 where key = 'solv';
update manager_packs set tots_chance = 0.015 where key = 'gull';
update manager_packs set tots_chance = 0.04 where key = 'elite';

-- 4) 'tots' trekker blant TOTS-kortene. 'current' er fortsatt bare ukens inform-runde, og 'all' er alle spesialkort.
create or replace function public.draw_special_card(scope text, excluded uuid[])
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  current_round uuid;
  tiers jsonb := '[{"min":40,"max":82,"weight":50},{"min":83,"max":85,"weight":30},{"min":86,"max":87,"weight":12},{"min":88,"max":89,"weight":6},{"min":90,"max":99,"weight":2}]';
  candidates uuid[];
  tier jsonb;
  total_weight numeric := 0;
  roll numeric;
  running numeric := 0;
  picked uuid;
begin
  if scope = 'current' then current_round := public.ensure_special_round(); end if;
  candidates := array(
    select id from special_cards
    where (scope = 'all' or (scope = 'current' and round_id = current_round) or (scope = 'tots' and kind = 'tots'))
      and id <> all(coalesce(excluded, '{}'))
  );
  if cardinality(candidates) = 0 then return null; end if;

  for tier in select value from jsonb_array_elements(tiers) loop
    if exists (select 1 from special_cards where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer) then
      total_weight := total_weight + (tier->>'weight')::numeric;
    end if;
  end loop;
  roll := random() * total_weight;
  for tier in select value from jsonb_array_elements(tiers) loop
    continue when not exists (select 1 from special_cards where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer);
    running := running + (tier->>'weight')::numeric;
    if roll <= running then
      select id into picked from special_cards
      where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer
      order by random() limit 1;
      return picked;
    end if;
  end loop;
  select id into picked from special_cards where id = any(candidates) order by random() limit 1;
  return picked;
end;
$fn$;

-- 5) Pakkeåpning med TOTS-sjanse. Ellers lik versjonen i 0064.
create or replace function public.deliver_manager_pack(target_user uuid, target_pack text, paid boolean)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  profile_row player_profiles%rowtype;
  pack_row manager_packs%rowtype;
  card_row record;
  owned_before text[];
  drawn uuid[] := '{}';
  claimed uuid[] := '{}';
  slot_catalog uuid[];
  slot_special uuid[];
  used_specials uuid[] := '{}';
  normal_count integer;
  chance numeric;
  free_squad integer;
  free_storage integer;
  slot text;
  requirement jsonb;
  requirement_min integer;
  picked uuid;
  qualifying uuid;
  weakest uuid;
  replacement uuid;
  special_row special_cards%rowtype;
  pulls jsonb := '[]'::jsonb;
  new_card_id uuid;
  week_start timestamptz := (public.sbc_week_bounds()->>'week_start')::timestamptz;
begin
  select * into profile_row from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into pack_row from manager_packs where key = target_pack and active;
  if not found then raise exception 'Pakken finnes ikke'; end if;
  if paid then
    if not pack_row.purchasable then raise exception 'Denne pakken kan ikke kjøpes'; end if;
    if profile_row.manager_budget < pack_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
    if pack_row.weekly_limit is not null
      and (select count(*) from pack_openings where user_id = target_user and pack_key = target_pack and price > 0 and created_at >= week_start) >= pack_row.weekly_limit then
      raise exception 'Du har allerede kjøpt denne pakken denne uken';
    end if;
  end if;

  free_squad := public.manager_squad_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'squad');
  free_storage := public.manager_storage_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'storage');
  if free_squad + free_storage < pack_row.card_count then raise exception 'Du har ikke plass til % kort. Selg eller kast kort først', pack_row.card_count; end if;

  owned_before := array(select catalog_id::text || ':' || coalesce(special_card_id::text, '') from manager_cards where owner_id = target_user and catalog_id is not null);
  normal_count := greatest(0, pack_row.card_count - pack_row.special_guarantee);

  for slot_index in 1..normal_count loop
    picked := public.draw_pack_card(pack_row.odds, 0, drawn);
    if picked is null then raise exception 'Katalogen har ikke nok kort til denne pakken'; end if;
    drawn := drawn || picked;
  end loop;

  -- Garantiene sjekkes fra høyeste nivå og ned. Hvert garantert kort reserveres, så det ikke teller for flere nivåer.
  -- Mangler et kort, byttes det svakeste ureserverte kortet ut med et nytt trekk som oppfyller nivået.
  for requirement in select value from jsonb_array_elements(pack_row.guarantees) order by (value->>'min')::integer desc loop
    requirement_min := (requirement->>'min')::integer;
    for guarantee_index in 1..(requirement->>'count')::integer loop
      select id into qualifying from player_catalog
      where id = any(drawn) and id <> all(claimed) and overall >= requirement_min
      order by overall limit 1;
      if qualifying is null then
        select id into weakest from player_catalog where id = any(drawn) and id <> all(claimed) order by overall limit 1;
        exit when weakest is null;
        replacement := public.draw_pack_card(pack_row.odds, requirement_min, drawn);
        exit when replacement is null;
        drawn := array_replace(drawn, weakest, replacement);
        qualifying := replacement;
      end if;
      claimed := claimed || qualifying;
    end loop;
  end loop;

  slot_catalog := drawn;
  slot_special := array(select null::uuid from unnest(drawn));

  -- Hvert kort som ikke er garantert, kan bli en av ukens informs. Garanterte kort holdes utenfor, så
  -- sjansen for de andre løftes tilsvarende, og snittet per kort i pakka blir inform_chance. Arenaen løfter den litt.
  chance := pack_row.inform_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or random() >= chance;
      picked := public.draw_special_card('current', used_specials);
      exit when picked is null;
      used_specials := used_specials || picked;
      slot_special[slot_index] := picked;
      slot_catalog[slot_index] := (select catalog_id from special_cards where id = picked);
    end loop;
  end if;

  -- Samme mekanikk for TOTS, men bare for kort som ikke allerede ble inform.
  chance := pack_row.tots_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or slot_special[slot_index] is not null or random() >= chance;
      picked := public.draw_special_card('tots', used_specials);
      exit when picked is null;
      used_specials := used_specials || picked;
      slot_special[slot_index] := picked;
      slot_catalog[slot_index] := (select catalog_id from special_cards where id = picked);
    end loop;
  end if;

  for slot_index in 1..pack_row.special_guarantee loop
    picked := public.draw_special_card(pack_row.special_scope, used_specials);
    if picked is null then raise exception 'Det finnes ingen spesialkort å trekke ennå'; end if;
    used_specials := used_specials || picked;
    slot_catalog := slot_catalog || (select catalog_id from special_cards where id = picked);
    slot_special := slot_special || picked;
  end loop;

  for slot_index in 1..cardinality(slot_catalog) loop
    select * into card_row from player_catalog where id = slot_catalog[slot_index];
    special_row := null;
    if slot_special[slot_index] is not null then select * into special_row from special_cards where id = slot_special[slot_index]; end if;
    -- Triggeren sender kortet til lageret hvis spilleren allerede er i troppen, så plassen leses tilbake fra raden.
    -- Lageret kan ha så mange av samme kort man vil.
    slot := case when free_squad > 0 then 'squad' else 'storage' end;
    insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location, special_card_id, tradable)
    values (target_user, card_row.id, card_row.name, card_row.position,
      coalesce(special_row.overall, card_row.overall), coalesce(special_row.attributes, card_row.attributes),
      coalesce(special_row.price, card_row.price), slot, special_row.id, not pack_row.untradable)
    returning id, location into new_card_id, slot;
    if slot = 'squad' then free_squad := free_squad - 1; else free_storage := free_storage - 1; end if;
    pulls := pulls || jsonb_build_object(
      'card_id', new_card_id, 'catalog_id', card_row.id, 'slug', card_row.slug, 'name', card_row.name,
      'position', card_row.position, 'overall', coalesce(special_row.overall, card_row.overall), 'price', coalesce(special_row.price, card_row.price),
      'accent', card_row.accent, 'club', card_row.club, 'attributes', coalesce(special_row.attributes, card_row.attributes),
      'location', slot, 'special', special_row.kind, 'tradable', not pack_row.untradable,
      'duplicate', (card_row.id::text || ':' || coalesce(special_row.id::text, '')) = any(owned_before));
  end loop;

  if paid then
    update player_profiles set manager_budget = manager_budget - pack_row.price, updated_at = now() where user_id = target_user;
  end if;
  insert into pack_openings (user_id, pack_key, price, pulls) values (target_user, pack_row.key, case when paid then pack_row.price else 0 end, pulls);
  return pulls;
end;
$fn$;

revoke all on function public.draw_special_card(text, uuid[]) from public, anon, authenticated;
revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.draw_special_card(text, uuid[]) to service_role;
grant execute on function public.deliver_manager_pack(uuid, text, boolean) to service_role;
