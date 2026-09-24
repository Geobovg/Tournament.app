-- 1331 nye spillerkort til managerkarrieren, de beste som manglet i katalogen.
-- Klubb og nasjonalitet er hentet fra TheSportsDB 24.09.2026, samme kilde som spillerbildene.
-- Nye kort blir automatisk med i pakkene og på spillermarkedet fordi begge leser hele den aktive katalogen.
with new_catalog (slug, name, position, overall, price, accent, club) as (
  values
    -- Bayer Leverkusen
    ('edmond-tapsoba', 'Edmond Tapsoba', 'CB', 82, 66, '#e62b3f', 'Bayer Leverkusen'),
    ('exequiel-palacios', 'Exequiel Palacios', 'CM', 81, 56, '#e62b3f', 'Bayer Leverkusen'),
    ('patrik-schick', 'Patrik Schick', 'ST', 81, 56, '#e62b3f', 'Bayer Leverkusen'),
    ('malik-tillman', 'Malik Tillman', 'CAM', 80, 48, '#e62b3f', 'Bayer Leverkusen'),
    ('aleix-garcia', 'Aleix García', 'CM', 79, 42, '#e62b3f', 'Bayer Leverkusen'),
    ('loic-bade', 'Loïc Badé', 'CB', 79, 42, '#e62b3f', 'Bayer Leverkusen'),
    ('mark-flekken', 'Mark Flekken', 'GK', 79, 42, '#e62b3f', 'Bayer Leverkusen'),
    ('moussa-diaby', 'Moussa Diaby', 'RW', 79, 42, '#e62b3f', 'Bayer Leverkusen'),
    ('robert-andrich', 'Robert Andrich', 'CDM', 79, 42, '#e62b3f', 'Bayer Leverkusen'),
    ('ezequiel-fernandez', 'Ezequiel Fernández', 'CM', 78, 36, '#e62b3f', 'Bayer Leverkusen'),
    ('facundo-medina', 'Facundo Medina', 'CB', 78, 36, '#e62b3f', 'Bayer Leverkusen'),
    ('martin-terrier', 'Martin Terrier', 'LW', 78, 36, '#e62b3f', 'Bayer Leverkusen'),
    ('miguel-gutierrez', 'Miguel Gutiérrez', 'LB', 78, 36, '#e62b3f', 'Bayer Leverkusen'),
    ('eliesse-ben-seghir', 'Eliesse Ben Seghir', 'CAM', 77, 30, '#e62b3f', 'Bayer Leverkusen'),
    ('ibrahim-maza', 'Ibrahim Maza', 'CAM', 76, 26, '#e62b3f', 'Bayer Leverkusen'),
    ('jonas-hofmann', 'Jonas Hofmann', 'CAM', 76, 26, '#e62b3f', 'Bayer Leverkusen'),
    ('lucas-vazquez', 'Lucas Vázquez', 'RB', 75, 22, '#e62b3f', 'Bayer Leverkusen'),
    ('nathan-tella', 'Nathan Tella', 'RW', 75, 22, '#e62b3f', 'Bayer Leverkusen'),
    ('guela-doue', 'Guela Doué', 'RB', 74, 18, '#e62b3f', 'Bayer Leverkusen'),
    ('janis-blaswich', 'Janis Blaswich', 'GK', 74, 18, '#e62b3f', 'Bayer Leverkusen'),
    ('afonso-moreira', 'Afonso Moreira', 'LW', 72, 13, '#e62b3f', 'Bayer Leverkusen'),
    ('christian-kofane', 'Christian Kofane', 'ST', 72, 13, '#e62b3f', 'Bayer Leverkusen'),

    -- RB Leipzig
    ('castello-lukeba', 'Castello Lukeba', 'CB', 81, 56, '#e62b3f', 'RB Leipzig'),
    ('christopher-nkunku', 'Christopher Nkunku', 'ST', 81, 56, '#e62b3f', 'RB Leipzig'),
    ('david-raum', 'David Raum', 'LB', 80, 48, '#e62b3f', 'RB Leipzig'),
    ('willi-orban', 'Willi Orbán', 'CB', 80, 48, '#e62b3f', 'RB Leipzig'),
    ('christoph-baumgartner', 'Christoph Baumgartner', 'CAM', 79, 42, '#e62b3f', 'RB Leipzig'),
    ('orjan-nyland', 'Ørjan Nyland', 'GK', 79, 42, '#e62b3f', 'RB Leipzig'),
    ('benjamin-henrichs', 'Benjamin Henrichs', 'RB', 78, 36, '#e62b3f', 'RB Leipzig'),
    ('johan-bakayoko', 'Johan Bakayoko', 'RW', 78, 36, '#e62b3f', 'RB Leipzig'),
    ('nicolas-seiwald', 'Nicolas Seiwald', 'CDM', 78, 36, '#e62b3f', 'RB Leipzig'),
    ('neil-el-aynaoui', 'Neil El Aynaoui', 'CM', 77, 30, '#e62b3f', 'RB Leipzig'),
    ('ridle-baku', 'Ridle Baku', 'RB', 77, 30, '#e62b3f', 'RB Leipzig'),
    ('rocco-reitz', 'Rocco Reitz', 'CM', 77, 30, '#e62b3f', 'RB Leipzig'),
    ('arthur-vermeeren', 'Arthur Vermeeren', 'CM', 76, 26, '#e62b3f', 'RB Leipzig'),
    ('maarten-vandevoordt', 'Maarten Vandevoordt', 'GK', 76, 26, '#e62b3f', 'RB Leipzig'),
    ('assan-ouedraogo', 'Assan Ouédraogo', 'CM', 75, 22, '#e62b3f', 'RB Leipzig'),
    ('brajan-gruda', 'Brajan Gruda', 'LW', 75, 22, '#e62b3f', 'RB Leipzig'),
    ('lukas-klostermann', 'Lukas Klostermann', 'CB', 75, 22, '#e62b3f', 'RB Leipzig'),
    ('maxime-esteve', 'Maxime Estève', 'CB', 75, 22, '#e62b3f', 'RB Leipzig'),
    ('conrad-harder', 'Conrad Harder', 'ST', 74, 18, '#e62b3f', 'RB Leipzig'),
    ('kevin-kampl', 'Kevin Kampl', 'CM', 74, 18, '#e62b3f', 'RB Leipzig'),
    ('el-chadaille-bitshiabu', 'El Chadaille Bitshiabu', 'CB', 73, 15, '#e62b3f', 'RB Leipzig'),
    ('ezechiel-banzuzi', 'Ezechiel Banzuzi', 'CM', 72, 13, '#e62b3f', 'RB Leipzig'),

    -- Aston Villa
    ('boubacar-kamara', 'Boubacar Kamara', 'CDM', 82, 66, '#7a1f2b', 'Aston Villa'),
    ('amadou-onana', 'Amadou Onana', 'CDM', 81, 56, '#7a1f2b', 'Aston Villa'),
    ('john-mcginn', 'John McGinn', 'CM', 81, 56, '#7a1f2b', 'Aston Villa'),
    ('pau-torres', 'Pau Torres', 'CB', 81, 56, '#7a1f2b', 'Aston Villa'),
    ('nicolas-jackson', 'Nicolas Jackson', 'ST', 80, 48, '#7a1f2b', 'Aston Villa'),
    ('joao-gomes', 'João Gomes', 'CM', 79, 42, '#7a1f2b', 'Aston Villa'),
    ('matty-cash', 'Matty Cash', 'RB', 79, 42, '#7a1f2b', 'Aston Villa'),
    ('aaron-wan-bissaka', 'Aaron Wan-Bissaka', 'RB', 79, 42, '#7a1f2b', 'Aston Villa'),
    ('emiliano-buendia', 'Emiliano Buendía', 'CAM', 78, 36, '#7a1f2b', 'Aston Villa'),
    ('ian-maatsen', 'Ian Maatsen', 'LB', 78, 36, '#7a1f2b', 'Aston Villa'),
    ('matteo-ruggeri', 'Matteo Ruggeri', 'LB', 77, 30, '#7a1f2b', 'Aston Villa'),
    ('tammy-abraham', 'Tammy Abraham', 'ST', 77, 30, '#7a1f2b', 'Aston Villa'),
    ('tyrone-mings', 'Tyrone Mings', 'CB', 77, 30, '#7a1f2b', 'Aston Villa'),
    ('victor-lindelof', 'Victor Lindelöf', 'CB', 77, 30, '#7a1f2b', 'Aston Villa'),
    ('zion-suzuki', 'Zion Suzuki', 'GK', 77, 30, '#7a1f2b', 'Aston Villa'),
    ('marco-bizot', 'Marco Bizot', 'GK', 76, 26, '#7a1f2b', 'Aston Villa'),
    ('ross-barkley', 'Ross Barkley', 'CM', 76, 26, '#7a1f2b', 'Aston Villa'),
    ('johan-manzambi', 'Johan Manzambi', 'CM', 74, 18, '#7a1f2b', 'Aston Villa'),
    ('kosta-nedeljkovic', 'Kosta Nedeljković', 'RB', 72, 13, '#7a1f2b', 'Aston Villa'),
    ('lamare-bogarde', 'Lamare Bogarde', 'CM', 72, 13, '#7a1f2b', 'Aston Villa'),

    -- Nottingham Forest
    ('morgan-gibbs-white', 'Morgan Gibbs-White', 'CAM', 82, 66, '#d9252a', 'Nottingham Forest'),
    ('murillo', 'Murillo', 'CB', 82, 66, '#d9252a', 'Nottingham Forest'),
    ('daniel-munoz', 'Daniel Muñoz', 'RB', 81, 56, '#d9252a', 'Nottingham Forest'),
    ('nikola-milenkovic', 'Nikola Milenković', 'CB', 81, 56, '#d9252a', 'Nottingham Forest'),
    ('chris-wood', 'Chris Wood', 'ST', 80, 48, '#d9252a', 'Nottingham Forest'),
    ('dan-ndoye', 'Dan Ndoye', 'RW', 80, 48, '#d9252a', 'Nottingham Forest'),
    ('matz-sels', 'Matz Sels', 'GK', 80, 48, '#d9252a', 'Nottingham Forest'),
    ('xaver-schlager', 'Xaver Schlager', 'CM', 80, 48, '#d9252a', 'Nottingham Forest'),
    ('ola-aina', 'Ola Aina', 'RB', 79, 42, '#d9252a', 'Nottingham Forest'),
    ('callum-hudson-odoi', 'Callum Hudson-Odoi', 'LW', 78, 36, '#d9252a', 'Nottingham Forest'),
    ('neco-williams', 'Neco Williams', 'LB', 78, 36, '#d9252a', 'Nottingham Forest'),
    ('ibrahim-sangare', 'Ibrahim Sangaré', 'CDM', 77, 30, '#d9252a', 'Nottingham Forest'),
    ('arnaud-kalimuendo', 'Arnaud Kalimuendo', 'ST', 76, 26, '#d9252a', 'Nottingham Forest'),
    ('james-mcatee', 'James McAtee', 'CAM', 76, 26, '#d9252a', 'Nottingham Forest'),
    ('nicolas-dominguez', 'Nicolás Domínguez', 'CM', 76, 26, '#d9252a', 'Nottingham Forest'),
    ('john-victor', 'John Victor', 'GK', 75, 22, '#d9252a', 'Nottingham Forest'),
    ('nicolo-savona', 'Nicolò Savona', 'RB', 75, 22, '#d9252a', 'Nottingham Forest'),
    ('ryan-yates', 'Ryan Yates', 'CM', 74, 18, '#d9252a', 'Nottingham Forest'),
    ('jair-cunha', 'Jair Cunha', 'CB', 73, 15, '#d9252a', 'Nottingham Forest'),
    ('luca-netz', 'Luca Netz', 'LB', 73, 15, '#d9252a', 'Nottingham Forest'),

    -- Juventus
    ('guglielmo-vicario', 'Guglielmo Vicario', 'GK', 84, 94, '#111111', 'Juventus'),
    ('khephren-thuram', 'Khéphren Thuram', 'CM', 81, 56, '#111111', 'Juventus'),
    ('manuel-locatelli', 'Manuel Locatelli', 'CDM', 81, 56, '#111111', 'Juventus'),
    ('edon-zhegrova', 'Edon Zhegrova', 'RW', 80, 48, '#111111', 'Juventus'),
    ('nick-woltemade', 'Nick Woltemade', 'ST', 80, 48, '#111111', 'Juventus'),
    ('nicolas-gonzalez', 'Nicolás González', 'LW', 80, 48, '#111111', 'Juventus'),
    ('pape-matar-sarr', 'Pape Matar Sarr', 'CM', 80, 48, '#111111', 'Juventus'),
    ('randal-kolo-muani', 'Randal Kolo Muani', 'ST', 80, 48, '#111111', 'Juventus'),
    ('douglas-luiz', 'Douglas Luiz', 'CM', 79, 42, '#111111', 'Juventus'),
    ('jhon-lucumi', 'Jhon Lucumí', 'CB', 79, 42, '#111111', 'Juventus'),
    ('kamil-grabara', 'Kamil Grabara', 'GK', 79, 42, '#111111', 'Juventus'),
    ('pierre-kalulu', 'Pierre Kalulu', 'CB', 79, 42, '#111111', 'Juventus'),
    ('weston-mckennie', 'Weston McKennie', 'CM', 79, 42, '#111111', 'Juventus'),
    ('federico-gatti', 'Federico Gatti', 'CB', 78, 36, '#111111', 'Juventus'),
    ('lloyd-kelly', 'Lloyd Kelly', 'CB', 77, 30, '#111111', 'Juventus'),
    ('jeremie-boga', 'Jérémie Boga', 'LW', 76, 26, '#111111', 'Juventus'),
    ('mattia-perin', 'Mattia Perin', 'GK', 76, 26, '#111111', 'Juventus'),
    ('arkadiusz-milik', 'Arkadiusz Milik', 'ST', 75, 22, '#111111', 'Juventus'),
    ('juan-cabal', 'Juan Cabal', 'LB', 74, 18, '#111111', 'Juventus'),

    -- Lazio
    ('mattia-zaccagni', 'Mattia Zaccagni', 'LW', 80, 48, '#7bb8ff', 'Lazio'),
    ('nicolo-rovella', 'Nicolò Rovella', 'CDM', 80, 48, '#7bb8ff', 'Lazio'),
    ('albert-gu-mundsson', 'Albert Guðmundsson', 'CAM', 79, 42, '#7bb8ff', 'Lazio'),
    ('alessio-romagnoli', 'Alessio Romagnoli', 'CB', 79, 42, '#7bb8ff', 'Lazio'),
    ('gustav-isaksen', 'Gustav Isaksen', 'RW', 78, 36, '#7bb8ff', 'Lazio'),
    ('nuno-tavares', 'Nuno Tavares', 'LB', 78, 36, '#7bb8ff', 'Lazio'),
    ('adam-marusic', 'Adam Marušić', 'RB', 77, 30, '#7bb8ff', 'Lazio'),
    ('kenneth-taylor', 'Kenneth Taylor', 'CM', 77, 30, '#7bb8ff', 'Lazio'),
    ('alfonso-pedraza', 'Alfonso Pedraza', 'LB', 76, 26, '#7bb8ff', 'Lazio'),
    ('danilho-doekhi', 'Danilho Doekhi', 'CB', 76, 26, '#7bb8ff', 'Lazio'),
    ('diogo-leite', 'Diogo Leite', 'CB', 76, 26, '#7bb8ff', 'Lazio'),
    ('andrea-pinamonti', 'Andrea Pinamonti', 'ST', 75, 22, '#7bb8ff', 'Lazio'),
    ('manuel-lazzari', 'Manuel Lazzari', 'RB', 75, 22, '#7bb8ff', 'Lazio'),
    ('fisayo-dele-bashiru', 'Fisayo Dele-Bashiru', 'CM', 74, 18, '#7bb8ff', 'Lazio'),
    ('luca-pellegrini', 'Luca Pellegrini', 'LB', 74, 18, '#7bb8ff', 'Lazio'),
    ('pedro', 'Pedro', 'RW', 74, 18, '#7bb8ff', 'Lazio'),
    ('samuel-gigot', 'Samuel Gigot', 'CB', 74, 18, '#7bb8ff', 'Lazio'),
    ('tijjani-noslin', 'Tijjani Noslin', 'ST', 74, 18, '#7bb8ff', 'Lazio'),
    ('reda-belahyane', 'Reda Belahyane', 'CM', 71, 12, '#7bb8ff', 'Lazio'),

    -- Torino
    ('marcus-holmgren-pedersen', 'Marcus Holmgren Pedersen', 'RB', 78, 36, '#7a1f2b', 'Torino'),
    ('rolando-mandragora', 'Rolando Mandragora', 'CM', 78, 36, '#7a1f2b', 'Torino'),
    ('nikola-vlasic', 'Nikola Vlašić', 'CAM', 77, 30, '#7a1f2b', 'Torino'),
    ('pietro-comuzzo', 'Pietro Comuzzo', 'CB', 77, 30, '#7a1f2b', 'Torino'),
    ('duvan-zapata', 'Duván Zapata', 'ST', 76, 26, '#7a1f2b', 'Torino'),
    ('giovanni-simeone', 'Giovanni Simeone', 'ST', 75, 22, '#7a1f2b', 'Torino'),
    ('ricardo-rodriguez', 'Ricardo Rodríguez', 'LB', 75, 22, '#7a1f2b', 'Torino'),
    ('saul-coco', 'Saúl Coco', 'CB', 75, 22, '#7a1f2b', 'Torino'),
    ('cesare-casadei', 'Cesare Casadei', 'CM', 74, 18, '#7a1f2b', 'Torino'),
    ('che-adams', 'Che Adams', 'ST', 74, 18, '#7a1f2b', 'Torino'),
    ('cyril-ngonge', 'Cyril Ngonge', 'RW', 74, 18, '#7a1f2b', 'Torino'),
    ('ardian-ismajli', 'Ardian Ismajli', 'CB', 73, 15, '#7a1f2b', 'Torino'),
    ('eray-comert', 'Eray Cömert', 'CB', 73, 15, '#7a1f2b', 'Torino'),
    ('franco-israel', 'Franco Israel', 'GK', 73, 15, '#7a1f2b', 'Torino'),
    ('valentino-lazaro', 'Valentino Lazaro', 'RB', 73, 15, '#7a1f2b', 'Torino'),
    ('zakaria-aboukhlal', 'Zakaria Aboukhlal', 'RW', 73, 15, '#7a1f2b', 'Torino'),
    ('gvidas-gineitis', 'Gvidas Gineitis', 'CM', 72, 13, '#7a1f2b', 'Torino'),
    ('nathan-patterson', 'Nathan Patterson', 'RB', 72, 13, '#7a1f2b', 'Torino'),
    ('rafik-belghali', 'Rafik Belghali', 'RB', 72, 13, '#7a1f2b', 'Torino'),

    -- Villarreal
    ('ayoze-perez', 'Ayoze Pérez', 'ST', 79, 42, '#f2c94c', 'Villarreal'),
    ('gerard-moreno', 'Gerard Moreno', 'ST', 79, 42, '#f2c94c', 'Villarreal'),
    ('peter-gulacsi', 'Péter Gulácsi', 'GK', 79, 42, '#f2c94c', 'Villarreal'),
    ('alberto-moleiro', 'Alberto Moleiro', 'CAM', 78, 36, '#f2c94c', 'Villarreal'),
    ('dani-parejo', 'Dani Parejo', 'CM', 78, 36, '#f2c94c', 'Villarreal'),
    ('georges-mikautadze', 'Georges Mikautadze', 'ST', 78, 36, '#f2c94c', 'Villarreal'),
    ('juan-foyth', 'Juan Foyth', 'CB', 78, 36, '#f2c94c', 'Villarreal'),
    ('nicolas-pepe', 'Nicolas Pépé', 'RW', 78, 36, '#f2c94c', 'Villarreal'),
    ('pape-gueye', 'Pape Gueye', 'CDM', 78, 36, '#f2c94c', 'Villarreal'),
    ('renato-veiga', 'Renato Veiga', 'CB', 78, 36, '#f2c94c', 'Villarreal'),
    ('luiz-junior', 'Luiz Júnior', 'GK', 77, 30, '#f2c94c', 'Villarreal'),
    ('santi-comesana', 'Santi Comesaña', 'CM', 77, 30, '#f2c94c', 'Villarreal'),
    ('tajon-buchanan', 'Tajon Buchanan', 'RW', 77, 30, '#f2c94c', 'Villarreal'),
    ('sergi-cardona', 'Sergi Cardona', 'LB', 76, 26, '#f2c94c', 'Villarreal'),
    ('carlos-romero', 'Carlos Romero', 'LB', 75, 22, '#f2c94c', 'Villarreal'),
    ('logan-costa', 'Logan Costa', 'CB', 75, 22, '#f2c94c', 'Villarreal'),
    ('santiago-mourino', 'Santiago Mouriño', 'RB', 74, 18, '#f2c94c', 'Villarreal'),
    ('ilias-akhomach', 'Ilias Akhomach', 'RW', 73, 15, '#f2c94c', 'Villarreal'),
    ('tani-oluwaseyi', 'Tani Oluwaseyi', 'ST', 72, 13, '#f2c94c', 'Villarreal'),

    -- Monaco
    ('denis-zakaria', 'Denis Zakaria', 'CDM', 80, 48, '#d9252a', 'Monaco'),
    ('lukas-hradecky', 'Lukáš Hrádecký', 'GK', 80, 48, '#d9252a', 'Monaco'),
    ('aleksandr-golovin', 'Aleksandr Golovin', 'CAM', 79, 42, '#d9252a', 'Monaco'),
    ('lamine-camara', 'Lamine Camara', 'CM', 79, 42, '#d9252a', 'Monaco'),
    ('vanderson', 'Vanderson', 'RB', 79, 42, '#d9252a', 'Monaco'),
    ('folarin-balogun', 'Folarin Balogun', 'ST', 78, 36, '#d9252a', 'Monaco'),
    ('takumi-minamino', 'Takumi Minamino', 'CAM', 78, 36, '#d9252a', 'Monaco'),
    ('ansu-fati', 'Ansu Fati', 'LW', 77, 30, '#d9252a', 'Monaco'),
    ('eric-dier', 'Eric Dier', 'CB', 77, 30, '#d9252a', 'Monaco'),
    ('mika-biereth', 'Mika Biereth', 'ST', 77, 30, '#d9252a', 'Monaco'),
    ('mohammed-salisu', 'Mohammed Salisu', 'CB', 77, 30, '#d9252a', 'Monaco'),
    ('paul-pogba', 'Paul Pogba', 'CM', 77, 30, '#d9252a', 'Monaco'),
    ('philipp-kohn', 'Philipp Köhn', 'GK', 77, 30, '#d9252a', 'Monaco'),
    ('simon-adingra', 'Simon Adingra', 'LW', 76, 26, '#d9252a', 'Monaco'),
    ('jordan-teze', 'Jordan Teze', 'RB', 74, 18, '#d9252a', 'Monaco'),
    ('krepin-diatta', 'Krépin Diatta', 'RW', 74, 18, '#d9252a', 'Monaco'),
    ('matthis-abline', 'Matthis Abline', 'ST', 74, 18, '#d9252a', 'Monaco'),
    ('christian-mawissa', 'Christian Mawissa', 'CB', 73, 15, '#d9252a', 'Monaco'),

    -- Napoli
    ('scott-mctominay', 'Scott McTominay', 'CM', 85, 112, '#7bb8ff', 'Napoli'),
    ('stanislav-lobotka', 'Stanislav Lobotka', 'CDM', 84, 94, '#7bb8ff', 'Napoli'),
    ('alessandro-buongiorno', 'Alessandro Buongiorno', 'CB', 82, 66, '#7bb8ff', 'Napoli'),
    ('giovanni-di-lorenzo', 'Giovanni Di Lorenzo', 'RB', 82, 66, '#7bb8ff', 'Napoli'),
    ('alex-meret', 'Alex Meret', 'GK', 81, 56, '#7bb8ff', 'Napoli'),
    ('amir-rrahmani', 'Amir Rrahmani', 'CB', 81, 56, '#7bb8ff', 'Napoli'),
    ('andre-frank-zambo-anguissa', 'André-Frank Zambo Anguissa', 'CM', 81, 56, '#7bb8ff', 'Napoli'),
    ('sam-beukema', 'Sam Beukema', 'CB', 80, 48, '#7bb8ff', 'Napoli'),
    ('vanja-milinkovic-savic', 'Vanja Milinković-Savić', 'GK', 80, 48, '#7bb8ff', 'Napoli'),
    ('david-neres', 'David Neres', 'RW', 79, 42, '#7bb8ff', 'Napoli'),
    ('matteo-politano', 'Matteo Politano', 'RW', 79, 42, '#7bb8ff', 'Napoli'),
    ('noa-lang', 'Noa Lang', 'LW', 79, 42, '#7bb8ff', 'Napoli'),
    ('benoit-badiashile', 'Benoît Badiashile', 'CB', 78, 36, '#7bb8ff', 'Napoli'),
    ('billy-gilmour', 'Billy Gilmour', 'CM', 78, 36, '#7bb8ff', 'Napoli'),
    ('mathias-olivera', 'Mathías Olivera', 'LB', 78, 36, '#7bb8ff', 'Napoli'),
    ('leonardo-spinazzola', 'Leonardo Spinazzola', 'LB', 77, 30, '#7bb8ff', 'Napoli'),
    ('lorenzo-lucca', 'Lorenzo Lucca', 'ST', 76, 26, '#7bb8ff', 'Napoli'),
    ('rafa-marin', 'Rafa Marín', 'CB', 76, 26, '#7bb8ff', 'Napoli'),

    -- Real Sociedad
    ('mikel-oyarzabal', 'Mikel Oyarzabal', 'ST', 82, 66, '#1b76d1', 'Real Sociedad'),
    ('alex-remiro', 'Álex Remiro', 'GK', 81, 56, '#1b76d1', 'Real Sociedad'),
    ('takefusa-kubo', 'Takefusa Kubo', 'RW', 81, 56, '#1b76d1', 'Real Sociedad'),
    ('igor-zubeldia', 'Igor Zubeldia', 'CB', 79, 42, '#1b76d1', 'Real Sociedad'),
    ('ander-barrenetxea', 'Ander Barrenetxea', 'LW', 78, 36, '#1b76d1', 'Real Sociedad'),
    ('luka-sucic', 'Luka Sučić', 'CM', 77, 30, '#1b76d1', 'Real Sociedad'),
    ('sergio-gomez', 'Sergio Gómez', 'LB', 77, 30, '#1b76d1', 'Real Sociedad'),
    ('yangel-herrera', 'Yangel Herrera', 'CM', 77, 30, '#1b76d1', 'Real Sociedad'),
    ('carlos-soler', 'Carlos Soler', 'CM', 76, 26, '#1b76d1', 'Real Sociedad'),
    ('benat-turrientes', 'Beñat Turrientes', 'CM', 75, 22, '#1b76d1', 'Real Sociedad'),
    ('goncalo-guedes', 'Gonçalo Guedes', 'RW', 75, 22, '#1b76d1', 'Real Sociedad'),
    ('jon-aramburu', 'Jon Aramburu', 'RB', 75, 22, '#1b76d1', 'Real Sociedad'),
    ('orri-oskarsson', 'Orri Óskarsson', 'ST', 75, 22, '#1b76d1', 'Real Sociedad'),
    ('aihen-munoz', 'Aihen Muñoz', 'LB', 74, 18, '#1b76d1', 'Real Sociedad'),
    ('arsen-zakharyan', 'Arsen Zakharyan', 'CAM', 74, 18, '#1b76d1', 'Real Sociedad'),
    ('mamadou-sarr', 'Mamadou Sarr', 'CB', 72, 13, '#1b76d1', 'Real Sociedad'),
    ('pablo-marin', 'Pablo Marín', 'CM', 72, 13, '#1b76d1', 'Real Sociedad'),
    ('unai-marrero', 'Unai Marrero', 'GK', 72, 13, '#1b76d1', 'Real Sociedad'),

    -- Roma
    ('mile-svilar', 'Mile Svilar', 'GK', 83, 78, '#7a1f2b', 'Roma'),
    ('manu-kone', 'Manu Koné', 'CM', 81, 56, '#7a1f2b', 'Roma'),
    ('paulo-dybala', 'Paulo Dybala', 'CAM', 81, 56, '#7a1f2b', 'Roma'),
    ('donyell-malen', 'Donyell Malen', 'ST', 80, 48, '#7a1f2b', 'Roma'),
    ('evan-ndicka', 'Evan Ndicka', 'CB', 80, 48, '#7a1f2b', 'Roma'),
    ('gianluca-mancini', 'Gianluca Mancini', 'CB', 80, 48, '#7a1f2b', 'Roma'),
    ('leonardo-balerdi', 'Leonardo Balerdi', 'CB', 80, 48, '#7a1f2b', 'Roma'),
    ('nahuel-molina', 'Nahuel Molina', 'RB', 80, 48, '#7a1f2b', 'Roma'),
    ('lorenzo-pellegrini', 'Lorenzo Pellegrini', 'CAM', 79, 42, '#7a1f2b', 'Roma'),
    ('marten-de-roon', 'Marten de Roon', 'CDM', 79, 42, '#7a1f2b', 'Roma'),
    ('matias-soule', 'Matías Soulé', 'RW', 79, 42, '#7a1f2b', 'Roma'),
    ('bryan-cristante', 'Bryan Cristante', 'CM', 78, 36, '#7a1f2b', 'Roma'),
    ('mario-hermoso', 'Mario Hermoso', 'CB', 78, 36, '#7a1f2b', 'Roma'),
    ('santiago-castro', 'Santiago Castro', 'ST', 78, 36, '#7a1f2b', 'Roma'),
    ('wesley', 'Wesley', 'RB', 78, 36, '#7a1f2b', 'Roma'),
    ('konstantinos-koulierakis', 'Konstantinos Koulierakis', 'CB', 75, 22, '#7a1f2b', 'Roma'),
    ('devyne-rensch', 'Devyne Rensch', 'RB', 74, 18, '#7a1f2b', 'Roma'),
    ('niccolo-pisilli', 'Niccolò Pisilli', 'CM', 73, 15, '#7a1f2b', 'Roma'),

    -- Stuttgart
    ('angelo-stiller', 'Angelo Stiller', 'CDM', 82, 66, '#d9252a', 'Stuttgart'),
    ('deniz-undav', 'Deniz Undav', 'ST', 80, 48, '#d9252a', 'Stuttgart'),
    ('ermedin-demirovic', 'Ermedin Demirović', 'ST', 79, 42, '#d9252a', 'Stuttgart'),
    ('maximilian-mittelstadt', 'Maximilian Mittelstädt', 'LB', 79, 42, '#d9252a', 'Stuttgart'),
    ('bilal-el-khannouss', 'Bilal El Khannouss', 'CAM', 78, 36, '#d9252a', 'Stuttgart'),
    ('chris-fuhrich', 'Chris Führich', 'LW', 78, 36, '#d9252a', 'Stuttgart'),
    ('jamie-leweling', 'Jamie Leweling', 'RW', 78, 36, '#d9252a', 'Stuttgart'),
    ('atakan-karazor', 'Atakan Karazor', 'CDM', 77, 30, '#d9252a', 'Stuttgart'),
    ('josha-vagnoman', 'Josha Vagnoman', 'RB', 76, 26, '#d9252a', 'Stuttgart'),
    ('lorenz-assignon', 'Lorenz Assignon', 'RB', 76, 26, '#d9252a', 'Stuttgart'),
    ('grischa-promel', 'Grischa Prömel', 'CM', 74, 18, '#d9252a', 'Stuttgart'),
    ('tiago-tomas', 'Tiago Tomás', 'ST', 74, 18, '#d9252a', 'Stuttgart'),
    ('chema-andres', 'Chema Andrés', 'CM', 73, 15, '#d9252a', 'Stuttgart'),
    ('ramon-hendriks', 'Ramon Hendriks', 'CB', 73, 15, '#d9252a', 'Stuttgart'),
    ('badredine-bouanani', 'Badredine Bouanani', 'RW', 72, 13, '#d9252a', 'Stuttgart'),
    ('finn-jeltsch', 'Finn Jeltsch', 'CB', 72, 13, '#d9252a', 'Stuttgart'),
    ('nikolas-nartey', 'Nikolas Nartey', 'CM', 72, 13, '#d9252a', 'Stuttgart'),
    ('pascal-stenzel', 'Pascal Stenzel', 'RB', 72, 13, '#d9252a', 'Stuttgart'),

    -- Atalanta
    ('charles-de-ketelaere', 'Charles De Ketelaere', 'CAM', 82, 66, '#1355a0', 'Atalanta'),
    ('marco-carnesecchi', 'Marco Carnesecchi', 'GK', 81, 56, '#1355a0', 'Atalanta'),
    ('franck-kessie', 'Franck Kessié', 'CM', 80, 48, '#1355a0', 'Atalanta'),
    ('isak-hien', 'Isak Hien', 'CB', 80, 48, '#1355a0', 'Atalanta'),
    ('giacomo-raspadori', 'Giacomo Raspadori', 'ST', 78, 36, '#1355a0', 'Atalanta'),
    ('gianluca-scamacca', 'Gianluca Scamacca', 'ST', 78, 36, '#1355a0', 'Atalanta'),
    ('mario-pasalic', 'Mario Pašalić', 'CM', 78, 36, '#1355a0', 'Atalanta'),
    ('nikola-krstovic', 'Nikola Krstović', 'ST', 78, 36, '#1355a0', 'Atalanta'),
    ('lazar-samardzic', 'Lazar Samardžić', 'CAM', 77, 30, '#1355a0', 'Atalanta'),
    ('odilon-kossounou', 'Odilon Kossounou', 'CB', 77, 30, '#1355a0', 'Atalanta'),
    ('raoul-bellanova', 'Raoul Bellanova', 'RB', 77, 30, '#1355a0', 'Atalanta'),
    ('davide-zappacosta', 'Davide Zappacosta', 'RB', 76, 26, '#1355a0', 'Atalanta'),
    ('eljif-elmas', 'Eljif Elmas', 'CAM', 76, 26, '#1355a0', 'Atalanta'),
    ('kamaldeen-sulemana', 'Kamaldeen Sulemana', 'LW', 76, 26, '#1355a0', 'Atalanta'),
    ('sead-kolasinac', 'Sead Kolašinac', 'CB', 76, 26, '#1355a0', 'Atalanta'),
    ('nicola-zalewski', 'Nicola Zalewski', 'LW', 75, 22, '#1355a0', 'Atalanta'),
    ('gianluca-gaetano', 'Gianluca Gaetano', 'CAM', 74, 18, '#1355a0', 'Atalanta'),

    -- Brentford
    ('caoimhin-kelleher', 'Caoimhín Kelleher', 'GK', 80, 48, '#e62b3f', 'Brentford'),
    ('igor-thiago', 'Igor Thiago', 'ST', 80, 48, '#e62b3f', 'Brentford'),
    ('mikkel-damsgaard', 'Mikkel Damsgaard', 'CAM', 79, 42, '#e62b3f', 'Brentford'),
    ('nathan-collins', 'Nathan Collins', 'CB', 79, 42, '#e62b3f', 'Brentford'),
    ('kevin-schade', 'Kevin Schade', 'LW', 78, 36, '#e62b3f', 'Brentford'),
    ('dango-ouattara', 'Dango Ouattara', 'RW', 77, 30, '#e62b3f', 'Brentford'),
    ('mathias-jensen', 'Mathias Jensen', 'CM', 77, 30, '#e62b3f', 'Brentford'),
    ('sepp-van-den-berg', 'Sepp van den Berg', 'CB', 77, 30, '#e62b3f', 'Brentford'),
    ('vitaly-janelt', 'Vitaly Janelt', 'CM', 77, 30, '#e62b3f', 'Brentford'),
    ('keane-lewis-potter', 'Keane Lewis-Potter', 'LW', 76, 26, '#e62b3f', 'Brentford'),
    ('callum-wilson', 'Callum Wilson', 'ST', 75, 22, '#e62b3f', 'Brentford'),
    ('michael-kayode', 'Michael Kayode', 'RB', 75, 22, '#e62b3f', 'Brentford'),
    ('aaron-hickey', 'Aaron Hickey', 'RB', 75, 22, '#e62b3f', 'Brentford'),
    ('fabio-carvalho', 'Fábio Carvalho', 'CAM', 74, 18, '#e62b3f', 'Brentford'),
    ('jaidon-anthony', 'Jaidon Anthony', 'LW', 74, 18, '#e62b3f', 'Brentford'),
    ('mamadou-sangare', 'Mamadou Sangaré', 'CM', 74, 18, '#e62b3f', 'Brentford'),
    ('rico-henry', 'Rico Henry', 'LB', 74, 18, '#e62b3f', 'Brentford'),

    -- Brighton & Hove Albion
    ('kaoru-mitoma', 'Kaoru Mitoma', 'LW', 81, 56, '#1b76d1', 'Brighton & Hove Albion'),
    ('ferdi-kadioglu', 'Ferdi Kadıoğlu', 'LB', 80, 48, '#1b76d1', 'Brighton & Hove Albion'),
    ('pascal-gross', 'Pascal Groß', 'CM', 80, 48, '#1b76d1', 'Brighton & Hove Albion'),
    ('bart-verbruggen', 'Bart Verbruggen', 'GK', 79, 42, '#1b76d1', 'Brighton & Hove Albion'),
    ('lewis-dunk', 'Lewis Dunk', 'CB', 79, 42, '#1b76d1', 'Brighton & Hove Albion'),
    ('georginio-rutter', 'Georginio Rutter', 'CAM', 78, 36, '#1b76d1', 'Brighton & Hove Albion'),
    ('matt-o-riley', 'Matt O''Riley', 'CM', 78, 36, '#1b76d1', 'Brighton & Hove Albion'),
    ('yankuba-minteh', 'Yankuba Minteh', 'RW', 78, 36, '#1b76d1', 'Brighton & Hove Albion'),
    ('diego-gomez', 'Diego Gómez', 'CM', 77, 30, '#1b76d1', 'Brighton & Hove Albion'),
    ('mats-wieffer', 'Mats Wieffer', 'CDM', 77, 30, '#1b76d1', 'Brighton & Hove Albion'),
    ('maxim-de-cuyper', 'Maxim De Cuyper', 'LB', 77, 30, '#1b76d1', 'Brighton & Hove Albion'),
    ('evan-ferguson', 'Evan Ferguson', 'ST', 76, 26, '#1b76d1', 'Brighton & Hove Albion'),
    ('jack-hinshelwood', 'Jack Hinshelwood', 'CM', 76, 26, '#1b76d1', 'Brighton & Hove Albion'),
    ('olivier-boscagli', 'Olivier Boscagli', 'CB', 76, 26, '#1b76d1', 'Brighton & Hove Albion'),
    ('pascal-struijk', 'Pascal Struijk', 'CB', 75, 22, '#1b76d1', 'Brighton & Hove Albion'),
    ('luka-vuskovic', 'Luka Vušković', 'CB', 73, 15, '#1b76d1', 'Brighton & Hove Albion'),
    ('stefanos-tzimas', 'Stefanos Tzimas', 'ST', 73, 15, '#1b76d1', 'Brighton & Hove Albion'),

    -- Como
    ('moise-kean', 'Moise Kean', 'ST', 82, 66, '#1355a0', 'Como'),
    ('nico-paz', 'Nico Paz', 'CAM', 82, 66, '#1355a0', 'Como'),
    ('trevoh-chalobah', 'Trevoh Chalobah', 'CB', 80, 48, '#1355a0', 'Como'),
    ('maximo-perrone', 'Máximo Perrone', 'CM', 78, 36, '#1355a0', 'Como'),
    ('samuele-ricci', 'Samuele Ricci', 'CDM', 78, 36, '#1355a0', 'Como'),
    ('assane-diao', 'Assane Diao', 'RW', 77, 30, '#1355a0', 'Como'),
    ('jean-butez', 'Jean Butez', 'GK', 77, 30, '#1355a0', 'Como'),
    ('lucas-da-cunha', 'Lucas Da Cunha', 'CM', 77, 30, '#1355a0', 'Como'),
    ('yan-couto', 'Yan Couto', 'RB', 77, 30, '#1355a0', 'Como'),
    ('jesus-rodriguez', 'Jesús Rodríguez', 'LW', 76, 26, '#1355a0', 'Como'),
    ('luis-milla', 'Luis Milla', 'CM', 76, 26, '#1355a0', 'Como'),
    ('marc-oliver-kempf', 'Marc-Oliver Kempf', 'CB', 76, 26, '#1355a0', 'Como'),
    ('martin-baturina', 'Martin Baturina', 'CAM', 76, 26, '#1355a0', 'Como'),
    ('tasos-douvikas', 'Tasos Douvikas', 'ST', 76, 26, '#1355a0', 'Como'),
    ('jacobo-ramon', 'Jacobo Ramón', 'CB', 75, 22, '#1355a0', 'Como'),
    ('maxence-caqueret', 'Maxence Caqueret', 'CM', 75, 22, '#1355a0', 'Como'),
    ('alberto-dossena', 'Alberto Dossena', 'CB', 74, 18, '#1355a0', 'Como'),

    -- Freiburg
    ('matthias-ginter', 'Matthias Ginter', 'CB', 79, 42, '#d9252a', 'Freiburg'),
    ('philipp-lienhart', 'Philipp Lienhart', 'CB', 78, 36, '#d9252a', 'Freiburg'),
    ('vincenzo-grifo', 'Vincenzo Grifo', 'LW', 78, 36, '#d9252a', 'Freiburg'),
    ('christian-gunter', 'Christian Günter', 'LB', 77, 30, '#d9252a', 'Freiburg'),
    ('maximilian-eggestein', 'Maximilian Eggestein', 'CM', 77, 30, '#d9252a', 'Freiburg'),
    ('yuito-suzuki', 'Yuito Suzuki', 'CAM', 76, 26, '#d9252a', 'Freiburg'),
    ('jan-niklas-beste', 'Jan-Niklas Beste', 'LW', 75, 22, '#d9252a', 'Freiburg'),
    ('igor-matanovic', 'Igor Matanović', 'ST', 74, 18, '#d9252a', 'Freiburg'),
    ('jordy-makengo', 'Jordy Makengo', 'LB', 74, 18, '#d9252a', 'Freiburg'),
    ('lukas-kubler', 'Lukas Kübler', 'RB', 74, 18, '#d9252a', 'Freiburg'),
    ('patrick-osterhage', 'Patrick Osterhage', 'CM', 74, 18, '#d9252a', 'Freiburg'),
    ('lucas-holer', 'Lucas Höler', 'ST', 73, 15, '#d9252a', 'Freiburg'),
    ('max-rosenfelder', 'Max Rosenfelder', 'CB', 73, 15, '#d9252a', 'Freiburg'),
    ('nicolas-hofler', 'Nicolas Höfler', 'CDM', 73, 15, '#d9252a', 'Freiburg'),
    ('derry-scherhant', 'Derry Scherhant', 'LW', 72, 13, '#d9252a', 'Freiburg'),
    ('mio-backhaus', 'Mio Backhaus', 'GK', 72, 13, '#d9252a', 'Freiburg'),
    ('yannik-engelhardt', 'Yannik Engelhardt', 'CDM', 72, 13, '#d9252a', 'Freiburg'),

    -- Leeds United
    ('harry-wilson', 'Harry Wilson', 'RW', 78, 36, '#ffffff', 'Leeds United'),
    ('jaka-bijol', 'Jaka Bijol', 'CB', 77, 30, '#ffffff', 'Leeds United'),
    ('nico-elvedi', 'Nico Elvedi', 'CB', 77, 30, '#ffffff', 'Leeds United'),
    ('anton-stach', 'Anton Stach', 'CM', 76, 26, '#ffffff', 'Leeds United'),
    ('dominic-calvert-lewin', 'Dominic Calvert-Lewin', 'ST', 76, 26, '#ffffff', 'Leeds United'),
    ('ethan-ampadu', 'Ethan Ampadu', 'CDM', 76, 26, '#ffffff', 'Leeds United'),
    ('joe-rodon', 'Joe Rodon', 'CB', 76, 26, '#ffffff', 'Leeds United'),
    ('noah-okafor', 'Noah Okafor', 'LW', 76, 26, '#ffffff', 'Leeds United'),
    ('brenden-aaronson', 'Brenden Aaronson', 'CAM', 75, 22, '#ffffff', 'Leeds United'),
    ('gabriel-gudmundsson', 'Gabriel Gudmundsson', 'LB', 75, 22, '#ffffff', 'Leeds United'),
    ('sean-longstaff', 'Sean Longstaff', 'CM', 75, 22, '#ffffff', 'Leeds United'),
    ('daniel-james', 'Daniel James', 'RW', 74, 18, '#ffffff', 'Leeds United'),
    ('jayden-bogle', 'Jayden Bogle', 'RB', 74, 18, '#ffffff', 'Leeds United'),
    ('lukas-nmecha', 'Lukas Nmecha', 'ST', 74, 18, '#ffffff', 'Leeds United'),
    ('tarik-muharemovic', 'Tarik Muharemović', 'CB', 73, 15, '#ffffff', 'Leeds United'),
    ('ilia-gruev', 'Ilia Gruev', 'CM', 72, 13, '#ffffff', 'Leeds United'),
    ('mateo-joseph', 'Mateo Joseph', 'ST', 72, 13, '#ffffff', 'Leeds United'),

    -- Newcastle United
    ('joelinton', 'Joelinton', 'CM', 82, 66, '#111111', 'Newcastle United'),
    ('sven-botman', 'Sven Botman', 'CB', 81, 56, '#111111', 'Newcastle United'),
    ('yoane-wissa', 'Yoane Wissa', 'ST', 81, 56, '#111111', 'Newcastle United'),
    ('fabian-schar', 'Fabian Schär', 'CB', 80, 48, '#111111', 'Newcastle United'),
    ('malick-thiaw', 'Malick Thiaw', 'CB', 80, 48, '#111111', 'Newcastle United'),
    ('tino-livramento', 'Tino Livramento', 'RB', 80, 48, '#111111', 'Newcastle United'),
    ('anthony-elanga', 'Anthony Elanga', 'RW', 79, 42, '#111111', 'Newcastle United'),
    ('dan-burn', 'Dan Burn', 'CB', 79, 42, '#111111', 'Newcastle United'),
    ('harvey-barnes', 'Harvey Barnes', 'LW', 79, 42, '#111111', 'Newcastle United'),
    ('jacob-murphy', 'Jacob Murphy', 'RW', 79, 42, '#111111', 'Newcastle United'),
    ('lewis-hall', 'Lewis Hall', 'LB', 79, 42, '#111111', 'Newcastle United'),
    ('jacob-ramsey', 'Jacob Ramsey', 'CM', 77, 30, '#111111', 'Newcastle United'),
    ('bazoumana-toure', 'Bazoumana Touré', 'LW', 76, 26, '#111111', 'Newcastle United'),
    ('joe-willock', 'Joe Willock', 'CM', 76, 26, '#111111', 'Newcastle United'),
    ('lewis-miley', 'Lewis Miley', 'CM', 74, 18, '#111111', 'Newcastle United'),
    ('matias-fernandez-pardo', 'Matías Fernández-Pardo', 'RW', 74, 18, '#111111', 'Newcastle United'),
    ('william-osula', 'William Osula', 'ST', 73, 15, '#111111', 'Newcastle United'),

    -- Sunderland
    ('granit-xhaka', 'Granit Xhaka', 'CM', 80, 48, '#e62b3f', 'Sunderland'),
    ('kevin-danso', 'Kevin Danso', 'CB', 78, 36, '#e62b3f', 'Sunderland'),
    ('nordi-mukiele', 'Nordi Mukiele', 'RB', 77, 30, '#e62b3f', 'Sunderland'),
    ('brian-brobbey', 'Brian Brobbey', 'ST', 76, 26, '#e62b3f', 'Sunderland'),
    ('enzo-le-fee', 'Enzo Le Fée', 'CM', 76, 26, '#e62b3f', 'Sunderland'),
    ('habib-diarra', 'Habib Diarra', 'CM', 76, 26, '#e62b3f', 'Sunderland'),
    ('noah-sadiki', 'Noah Sadiki', 'CM', 76, 26, '#e62b3f', 'Sunderland'),
    ('omar-alderete', 'Omar Alderete', 'CB', 76, 26, '#e62b3f', 'Sunderland'),
    ('robin-roefs', 'Robin Roefs', 'GK', 76, 26, '#e62b3f', 'Sunderland'),
    ('thomas-meunier', 'Thomas Meunier', 'RB', 76, 26, '#e62b3f', 'Sunderland'),
    ('dan-ballard', 'Dan Ballard', 'CB', 75, 22, '#e62b3f', 'Sunderland'),
    ('reinildo-mandava', 'Reinildo Mandava', 'LB', 75, 22, '#e62b3f', 'Sunderland'),
    ('wilson-isidor', 'Wilson Isidor', 'ST', 75, 22, '#e62b3f', 'Sunderland'),
    ('trai-hume', 'Trai Hume', 'RB', 74, 18, '#e62b3f', 'Sunderland'),
    ('chemsdine-talbi', 'Chemsdine Talbi', 'RW', 72, 13, '#e62b3f', 'Sunderland'),
    ('luke-o-nien', 'Luke O''Nien', 'CB', 72, 13, '#e62b3f', 'Sunderland'),
    ('chris-rigg', 'Chris Rigg', 'CM', 71, 12, '#e62b3f', 'Sunderland'),

    -- 1. FC Köln
    ('ellyes-skhiri', 'Ellyes Skhiri', 'CDM', 78, 36, '#d9252a', '1. FC Köln'),
    ('marvin-schwabe', 'Marvin Schwäbe', 'GK', 75, 22, '#d9252a', '1. FC Köln'),
    ('sebastian-sebulonsen', 'Sebastian Sebulonsen', 'RB', 75, 22, '#d9252a', '1. FC Köln'),
    ('borna-sosa', 'Borna Sosa', 'LB', 74, 18, '#d9252a', '1. FC Köln'),
    ('eric-martel', 'Eric Martel', 'CDM', 74, 18, '#d9252a', '1. FC Köln'),
    ('said-el-mala', 'Said El Mala', 'LW', 74, 18, '#d9252a', '1. FC Köln'),
    ('thijs-dallinga', 'Thijs Dallinga', 'ST', 74, 18, '#d9252a', '1. FC Köln'),
    ('isak-johannesson', 'Isak Johannesson', 'CM', 73, 15, '#d9252a', '1. FC Köln'),
    ('jan-thielmann', 'Jan Thielmann', 'RW', 73, 15, '#d9252a', '1. FC Köln'),
    ('linton-maina', 'Linton Maina', 'LW', 73, 15, '#d9252a', '1. FC Köln'),
    ('luca-waldschmidt', 'Luca Waldschmidt', 'CAM', 73, 15, '#d9252a', '1. FC Köln'),
    ('marius-bulter', 'Marius Bülter', 'LW', 73, 15, '#d9252a', '1. FC Köln'),
    ('ragnar-ache', 'Ragnar Ache', 'ST', 73, 15, '#d9252a', '1. FC Köln'),
    ('timo-hubers', 'Timo Hübers', 'CB', 73, 15, '#d9252a', '1. FC Köln'),
    ('joel-schmied', 'Joël Schmied', 'CB', 72, 13, '#d9252a', '1. FC Köln'),
    ('tom-krauss', 'Tom Krauß', 'CM', 72, 13, '#d9252a', '1. FC Köln'),

    -- Crystal Palace
    ('adam-wharton', 'Adam Wharton', 'CM', 81, 56, '#1b76d1', 'Crystal Palace'),
    ('dean-henderson', 'Dean Henderson', 'GK', 81, 56, '#1b76d1', 'Crystal Palace'),
    ('ismaila-sarr', 'Ismaïla Sarr', 'RW', 80, 48, '#1b76d1', 'Crystal Palace'),
    ('tyrick-mitchell', 'Tyrick Mitchell', 'LB', 79, 42, '#1b76d1', 'Crystal Palace'),
    ('yeremy-pino', 'Yéremy Pino', 'RW', 79, 42, '#1b76d1', 'Crystal Palace'),
    ('chris-richards', 'Chris Richards', 'CB', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('daichi-kamada', 'Daichi Kamada', 'CAM', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('jefferson-lerma', 'Jefferson Lerma', 'CDM', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('oscar-mingueza', 'Óscar Mingueza', 'RB', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('quinten-timber', 'Quinten Timber', 'CM', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('walter-benitez', 'Walter Benítez', 'GK', 78, 36, '#1b76d1', 'Crystal Palace'),
    ('evann-guessand', 'Evann Guessand', 'ST', 77, 30, '#1b76d1', 'Crystal Palace'),
    ('dwight-mcneil', 'Dwight McNeil', 'LW', 76, 26, '#1b76d1', 'Crystal Palace'),
    ('ben-chilwell', 'Ben Chilwell', 'LB', 74, 18, '#1b76d1', 'Crystal Palace'),
    ('eddie-nketiah', 'Eddie Nketiah', 'ST', 74, 18, '#1b76d1', 'Crystal Palace'),
    ('jaydee-canvot', 'Jaydee Canvot', 'CB', 72, 13, '#1b76d1', 'Crystal Palace'),

    -- Nice
    ('mohamed-amoura', 'Mohamed Amoura', 'ST', 79, 42, '#d9252a', 'Nice'),
    ('sofiane-diop', 'Sofiane Diop', 'LW', 78, 36, '#d9252a', 'Nice'),
    ('jonathan-clauss', 'Jonathan Clauss', 'RB', 77, 30, '#d9252a', 'Nice'),
    ('morgan-sanson', 'Morgan Sanson', 'CM', 76, 26, '#d9252a', 'Nice'),
    ('axel-witsel', 'Axel Witsel', 'CM', 75, 22, '#d9252a', 'Nice'),
    ('hicham-boudaoui', 'Hicham Boudaoui', 'CM', 75, 22, '#d9252a', 'Nice'),
    ('moise-bombito', 'Moïse Bombito', 'CB', 75, 22, '#d9252a', 'Nice'),
    ('melvin-bard', 'Melvin Bard', 'LB', 74, 18, '#d9252a', 'Nice'),
    ('yehvann-diouf', 'Yehvann Diouf', 'GK', 74, 18, '#d9252a', 'Nice'),
    ('youssouf-ndayishimiye', 'Youssouf Ndayishimiye', 'CB', 74, 18, '#d9252a', 'Nice'),
    ('elye-wahi', 'Elye Wahi', 'ST', 73, 15, '#d9252a', 'Nice'),
    ('gauthier-hein', 'Gauthier Hein', 'CAM', 73, 15, '#d9252a', 'Nice'),
    ('mohamed-ali-cho', 'Mohamed-Ali Cho', 'LW', 73, 15, '#d9252a', 'Nice'),
    ('tanguy-ndombele', 'Tanguy Ndombele', 'CM', 73, 15, '#d9252a', 'Nice'),
    ('nathan-ngoumou', 'Nathan Ngoumou', 'RW', 72, 13, '#d9252a', 'Nice'),
    ('tom-louchet', 'Tom Louchet', 'CM', 72, 13, '#d9252a', 'Nice'),

    -- Real Betis
    ('isco', 'Isco', 'CAM', 82, 66, '#35d06a', 'Real Betis'),
    ('giovani-lo-celso', 'Giovani Lo Celso', 'CAM', 80, 48, '#35d06a', 'Real Betis'),
    ('abde-ezzalzouli', 'Abde Ezzalzouli', 'LW', 79, 42, '#35d06a', 'Real Betis'),
    ('cucho-hernandez', 'Cucho Hernández', 'ST', 78, 36, '#35d06a', 'Real Betis'),
    ('dani-ceballos', 'Dani Ceballos', 'CM', 78, 36, '#35d06a', 'Real Betis'),
    ('pablo-fornals', 'Pablo Fornals', 'CM', 78, 36, '#35d06a', 'Real Betis'),
    ('marc-roca', 'Marc Roca', 'CDM', 77, 30, '#35d06a', 'Real Betis'),
    ('natan', 'Natan', 'CB', 77, 30, '#35d06a', 'Real Betis'),
    ('alvaro-valles', 'Álvaro Valles', 'GK', 75, 22, '#35d06a', 'Real Betis'),
    ('hector-bellerin', 'Héctor Bellerín', 'RB', 75, 22, '#35d06a', 'Real Betis'),
    ('rodrigo-riquelme', 'Rodrigo Riquelme', 'LW', 75, 22, '#35d06a', 'Real Betis'),
    ('aitor-ruibal', 'Aitor Ruibal', 'RB', 74, 18, '#35d06a', 'Real Betis'),
    ('junior-firpo', 'Junior Firpo', 'LB', 74, 18, '#35d06a', 'Real Betis'),
    ('marc-bartra', 'Marc Bartra', 'CB', 74, 18, '#35d06a', 'Real Betis'),
    ('nelson-deossa', 'Nelson Deossa', 'CM', 74, 18, '#35d06a', 'Real Betis'),
    ('valentin-gomez', 'Valentín Gómez', 'CB', 74, 18, '#35d06a', 'Real Betis'),

    -- Tottenham Hotspur
    ('micky-van-de-ven', 'Micky van de Ven', 'CB', 84, 94, '#ffffff', 'Tottenham Hotspur'),
    ('dejan-kulusevski', 'Dejan Kulusevski', 'RW', 82, 66, '#ffffff', 'Tottenham Hotspur'),
    ('james-maddison', 'James Maddison', 'CAM', 82, 66, '#ffffff', 'Tottenham Hotspur'),
    ('conor-gallagher', 'Conor Gallagher', 'CM', 81, 56, '#ffffff', 'Tottenham Hotspur'),
    ('destiny-udogie', 'Destiny Udogie', 'LB', 81, 56, '#ffffff', 'Tottenham Hotspur'),
    ('jan-paul-van-hecke', 'Jan Paul van Hecke', 'CB', 80, 48, '#ffffff', 'Tottenham Hotspur'),
    ('marcos-senesi', 'Marcos Senesi', 'CB', 80, 48, '#ffffff', 'Tottenham Hotspur'),
    ('rodrigo-bentancur', 'Rodrigo Bentancur', 'CM', 80, 48, '#ffffff', 'Tottenham Hotspur'),
    ('richarlison', 'Richarlison', 'ST', 79, 42, '#ffffff', 'Tottenham Hotspur'),
    ('lucas-bergvall', 'Lucas Bergvall', 'CM', 78, 36, '#ffffff', 'Tottenham Hotspur'),
    ('archie-gray', 'Archie Gray', 'CM', 76, 26, '#ffffff', 'Tottenham Hotspur'),
    ('martin-dubravka', 'Martin Dúbravka', 'GK', 76, 26, '#ffffff', 'Tottenham Hotspur'),
    ('mateus-fernandes', 'Mateus Fernandes', 'CM', 76, 26, '#ffffff', 'Tottenham Hotspur'),
    ('wilson-odobert', 'Wilson Odobert', 'LW', 76, 26, '#ffffff', 'Tottenham Hotspur'),
    ('ben-davies', 'Ben Davies', 'CB', 75, 22, '#ffffff', 'Tottenham Hotspur'),
    ('antonin-kinsky', 'Antonín Kinský', 'GK', 72, 13, '#ffffff', 'Tottenham Hotspur'),

    -- AFC Bournemouth
    ('evanilson', 'Evanilson', 'ST', 79, 42, '#d9252a', 'AFC Bournemouth'),
    ('justin-kluivert', 'Justin Kluivert', 'CAM', 79, 42, '#d9252a', 'AFC Bournemouth'),
    ('adrien-truffert', 'Adrien Truffert', 'LB', 78, 36, '#d9252a', 'AFC Bournemouth'),
    ('dorde-petrovic', 'Đorđe Petrović', 'GK', 78, 36, '#d9252a', 'AFC Bournemouth'),
    ('marcus-tavernier', 'Marcus Tavernier', 'CM', 78, 36, '#d9252a', 'AFC Bournemouth'),
    ('tyler-adams', 'Tyler Adams', 'CDM', 78, 36, '#d9252a', 'AFC Bournemouth'),
    ('amine-adli', 'Amine Adli', 'LW', 77, 30, '#d9252a', 'AFC Bournemouth'),
    ('lewis-cook', 'Lewis Cook', 'CM', 77, 30, '#d9252a', 'AFC Bournemouth'),
    ('ryan-christie', 'Ryan Christie', 'CM', 77, 30, '#d9252a', 'AFC Bournemouth'),
    ('bafode-diakite', 'Bafodé Diakité', 'CB', 76, 26, '#d9252a', 'AFC Bournemouth'),
    ('david-brooks', 'David Brooks', 'RW', 76, 26, '#d9252a', 'AFC Bournemouth'),
    ('eli-junior-kroupi', 'Eli Junior Kroupi', 'ST', 75, 22, '#d9252a', 'AFC Bournemouth'),
    ('julian-araujo', 'Julián Araujo', 'RB', 75, 22, '#d9252a', 'AFC Bournemouth'),
    ('ben-doak', 'Ben Doak', 'RW', 74, 18, '#d9252a', 'AFC Bournemouth'),
    ('juanlu-sanchez', 'Juanlu Sánchez', 'RB', 74, 18, '#d9252a', 'AFC Bournemouth'),

    -- Athletic Club
    ('unai-simon', 'Unai Simón', 'GK', 83, 78, '#ef3e42', 'Athletic Club'),
    ('dani-vivian', 'Dani Vivian', 'CB', 81, 56, '#ef3e42', 'Athletic Club'),
    ('oihan-sancet', 'Oihan Sancet', 'CAM', 81, 56, '#ef3e42', 'Athletic Club'),
    ('aymeric-laporte', 'Aymeric Laporte', 'CB', 80, 48, '#ef3e42', 'Athletic Club'),
    ('inaki-williams', 'Iñaki Williams', 'RW', 80, 48, '#ef3e42', 'Athletic Club'),
    ('aitor-paredes', 'Aitor Paredes', 'CB', 78, 36, '#ef3e42', 'Athletic Club'),
    ('alex-berenguer', 'Álex Berenguer', 'LW', 77, 30, '#ef3e42', 'Athletic Club'),
    ('gorka-guruzeta', 'Gorka Guruzeta', 'ST', 77, 30, '#ef3e42', 'Athletic Club'),
    ('inigo-ruiz-de-galarreta', 'Iñigo Ruiz de Galarreta', 'CM', 77, 30, '#ef3e42', 'Athletic Club'),
    ('yuri-berchiche', 'Yuri Berchiche', 'LB', 77, 30, '#ef3e42', 'Athletic Club'),
    ('mikel-jauregizar', 'Mikel Jauregizar', 'CM', 76, 26, '#ef3e42', 'Athletic Club'),
    ('benat-prados', 'Beñat Prados', 'CM', 75, 22, '#ef3e42', 'Athletic Club'),
    ('jesus-areso', 'Jesús Areso', 'RB', 75, 22, '#ef3e42', 'Athletic Club'),
    ('robert-navarro', 'Robert Navarro', 'LW', 75, 22, '#ef3e42', 'Athletic Club'),
    ('maroan-sannadi', 'Maroan Sannadi', 'ST', 73, 15, '#ef3e42', 'Athletic Club'),

    -- Benfica
    ('anatoliy-trubin', 'Anatoliy Trubin', 'GK', 81, 56, '#d9252a', 'Benfica'),
    ('vangelis-pavlidis', 'Vangelis Pavlidis', 'ST', 81, 56, '#d9252a', 'Benfica'),
    ('andreas-schjelderup', 'Andreas Schjelderup', 'LW', 80, 48, '#d9252a', 'Benfica'),
    ('dodi-lukebakio', 'Dodi Lukébakio', 'RW', 79, 42, '#d9252a', 'Benfica'),
    ('georgiy-sudakov', 'Georgiy Sudakov', 'CAM', 79, 42, '#d9252a', 'Benfica'),
    ('jhon-duran', 'Jhon Durán', 'ST', 78, 36, '#d9252a', 'Benfica'),
    ('rafa-silva', 'Rafa Silva', 'CAM', 78, 36, '#d9252a', 'Benfica'),
    ('richard-rios', 'Richard Ríos', 'CM', 78, 36, '#d9252a', 'Benfica'),
    ('tomas-araujo', 'Tomás Araújo', 'CB', 78, 36, '#d9252a', 'Benfica'),
    ('amar-dedic', 'Amar Dedić', 'RB', 77, 30, '#d9252a', 'Benfica'),
    ('enzo-barrenechea', 'Enzo Barrenechea', 'CM', 77, 30, '#d9252a', 'Benfica'),
    ('leandro-barreiro', 'Leandro Barreiro', 'CM', 77, 30, '#d9252a', 'Benfica'),
    ('samuel-dahl', 'Samuel Dahl', 'LB', 76, 26, '#d9252a', 'Benfica'),
    ('jakub-kaminski', 'Jakub Kamiński', 'LW', 74, 18, '#d9252a', 'Benfica'),
    ('alessandro-circati', 'Alessandro Circati', 'CB', 73, 15, '#d9252a', 'Benfica'),

    -- Celta Vigo
    ('iago-aspas', 'Iago Aspas', 'ST', 78, 36, '#7bb8ff', 'Celta Vigo'),
    ('borja-iglesias', 'Borja Iglesias', 'ST', 77, 30, '#7bb8ff', 'Celta Vigo'),
    ('ilaix-moriba', 'Ilaix Moriba', 'CM', 76, 26, '#7bb8ff', 'Celta Vigo'),
    ('javi-galan', 'Javi Galán', 'LB', 76, 26, '#7bb8ff', 'Celta Vigo'),
    ('carl-starfelt', 'Carl Starfelt', 'CB', 75, 22, '#7bb8ff', 'Celta Vigo'),
    ('ferran-jutgla', 'Ferran Jutglà', 'ST', 75, 22, '#7bb8ff', 'Celta Vigo'),
    ('marcos-alonso', 'Marcos Alonso', 'LB', 75, 22, '#7bb8ff', 'Celta Vigo'),
    ('aleix-febas', 'Aleix Febas', 'CM', 74, 18, '#7bb8ff', 'Celta Vigo'),
    ('altay-bayindir', 'Altay Bayındır', 'GK', 74, 18, '#7bb8ff', 'Celta Vigo'),
    ('ivan-villar', 'Iván Villar', 'GK', 74, 18, '#7bb8ff', 'Celta Vigo'),
    ('williot-swedberg', 'Williot Swedberg', 'LW', 74, 18, '#7bb8ff', 'Celta Vigo'),
    ('hugo-alvarez', 'Hugo Álvarez', 'LW', 73, 15, '#7bb8ff', 'Celta Vigo'),
    ('javi-rodriguez', 'Javi Rodríguez', 'CB', 73, 15, '#7bb8ff', 'Celta Vigo'),
    ('pablo-duran', 'Pablo Durán', 'ST', 73, 15, '#7bb8ff', 'Celta Vigo'),
    ('stefan-bajcetic', 'Stefan Bajčetić', 'CM', 72, 13, '#7bb8ff', 'Celta Vigo'),

    -- Eintracht Frankfurt
    ('robin-koch', 'Robin Koch', 'CB', 80, 48, '#111111', 'Eintracht Frankfurt'),
    ('jonathan-burkardt', 'Jonathan Burkardt', 'ST', 79, 42, '#111111', 'Eintracht Frankfurt'),
    ('noah-atubolu', 'Noah Atubolu', 'GK', 79, 42, '#111111', 'Eintracht Frankfurt'),
    ('ritsu-doan', 'Ritsu Doan', 'RW', 79, 42, '#111111', 'Eintracht Frankfurt'),
    ('can-uzun', 'Can Uzun', 'CAM', 78, 36, '#111111', 'Eintracht Frankfurt'),
    ('raphael-onyedika', 'Raphael Onyedika', 'CDM', 78, 36, '#111111', 'Eintracht Frankfurt'),
    ('rasmus-kristensen', 'Rasmus Kristensen', 'RB', 78, 36, '#111111', 'Eintracht Frankfurt'),
    ('fares-chaibi', 'Farès Chaïbi', 'CAM', 77, 30, '#111111', 'Eintracht Frankfurt'),
    ('mario-gotze', 'Mario Götze', 'CAM', 77, 30, '#111111', 'Eintracht Frankfurt'),
    ('ansgar-knauff', 'Ansgar Knauff', 'RW', 75, 22, '#111111', 'Eintracht Frankfurt'),
    ('michael-zetterer', 'Michael Zetterer', 'GK', 75, 22, '#111111', 'Eintracht Frankfurt'),
    ('lilian-brassier', 'Lilian Brassier', 'CB', 74, 18, '#111111', 'Eintracht Frankfurt'),
    ('nnamdi-collins', 'Nnamdi Collins', 'CB', 73, 15, '#111111', 'Eintracht Frankfurt'),
    ('jean-matteo-bahoya', 'Jean-Mattéo Bahoya', 'LW', 72, 13, '#111111', 'Eintracht Frankfurt'),
    ('oscar-hojlund', 'Oscar Højlund', 'CM', 72, 13, '#111111', 'Eintracht Frankfurt'),

    -- Fulham
    ('antonee-robinson', 'Antonee Robinson', 'LB', 81, 56, '#ffffff', 'Fulham'),
    ('bernd-leno', 'Bernd Leno', 'GK', 80, 48, '#ffffff', 'Fulham'),
    ('alex-iwobi', 'Alex Iwobi', 'RW', 79, 42, '#ffffff', 'Fulham'),
    ('hugo-larsson', 'Hugo Larsson', 'CM', 79, 42, '#ffffff', 'Fulham'),
    ('joachim-andersen', 'Joachim Andersen', 'CB', 79, 42, '#ffffff', 'Fulham'),
    ('calvin-bassey', 'Calvin Bassey', 'CB', 78, 36, '#ffffff', 'Fulham'),
    ('emile-smith-rowe', 'Emile Smith Rowe', 'CAM', 78, 36, '#ffffff', 'Fulham'),
    ('rodrigo-muniz', 'Rodrigo Muniz', 'ST', 77, 30, '#ffffff', 'Fulham'),
    ('kenny-tete', 'Kenny Tete', 'RB', 76, 26, '#ffffff', 'Fulham'),
    ('timothy-castagne', 'Timothy Castagne', 'RB', 76, 26, '#ffffff', 'Fulham'),
    ('kevin', 'Kevin', 'LW', 75, 22, '#ffffff', 'Fulham'),
    ('jorge-cuenca', 'Jorge Cuenca', 'CB', 74, 18, '#ffffff', 'Fulham'),
    ('ryan-sessegnon', 'Ryan Sessegnon', 'LB', 74, 18, '#ffffff', 'Fulham'),
    ('tom-cairney', 'Tom Cairney', 'CM', 74, 18, '#ffffff', 'Fulham'),
    ('harrison-reed', 'Harrison Reed', 'CM', 73, 15, '#ffffff', 'Fulham'),

    -- Mainz 05
    ('andreas-hanche-olsen', 'Andreas Hanche-Olsen', 'CB', 78, 36, '#d9252a', 'Mainz 05'),
    ('nadiem-amiri', 'Nadiem Amiri', 'CM', 78, 36, '#d9252a', 'Mainz 05'),
    ('kaishu-sano', 'Kaishu Sano', 'CDM', 77, 30, '#d9252a', 'Mainz 05'),
    ('lee-jae-sung', 'Lee Jae-sung', 'CAM', 77, 30, '#d9252a', 'Mainz 05'),
    ('robin-zentner', 'Robin Zentner', 'GK', 75, 22, '#d9252a', 'Mainz 05'),
    ('benedict-hollerbach', 'Benedict Hollerbach', 'LW', 74, 18, '#d9252a', 'Mainz 05'),
    ('dominik-kohr', 'Dominik Kohr', 'CDM', 73, 15, '#d9252a', 'Mainz 05'),
    ('paul-nebel', 'Paul Nebel', 'CAM', 73, 15, '#d9252a', 'Mainz 05'),
    ('phillip-tietz', 'Phillip Tietz', 'ST', 73, 15, '#d9252a', 'Mainz 05'),
    ('silvan-widmer', 'Silvan Widmer', 'RB', 73, 15, '#d9252a', 'Mainz 05'),
    ('armindo-sieb', 'Armindo Sieb', 'ST', 72, 13, '#d9252a', 'Mainz 05'),
    ('danny-da-costa', 'Danny da Costa', 'RB', 72, 13, '#d9252a', 'Mainz 05'),
    ('nelson-weiper', 'Nelson Weiper', 'ST', 72, 13, '#d9252a', 'Mainz 05'),
    ('phillipp-mwene', 'Phillipp Mwene', 'LB', 72, 13, '#d9252a', 'Mainz 05'),
    ('stefan-bell', 'Stefan Bell', 'CB', 72, 13, '#d9252a', 'Mainz 05'),

    -- AC Milan
    ('luka-modric', 'Luka Modrić', 'CM', 84, 94, '#d9252a', 'AC Milan'),
    ('adrien-rabiot', 'Adrien Rabiot', 'CM', 82, 66, '#d9252a', 'AC Milan'),
    ('alexis-saelemaekers', 'Alexis Saelemaekers', 'RW', 79, 42, '#d9252a', 'AC Milan'),
    ('mario-gila', 'Mario Gila', 'CB', 79, 42, '#d9252a', 'AC Milan'),
    ('pervis-estupinan', 'Pervis Estupiñán', 'LB', 79, 42, '#d9252a', 'AC Milan'),
    ('ardon-jashari', 'Ardon Jashari', 'CM', 78, 36, '#d9252a', 'AC Milan'),
    ('matteo-gabbia', 'Matteo Gabbia', 'CB', 78, 36, '#d9252a', 'AC Milan'),
    ('ruben-loftus-cheek', 'Ruben Loftus-Cheek', 'CM', 78, 36, '#d9252a', 'AC Milan'),
    ('koni-de-winter', 'Koni De Winter', 'CB', 77, 30, '#d9252a', 'AC Milan'),
    ('omari-hutchinson', 'Omari Hutchinson', 'RW', 77, 30, '#d9252a', 'AC Milan'),
    ('yunus-musah', 'Yunus Musah', 'CM', 77, 30, '#d9252a', 'AC Milan'),
    ('samuel-chukwueze', 'Samuel Chukwueze', 'RW', 76, 26, '#d9252a', 'AC Milan'),
    ('diego-moreira', 'Diego Moreira', 'LW', 75, 22, '#d9252a', 'AC Milan'),
    ('davide-bartesaghi', 'Davide Bartesaghi', 'LB', 73, 15, '#d9252a', 'AC Milan'),

    -- Fiorentina
    ('david-de-gea', 'David de Gea', 'GK', 83, 78, '#7a5cff', 'Fiorentina'),
    ('pedro-goncalves', 'Pedro Gonçalves', 'CAM', 81, 56, '#7a5cff', 'Fiorentina'),
    ('franco-mastantuono', 'Franco Mastantuono', 'RW', 78, 36, '#7a5cff', 'Fiorentina'),
    ('nicolo-fagioli', 'Nicolò Fagioli', 'CM', 78, 36, '#7a5cff', 'Fiorentina'),
    ('luca-ranieri', 'Luca Ranieri', 'CB', 77, 30, '#7a5cff', 'Fiorentina'),
    ('radu-dragusin', 'Radu Drăgușin', 'CB', 77, 30, '#7a5cff', 'Fiorentina'),
    ('alex-jimenez', 'Álex Jiménez', 'RB', 76, 26, '#7a5cff', 'Fiorentina'),
    ('marin-pongracic', 'Marin Pongračić', 'CB', 76, 26, '#7a5cff', 'Fiorentina'),
    ('arthur-atta', 'Arthur Atta', 'CM', 74, 18, '#7a5cff', 'Fiorentina'),
    ('beto', 'Beto', 'ST', 74, 18, '#7a5cff', 'Fiorentina'),
    ('cher-ndour', 'Cher Ndour', 'CM', 74, 18, '#7a5cff', 'Fiorentina'),
    ('fabiano-parisi', 'Fabiano Parisi', 'LB', 74, 18, '#7a5cff', 'Fiorentina'),
    ('mateo-pellegrino', 'Mateo Pellegrino', 'ST', 74, 18, '#7a5cff', 'Fiorentina'),
    ('wilfried-gnonto', 'Wilfried Gnonto', 'LW', 74, 18, '#7a5cff', 'Fiorentina'),

    -- Hoffenheim
    ('oliver-baumann', 'Oliver Baumann', 'GK', 80, 48, '#1b76d1', 'Hoffenheim'),
    ('andrej-kramaric', 'Andrej Kramarić', 'ST', 79, 42, '#1b76d1', 'Hoffenheim'),
    ('patrick-wimmer', 'Patrick Wimmer', 'RW', 77, 30, '#1b76d1', 'Hoffenheim'),
    ('fisnik-asllani', 'Fisnik Asllani', 'ST', 76, 26, '#1b76d1', 'Hoffenheim'),
    ('ozan-kabak', 'Ozan Kabak', 'CB', 76, 26, '#1b76d1', 'Hoffenheim'),
    ('wouter-burger', 'Wouter Burger', 'CM', 76, 26, '#1b76d1', 'Hoffenheim'),
    ('adam-hlozek', 'Adam Hložek', 'ST', 75, 22, '#1b76d1', 'Hoffenheim'),
    ('robin-hranac', 'Robin Hranáč', 'CB', 74, 18, '#1b76d1', 'Hoffenheim'),
    ('vladimir-coufal', 'Vladimír Coufal', 'RB', 74, 18, '#1b76d1', 'Hoffenheim'),
    ('alexander-prass', 'Alexander Prass', 'LB', 73, 15, '#1b76d1', 'Hoffenheim'),
    ('ihlas-bebou', 'Ihlas Bebou', 'ST', 73, 15, '#1b76d1', 'Hoffenheim'),
    ('tim-lemperle', 'Tim Lemperle', 'ST', 73, 15, '#1b76d1', 'Hoffenheim'),
    ('albian-hajdari', 'Albian Hajdari', 'CB', 72, 13, '#1b76d1', 'Hoffenheim'),
    ('leon-avdullahu', 'Leon Avdullahu', 'CM', 72, 13, '#1b76d1', 'Hoffenheim'),

    -- Lyon
    ('corentin-tolisso', 'Corentin Tolisso', 'CM', 78, 36, '#1355a0', 'Lyon'),
    ('dominik-greif', 'Dominik Greif', 'GK', 78, 36, '#1355a0', 'Lyon'),
    ('malick-fofana', 'Malick Fofana', 'LW', 78, 36, '#1355a0', 'Lyon'),
    ('moussa-niakhate', 'Moussa Niakhaté', 'CB', 78, 36, '#1355a0', 'Lyon'),
    ('nicolas-tagliafico', 'Nicolás Tagliafico', 'LB', 78, 36, '#1355a0', 'Lyon'),
    ('clinton-mata', 'Clinton Mata', 'CB', 76, 26, '#1355a0', 'Lyon'),
    ('pavel-sulc', 'Pavel Šulc', 'CAM', 76, 26, '#1355a0', 'Lyon'),
    ('tanner-tessmann', 'Tanner Tessmann', 'CM', 76, 26, '#1355a0', 'Lyon'),
    ('ainsley-maitland-niles', 'Ainsley Maitland-Niles', 'RB', 74, 18, '#1355a0', 'Lyon'),
    ('ernest-nuamah', 'Ernest Nuamah', 'RW', 74, 18, '#1355a0', 'Lyon'),
    ('adam-karabec', 'Adam Karabec', 'CAM', 72, 13, '#1355a0', 'Lyon'),
    ('remy-descamps', 'Rémy Descamps', 'GK', 72, 13, '#1355a0', 'Lyon'),
    ('ruben-kluivert', 'Ruben Kluivert', 'CB', 72, 13, '#1355a0', 'Lyon'),
    ('zachary-athekame', 'Zachary Athekame', 'RB', 72, 13, '#1355a0', 'Lyon'),

    -- Valencia
    ('guido-rodriguez', 'Guido Rodríguez', 'CDM', 77, 30, '#ff8f00', 'Valencia'),
    ('jose-gaya', 'José Gayà', 'LB', 77, 30, '#ff8f00', 'Valencia'),
    ('pepelu', 'Pepelu', 'CDM', 77, 30, '#ff8f00', 'Valencia'),
    ('stole-dimitrievski', 'Stole Dimitrievski', 'GK', 77, 30, '#ff8f00', 'Valencia'),
    ('arnau-martinez', 'Arnau Martínez', 'RB', 76, 26, '#ff8f00', 'Valencia'),
    ('cesar-tarrega', 'César Tárrega', 'CB', 76, 26, '#ff8f00', 'Valencia'),
    ('hugo-duro', 'Hugo Duro', 'ST', 76, 26, '#ff8f00', 'Valencia'),
    ('luis-rioja', 'Luis Rioja', 'LW', 76, 26, '#ff8f00', 'Valencia'),
    ('pablo-maffeo', 'Pablo Maffeo', 'RB', 76, 26, '#ff8f00', 'Valencia'),
    ('arnaut-danjuma', 'Arnaut Danjuma', 'LW', 75, 22, '#ff8f00', 'Valencia'),
    ('mouctar-diakhaby', 'Mouctar Diakhaby', 'CB', 75, 22, '#ff8f00', 'Valencia'),
    ('filip-ugrinic', 'Filip Ugrinić', 'CM', 74, 18, '#ff8f00', 'Valencia'),
    ('dani-raba', 'Dani Raba', 'CAM', 73, 15, '#ff8f00', 'Valencia'),
    ('dimitri-foulquier', 'Dimitri Foulquier', 'RB', 73, 15, '#ff8f00', 'Valencia'),

    -- West Ham United
    ('jarrod-bowen', 'Jarrod Bowen', 'RW', 82, 66, '#7a1f2b', 'West Ham United'),
    ('edson-alvarez', 'Edson Álvarez', 'CDM', 79, 42, '#7a1f2b', 'West Ham United'),
    ('alphonse-areola', 'Alphonse Areola', 'GK', 78, 36, '#7a1f2b', 'West Ham United'),
    ('max-kilman', 'Max Kilman', 'CB', 78, 36, '#7a1f2b', 'West Ham United'),
    ('tomas-soucek', 'Tomáš Souček', 'CM', 78, 36, '#7a1f2b', 'West Ham United'),
    ('el-hadji-malick-diouf', 'El Hadji Malick Diouf', 'LB', 77, 30, '#7a1f2b', 'West Ham United'),
    ('james-ward-prowse', 'James Ward-Prowse', 'CM', 77, 30, '#7a1f2b', 'West Ham United'),
    ('konstantinos-mavropanos', 'Konstantinos Mavropanos', 'CB', 77, 30, '#7a1f2b', 'West Ham United'),
    ('kyle-walker-peters', 'Kyle Walker-Peters', 'RB', 76, 26, '#7a1f2b', 'West Ham United'),
    ('mads-hermansen', 'Mads Hermansen', 'GK', 76, 26, '#7a1f2b', 'West Ham United'),
    ('morato', 'Morato', 'CB', 76, 26, '#7a1f2b', 'West Ham United'),
    ('joel-piroe', 'Joël Piroe', 'ST', 74, 18, '#7a1f2b', 'West Ham United'),
    ('joel-veltman', 'Joël Veltman', 'RB', 74, 18, '#7a1f2b', 'West Ham United'),
    ('soungoutou-magassa', 'Soungoutou Magassa', 'CDM', 72, 13, '#7a1f2b', 'West Ham United'),

    -- Bologna
    ('riccardo-orsolini', 'Riccardo Orsolini', 'RW', 81, 56, '#7a1f2b', 'Bologna'),
    ('arthur-theate', 'Arthur Theate', 'CB', 79, 42, '#7a1f2b', 'Bologna'),
    ('lewis-ferguson', 'Lewis Ferguson', 'CM', 79, 42, '#7a1f2b', 'Bologna'),
    ('lukasz-skorupski', 'Łukasz Skorupski', 'GK', 79, 42, '#7a1f2b', 'Bologna'),
    ('torbjorn-heggem', 'Torbjørn Heggem', 'CB', 78, 36, '#7a1f2b', 'Bologna'),
    ('jonathan-rowe', 'Jonathan Rowe', 'LW', 77, 30, '#7a1f2b', 'Bologna'),
    ('juan-miranda', 'Juan Miranda', 'LB', 77, 30, '#7a1f2b', 'Bologna'),
    ('jens-odgaard', 'Jens Odgaard', 'CAM', 76, 26, '#7a1f2b', 'Bologna'),
    ('roberto-piccoli', 'Roberto Piccoli', 'ST', 76, 26, '#7a1f2b', 'Bologna'),
    ('nikola-moro', 'Nikola Moro', 'CM', 75, 22, '#7a1f2b', 'Bologna'),
    ('tommaso-pobega', 'Tommaso Pobega', 'CM', 75, 22, '#7a1f2b', 'Bologna'),
    ('nicolo-cambiaghi', 'Nicolò Cambiaghi', 'LW', 74, 18, '#7a1f2b', 'Bologna'),
    ('nicolo-casale', 'Nicolò Casale', 'CB', 74, 18, '#7a1f2b', 'Bologna'),

    -- Everton
    ('jordan-pickford', 'Jordan Pickford', 'GK', 82, 66, '#1355a0', 'Everton'),
    ('brennan-johnson', 'Brennan Johnson', 'RW', 80, 48, '#1355a0', 'Everton'),
    ('jack-grealish', 'Jack Grealish', 'LW', 80, 48, '#1355a0', 'Everton'),
    ('jarrad-branthwaite', 'Jarrad Branthwaite', 'CB', 80, 48, '#1355a0', 'Everton'),
    ('james-garner', 'James Garner', 'CM', 78, 36, '#1355a0', 'Everton'),
    ('james-tarkowski', 'James Tarkowski', 'CB', 78, 36, '#1355a0', 'Everton'),
    ('kiernan-dewsbury-hall', 'Kiernan Dewsbury-Hall', 'CM', 78, 36, '#1355a0', 'Everton'),
    ('vitaliy-mykolenko', 'Vitaliy Mykolenko', 'LB', 77, 30, '#1355a0', 'Everton'),
    ('jake-o-brien', 'Jake O''Brien', 'CB', 76, 26, '#1355a0', 'Everton'),
    ('thierno-barry', 'Thierno Barry', 'ST', 76, 26, '#1355a0', 'Everton'),
    ('michael-keane', 'Michael Keane', 'CB', 75, 22, '#1355a0', 'Everton'),
    ('merlin-rohl', 'Merlin Röhl', 'CM', 72, 13, '#1355a0', 'Everton'),
    ('tyler-dibling', 'Tyler Dibling', 'RW', 72, 13, '#1355a0', 'Everton'),

    -- Rennes
    ('brice-samba', 'Brice Samba', 'GK', 80, 48, '#d9252a', 'Rennes'),
    ('sebastian-szymanski', 'Sebastian Szymański', 'CAM', 78, 36, '#d9252a', 'Rennes'),
    ('boulaye-dia', 'Boulaye Dia', 'ST', 77, 30, '#d9252a', 'Rennes'),
    ('breel-embolo', 'Breel Embolo', 'ST', 77, 30, '#d9252a', 'Rennes'),
    ('ludovic-blas', 'Ludovic Blas', 'CAM', 77, 30, '#d9252a', 'Rennes'),
    ('valentin-rongier', 'Valentin Rongier', 'CM', 77, 30, '#d9252a', 'Rennes'),
    ('adrien-thomasson', 'Adrien Thomasson', 'CM', 76, 26, '#d9252a', 'Rennes'),
    ('esteban-lepaul', 'Esteban Lepaul', 'ST', 76, 26, '#d9252a', 'Rennes'),
    ('quentin-merlin', 'Quentin Merlin', 'LB', 76, 26, '#d9252a', 'Rennes'),
    ('charlie-cresswell', 'Charlie Cresswell', 'CB', 73, 15, '#d9252a', 'Rennes'),
    ('mahdi-camara', 'Mahdi Camara', 'CM', 73, 15, '#d9252a', 'Rennes'),
    ('eliezer-mayenda', 'Eliezer Mayenda', 'ST', 72, 13, '#d9252a', 'Rennes'),
    ('mahamadou-nagida', 'Mahamadou Nagida', 'LB', 72, 13, '#d9252a', 'Rennes'),

    -- Union Berlin
    ('frederik-ronnow', 'Frederik Rønnow', 'GK', 77, 30, '#d9252a', 'Union Berlin'),
    ('rani-khedira', 'Rani Khedira', 'CDM', 75, 22, '#d9252a', 'Union Berlin'),
    ('andrej-ilic', 'Andrej Ilić', 'ST', 74, 18, '#d9252a', 'Union Berlin'),
    ('leopold-querfeld', 'Leopold Querfeld', 'CB', 74, 18, '#d9252a', 'Union Berlin'),
    ('tom-rothe', 'Tom Rothe', 'LB', 74, 18, '#d9252a', 'Union Berlin'),
    ('aljoscha-kemlein', 'Aljoscha Kemlein', 'CM', 72, 13, '#d9252a', 'Union Berlin'),
    ('christopher-trimmel', 'Christopher Trimmel', 'RB', 72, 13, '#d9252a', 'Union Berlin'),
    ('derrick-kohn', 'Derrick Köhn', 'LB', 72, 13, '#d9252a', 'Union Berlin'),
    ('janik-haberer', 'Janik Haberer', 'CM', 72, 13, '#d9252a', 'Union Berlin'),
    ('marin-ljubicic', 'Marin Ljubičić', 'ST', 72, 13, '#d9252a', 'Union Berlin'),
    ('oliver-burke', 'Oliver Burke', 'RW', 72, 13, '#d9252a', 'Union Berlin'),
    ('tim-skarke', 'Tim Skarke', 'LW', 72, 13, '#d9252a', 'Union Berlin'),
    ('woo-yeong-jeong', 'Woo-yeong Jeong', 'LW', 72, 13, '#d9252a', 'Union Berlin'),

    -- Werder Bremen
    ('mitchell-weiser', 'Mitchell Weiser', 'RB', 78, 36, '#35d06a', 'Werder Bremen'),
    ('jens-stage', 'Jens Stage', 'CM', 77, 30, '#35d06a', 'Werder Bremen'),
    ('niclas-fullkrug', 'Niclas Füllkrug', 'ST', 77, 30, '#35d06a', 'Werder Bremen'),
    ('marco-friedl', 'Marco Friedl', 'CB', 75, 22, '#35d06a', 'Werder Bremen'),
    ('senne-lynen', 'Senne Lynen', 'CDM', 75, 22, '#35d06a', 'Werder Bremen'),
    ('niklas-stark', 'Niklas Stark', 'CB', 74, 18, '#35d06a', 'Werder Bremen'),
    ('amos-pieper', 'Amos Pieper', 'CB', 73, 15, '#35d06a', 'Werder Bremen'),
    ('justin-njinmah', 'Justin Njinmah', 'LW', 73, 15, '#35d06a', 'Werder Bremen'),
    ('leonardo-bittencourt', 'Leonardo Bittencourt', 'CAM', 73, 15, '#35d06a', 'Werder Bremen'),
    ('marco-grull', 'Marco Grüll', 'LW', 73, 15, '#35d06a', 'Werder Bremen'),
    ('julian-malatini', 'Julian Malatini', 'CB', 72, 13, '#35d06a', 'Werder Bremen'),
    ('olivier-deman', 'Olivier Deman', 'LB', 72, 13, '#35d06a', 'Werder Bremen'),
    ('samuel-mbangula', 'Samuel Mbangula', 'LW', 72, 13, '#35d06a', 'Werder Bremen'),

    -- Ajax
    ('viktor-tsygankov', 'Viktor Tsygankov', 'RW', 79, 42, '#d9252a', 'Ajax'),
    ('caio-henrique', 'Caio Henrique', 'LB', 78, 36, '#d9252a', 'Ajax'),
    ('sofyan-amrabat', 'Sofyan Amrabat', 'CDM', 78, 36, '#d9252a', 'Ajax'),
    ('thilo-kehrer', 'Thilo Kehrer', 'CB', 78, 36, '#d9252a', 'Ajax'),
    ('josip-sutalo', 'Josip Šutalo', 'CB', 77, 30, '#d9252a', 'Ajax'),
    ('marcos-leonardo', 'Marcos Leonardo', 'ST', 77, 30, '#d9252a', 'Ajax'),
    ('ko-itakura', 'Ko Itakura', 'CB', 76, 26, '#d9252a', 'Ajax'),
    ('oscar-gloukh', 'Oscar Gloukh', 'CAM', 76, 26, '#d9252a', 'Ajax'),
    ('steven-berghuis', 'Steven Berghuis', 'RW', 76, 26, '#d9252a', 'Ajax'),
    ('mika-godts', 'Mika Godts', 'LW', 75, 22, '#d9252a', 'Ajax'),
    ('tolu-arokodare', 'Tolu Arokodare', 'ST', 75, 22, '#d9252a', 'Ajax'),
    ('daley-blind', 'Daley Blind', 'CB', 74, 18, '#d9252a', 'Ajax'),

    -- Chelsea
    ('morgan-rogers', 'Morgan Rogers', 'CAM', 83, 78, '#1355a0', 'Chelsea'),
    ('joao-pedro', 'João Pedro', 'ST', 82, 66, '#1355a0', 'Chelsea'),
    ('jamie-gittens', 'Jamie Gittens', 'LW', 80, 48, '#1355a0', 'Chelsea'),
    ('maxence-lacroix', 'Maxence Lacroix', 'CB', 80, 48, '#1355a0', 'Chelsea'),
    ('jordan-henderson', 'Jordan Henderson', 'CM', 78, 36, '#1355a0', 'Chelsea'),
    ('jorrel-hato', 'Jorrel Hato', 'LB', 78, 36, '#1355a0', 'Chelsea'),
    ('tosin-adarabioyo', 'Tosin Adarabioyo', 'CB', 78, 36, '#1355a0', 'Chelsea'),
    ('danny-welbeck', 'Danny Welbeck', 'ST', 77, 30, '#1355a0', 'Chelsea'),
    ('geovany-quenda', 'Geovany Quenda', 'RW', 76, 26, '#1355a0', 'Chelsea'),
    ('valentin-barco', 'Valentín Barco', 'LB', 76, 26, '#1355a0', 'Chelsea'),
    ('pep-chavarria', 'Pep Chavarría', 'LB', 75, 22, '#1355a0', 'Chelsea'),
    ('aaron-anselmino', 'Aarón Anselmino', 'CB', 72, 13, '#1355a0', 'Chelsea'),

    -- Espanyol
    ('javi-puado', 'Javi Puado', 'ST', 76, 26, '#1b76d1', 'Espanyol'),
    ('marko-dmitrovic', 'Marko Dmitrović', 'GK', 76, 26, '#1b76d1', 'Espanyol'),
    ('andoni-gorosabel', 'Andoni Gorosabel', 'RB', 75, 22, '#1b76d1', 'Espanyol'),
    ('bryan-zaragoza', 'Bryan Zaragoza', 'LW', 75, 22, '#1b76d1', 'Espanyol'),
    ('edu-exposito', 'Edu Expósito', 'CM', 75, 22, '#1b76d1', 'Espanyol'),
    ('leandro-cabrera', 'Leandro Cabrera', 'CB', 74, 18, '#1b76d1', 'Espanyol'),
    ('omar-el-hilali', 'Omar El Hilali', 'RB', 74, 18, '#1b76d1', 'Espanyol'),
    ('quilindschy-hartman', 'Quilindschy Hartman', 'LB', 74, 18, '#1b76d1', 'Espanyol'),
    ('urko-gonzalez', 'Urko González', 'CDM', 74, 18, '#1b76d1', 'Espanyol'),
    ('pol-lozano', 'Pol Lozano', 'CM', 73, 15, '#1b76d1', 'Espanyol'),
    ('pere-milla', 'Pere Milla', 'LW', 72, 13, '#1b76d1', 'Espanyol'),
    ('tyrhys-dolan', 'Tyrhys Dolan', 'LW', 72, 13, '#1b76d1', 'Espanyol'),

    -- FC Porto
    ('alan-varela', 'Alan Varela', 'CDM', 79, 42, '#1355a0', 'FC Porto'),
    ('gabri-veiga', 'Gabri Veiga', 'CM', 78, 36, '#1355a0', 'FC Porto'),
    ('borja-sainz', 'Borja Sainz', 'LW', 77, 30, '#1355a0', 'FC Porto'),
    ('nehuen-perez', 'Nehuén Pérez', 'CB', 77, 30, '#1355a0', 'FC Porto'),
    ('pepe', 'Pepê', 'RW', 77, 30, '#1355a0', 'FC Porto'),
    ('rodrigo-mora', 'Rodrigo Mora', 'CAM', 77, 30, '#1355a0', 'FC Porto'),
    ('seko-fofana', 'Seko Fofana', 'CM', 77, 30, '#1355a0', 'FC Porto'),
    ('alberto-costa', 'Alberto Costa', 'RB', 76, 26, '#1355a0', 'FC Porto'),
    ('andre-silva', 'André Silva', 'ST', 76, 26, '#1355a0', 'FC Porto'),
    ('francisco-moura', 'Francisco Moura', 'LB', 76, 26, '#1355a0', 'FC Porto'),
    ('jan-bednarek', 'Jan Bednarek', 'CB', 76, 26, '#1355a0', 'FC Porto'),
    ('victor-froholdt', 'Victor Froholdt', 'CM', 76, 26, '#1355a0', 'FC Porto'),

    -- Lille
    ('benjamin-andre', 'Benjamin André', 'CDM', 78, 36, '#d9252a', 'Lille'),
    ('hakon-arnar-haraldsson', 'Hákon Arnar Haraldsson', 'CAM', 78, 36, '#d9252a', 'Lille'),
    ('berke-ozer', 'Berke Özer', 'GK', 77, 30, '#d9252a', 'Lille'),
    ('osame-sahraoui', 'Osame Sahraoui', 'RW', 77, 30, '#d9252a', 'Lille'),
    ('alexsandro-ribeiro', 'Alexsandro Ribeiro', 'CB', 76, 26, '#d9252a', 'Lille'),
    ('ayase-ueda', 'Ayase Ueda', 'ST', 76, 26, '#d9252a', 'Lille'),
    ('olivier-giroud', 'Olivier Giroud', 'ST', 76, 26, '#d9252a', 'Lille'),
    ('romain-perraud', 'Romain Perraud', 'LB', 76, 26, '#d9252a', 'Lille'),
    ('hamza-igamane', 'Hamza Igamane', 'ST', 75, 22, '#d9252a', 'Lille'),
    ('tiago-santos', 'Tiago Santos', 'RB', 75, 22, '#d9252a', 'Lille'),
    ('nabil-bentaleb', 'Nabil Bentaleb', 'CM', 73, 15, '#d9252a', 'Lille'),
    ('ngal-ayel-mukau', 'Ngal''ayel Mukau', 'CM', 73, 15, '#d9252a', 'Lille'),

    -- Rayo Vallecano
    ('isi-palazon', 'Isi Palazón', 'RW', 78, 36, '#d9252a', 'Rayo Vallecano'),
    ('alvaro-garcia', 'Álvaro García', 'LW', 77, 30, '#d9252a', 'Rayo Vallecano'),
    ('augusto-batalla', 'Augusto Batalla', 'GK', 77, 30, '#d9252a', 'Rayo Vallecano'),
    ('jorge-de-frutos', 'Jorge de Frutos', 'RW', 77, 30, '#d9252a', 'Rayo Vallecano'),
    ('andrei-ratiu', 'Andrei Rațiu', 'RB', 76, 26, '#d9252a', 'Rayo Vallecano'),
    ('florian-lejeune', 'Florian Lejeune', 'CB', 76, 26, '#d9252a', 'Rayo Vallecano'),
    ('oscar-valentin', 'Óscar Valentín', 'CDM', 75, 22, '#d9252a', 'Rayo Vallecano'),
    ('pathe-ciss', 'Pathé Ciss', 'CDM', 75, 22, '#d9252a', 'Rayo Vallecano'),
    ('unai-lopez', 'Unai López', 'CM', 75, 22, '#d9252a', 'Rayo Vallecano'),
    ('emil-audero', 'Emil Audero', 'GK', 74, 18, '#d9252a', 'Rayo Vallecano'),
    ('sergio-camello', 'Sergio Camello', 'ST', 74, 18, '#d9252a', 'Rayo Vallecano'),
    ('randy-nteka', 'Randy Nteka', 'ST', 72, 13, '#d9252a', 'Rayo Vallecano'),

    -- Sassuolo
    ('kristian-thorstvedt', 'Kristian Thorstvedt', 'CM', 79, 42, '#35d06a', 'Sassuolo'),
    ('domenico-berardi', 'Domenico Berardi', 'RW', 78, 36, '#35d06a', 'Sassuolo'),
    ('armand-lauriente', 'Armand Laurienté', 'LW', 77, 30, '#35d06a', 'Sassuolo'),
    ('arijanet-muric', 'Arijanet Murić', 'GK', 75, 22, '#35d06a', 'Sassuolo'),
    ('duje-caleta-car', 'Duje Ćaleta-Car', 'CB', 75, 22, '#35d06a', 'Sassuolo'),
    ('jay-idzes', 'Jay Idzes', 'CB', 74, 18, '#35d06a', 'Sassuolo'),
    ('nemanja-matic', 'Nemanja Matić', 'CDM', 74, 18, '#35d06a', 'Sassuolo'),
    ('aster-vranckx', 'Aster Vranckx', 'CM', 73, 15, '#35d06a', 'Sassuolo'),
    ('benjamin-dominguez', 'Benjamin Domínguez', 'LW', 73, 15, '#35d06a', 'Sassuolo'),
    ('josh-doig', 'Josh Doig', 'LB', 73, 15, '#35d06a', 'Sassuolo'),
    ('sebastiano-esposito', 'Sebastiano Esposito', 'ST', 73, 15, '#35d06a', 'Sassuolo'),
    ('cristian-volpato', 'Cristian Volpato', 'CAM', 72, 13, '#35d06a', 'Sassuolo'),

    -- Wolverhampton Wanderers
    ('kieran-trippier', 'Kieran Trippier', 'RB', 80, 48, '#ff8f00', 'Wolverhampton Wanderers'),
    ('raul-jimenez', 'Raúl Jiménez', 'ST', 78, 36, '#ff8f00', 'Wolverhampton Wanderers'),
    ('andre', 'André', 'CDM', 77, 30, '#ff8f00', 'Wolverhampton Wanderers'),
    ('toti-gomes', 'Toti Gomes', 'CB', 76, 26, '#ff8f00', 'Wolverhampton Wanderers'),
    ('jean-ricner-bellegarde', 'Jean-Ricner Bellegarde', 'CAM', 75, 22, '#ff8f00', 'Wolverhampton Wanderers'),
    ('marshall-munetsi', 'Marshall Munetsi', 'CM', 75, 22, '#ff8f00', 'Wolverhampton Wanderers'),
    ('yerson-mosquera', 'Yerson Mosquera', 'CB', 75, 22, '#ff8f00', 'Wolverhampton Wanderers'),
    ('santiago-bueno', 'Santiago Bueno', 'CB', 74, 18, '#ff8f00', 'Wolverhampton Wanderers'),
    ('bertrand-traore', 'Bertrand Traoré', 'RW', 73, 15, '#ff8f00', 'Wolverhampton Wanderers'),
    ('hugo-bueno', 'Hugo Bueno', 'LB', 73, 15, '#ff8f00', 'Wolverhampton Wanderers'),
    ('rodrigo-gomes', 'Rodrigo Gomes', 'RW', 73, 15, '#ff8f00', 'Wolverhampton Wanderers'),
    ('jordan-james', 'Jordan James', 'CM', 72, 13, '#ff8f00', 'Wolverhampton Wanderers'),

    -- Fenerbahçe
    ('mason-greenwood', 'Mason Greenwood', 'RW', 82, 66, '#f2c94c', 'Fenerbahçe'),
    ('milan-skriniar', 'Milan Škriniar', 'CB', 81, 56, '#f2c94c', 'Fenerbahçe'),
    ('n-golo-kante', 'N''Golo Kanté', 'CDM', 81, 56, '#f2c94c', 'Fenerbahçe'),
    ('romelu-lukaku', 'Romelu Lukaku', 'ST', 80, 48, '#f2c94c', 'Fenerbahçe'),
    ('kerem-akturkoglu', 'Kerem Aktürkoğlu', 'LW', 79, 42, '#f2c94c', 'Fenerbahçe'),
    ('marco-asensio', 'Marco Asensio', 'CAM', 79, 42, '#f2c94c', 'Fenerbahçe'),
    ('matteo-guendouzi', 'Matteo Guendouzi', 'CM', 79, 42, '#f2c94c', 'Fenerbahçe'),
    ('vedat-muriqi', 'Vedat Muriqi', 'ST', 78, 36, '#f2c94c', 'Fenerbahçe'),
    ('nelson-semedo', 'Nélson Semedo', 'RB', 77, 30, '#f2c94c', 'Fenerbahçe'),
    ('jayden-oosterwolde', 'Jayden Oosterwolde', 'CB', 76, 26, '#f2c94c', 'Fenerbahçe'),
    ('sidiki-cherif', 'Sidiki Chérif', 'ST', 72, 13, '#f2c94c', 'Fenerbahçe'),

    -- Galatasaray
    ('ilkay-gundogan', 'İlkay Gündoğan', 'CM', 80, 48, '#ff8f00', 'Galatasaray'),
    ('ugurcan-cakir', 'Uğurcan Çakır', 'GK', 80, 48, '#ff8f00', 'Galatasaray'),
    ('baris-alper-yilmaz', 'Barış Alper Yılmaz', 'RW', 79, 42, '#ff8f00', 'Galatasaray'),
    ('davinson-sanchez', 'Davinson Sánchez', 'CB', 79, 42, '#ff8f00', 'Galatasaray'),
    ('lucas-torreira', 'Lucas Torreira', 'CDM', 79, 42, '#ff8f00', 'Galatasaray'),
    ('gabriel-sara', 'Gabriel Sara', 'CM', 78, 36, '#ff8f00', 'Galatasaray'),
    ('wilfried-singo', 'Wilfried Singo', 'CB', 78, 36, '#ff8f00', 'Galatasaray'),
    ('abdulkerim-bardakci', 'Abdülkerim Bardakcı', 'CB', 77, 30, '#ff8f00', 'Galatasaray'),
    ('yunus-akgun', 'Yunus Akgün', 'RW', 77, 30, '#ff8f00', 'Galatasaray'),
    ('roland-sallai', 'Roland Sallai', 'RW', 76, 26, '#ff8f00', 'Galatasaray'),
    ('lesley-ugochukwu', 'Lesley Ugochukwu', 'CDM', 73, 15, '#ff8f00', 'Galatasaray'),

    -- Genoa
    ('leo-ostigard', 'Leo Østigård', 'CB', 80, 48, '#7a1f2b', 'Genoa'),
    ('johan-vasquez', 'Johan Vásquez', 'CB', 77, 30, '#7a1f2b', 'Genoa'),
    ('morten-frendrup', 'Morten Frendrup', 'CM', 76, 26, '#7a1f2b', 'Genoa'),
    ('hamed-junior-traore', 'Hamed Junior Traorè', 'CAM', 74, 18, '#7a1f2b', 'Genoa'),
    ('nicola-leali', 'Nicola Leali', 'GK', 74, 18, '#7a1f2b', 'Genoa'),
    ('stephan-el-shaarawy', 'Stephan El Shaarawy', 'LW', 74, 18, '#7a1f2b', 'Genoa'),
    ('tommaso-baldanzi', 'Tommaso Baldanzi', 'CAM', 74, 18, '#7a1f2b', 'Genoa'),
    ('junior-messias', 'Junior Messias', 'RW', 73, 15, '#7a1f2b', 'Genoa'),
    ('kingsley-ehizibue', 'Kingsley Ehizibue', 'RB', 73, 15, '#7a1f2b', 'Genoa'),
    ('lorenzo-colombo', 'Lorenzo Colombo', 'ST', 73, 15, '#7a1f2b', 'Genoa'),
    ('caleb-ekuban', 'Caleb Ekuban', 'ST', 71, 12, '#7a1f2b', 'Genoa'),

    -- Hamburger SV
    ('david-moller-wolfe', 'David Møller Wolfe', 'LB', 77, 30, '#1b76d1', 'Hamburger SV'),
    ('terem-moffi', 'Terem Moffi', 'ST', 77, 30, '#1b76d1', 'Hamburger SV'),
    ('fabio-vieira', 'Fábio Vieira', 'CAM', 75, 22, '#1b76d1', 'Hamburger SV'),
    ('albert-sambi-lokonga', 'Albert Sambi Lokonga', 'CM', 74, 18, '#1b76d1', 'Hamburger SV'),
    ('sebastiaan-bornauw', 'Sebastiaan Bornauw', 'CB', 74, 18, '#1b76d1', 'Hamburger SV'),
    ('yussuf-poulsen', 'Yussuf Poulsen', 'ST', 74, 18, '#1b76d1', 'Hamburger SV'),
    ('jean-luc-dompe', 'Jean-Luc Dompé', 'LW', 73, 15, '#1b76d1', 'Hamburger SV'),
    ('jordan-torunarigha', 'Jordan Torunarigha', 'CB', 73, 15, '#1b76d1', 'Hamburger SV'),
    ('miro-muheim', 'Miro Muheim', 'LB', 73, 15, '#1b76d1', 'Hamburger SV'),
    ('bilal-nadir', 'Bilal Nadir', 'CAM', 72, 13, '#1b76d1', 'Hamburger SV'),
    ('nicolai-remberg', 'Nicolai Remberg', 'CM', 72, 13, '#1b76d1', 'Hamburger SV'),

    -- Manchester United
    ('youri-tielemans', 'Youri Tielemans', 'CM', 82, 66, '#d9252a', 'Manchester United'),
    ('carlos-baleba', 'Carlos Baleba', 'CDM', 81, 56, '#d9252a', 'Manchester United'),
    ('harry-maguire', 'Harry Maguire', 'CB', 80, 48, '#d9252a', 'Manchester United'),
    ('manuel-ugarte', 'Manuel Ugarte', 'CDM', 79, 42, '#d9252a', 'Manchester United'),
    ('mason-mount', 'Mason Mount', 'CAM', 79, 42, '#d9252a', 'Manchester United'),
    ('noussair-mazraoui', 'Noussair Mazraoui', 'RB', 79, 42, '#d9252a', 'Manchester United'),
    ('andrey-santos', 'Andrey Santos', 'CM', 78, 36, '#d9252a', 'Manchester United'),
    ('patrick-dorgu', 'Patrick Dorgu', 'LB', 78, 36, '#d9252a', 'Manchester United'),
    ('senne-lammens', 'Senne Lammens', 'GK', 77, 30, '#d9252a', 'Manchester United'),
    ('karl-darlow', 'Karl Darlow', 'GK', 72, 13, '#d9252a', 'Manchester United'),
    ('ayden-heaven', 'Ayden Heaven', 'CB', 70, 11, '#d9252a', 'Manchester United'),

    -- Marseille
    ('amine-gouiri', 'Amine Gouiri', 'ST', 79, 42, '#7bb8ff', 'Marseille'),
    ('igor-paixao', 'Igor Paixão', 'LW', 78, 36, '#7bb8ff', 'Marseille'),
    ('nayef-aguerd', 'Nayef Aguerd', 'CB', 78, 36, '#7bb8ff', 'Marseille'),
    ('angel-gomes', 'Angel Gomes', 'CM', 77, 30, '#7bb8ff', 'Marseille'),
    ('timothy-weah', 'Timothy Weah', 'RW', 77, 30, '#7bb8ff', 'Marseille'),
    ('geoffrey-kondogbia', 'Geoffrey Kondogbia', 'CDM', 76, 26, '#7bb8ff', 'Marseille'),
    ('emerson-palmieri', 'Emerson Palmieri', 'LB', 75, 22, '#7bb8ff', 'Marseille'),
    ('himad-abdelli', 'Himad Abdelli', 'CM', 74, 18, '#7bb8ff', 'Marseille'),
    ('neal-maupay', 'Neal Maupay', 'ST', 73, 15, '#7bb8ff', 'Marseille'),
    ('ulisses-garcia', 'Ulisses Garcia', 'LB', 73, 15, '#7bb8ff', 'Marseille'),
    ('cj-egan-riley', 'CJ Egan-Riley', 'CB', 72, 13, '#7bb8ff', 'Marseille'),

    -- Osasuna
    ('ante-budimir', 'Ante Budimir', 'ST', 79, 42, '#d9252a', 'Osasuna'),
    ('aimar-oroz', 'Aimar Oroz', 'CAM', 77, 30, '#d9252a', 'Osasuna'),
    ('sergio-herrera', 'Sergio Herrera', 'GK', 77, 30, '#d9252a', 'Osasuna'),
    ('alejandro-catena', 'Alejandro Catena', 'CB', 76, 26, '#d9252a', 'Osasuna'),
    ('lucas-torro', 'Lucas Torró', 'CDM', 76, 26, '#d9252a', 'Osasuna'),
    ('jon-moncayola', 'Jon Moncayola', 'CM', 75, 22, '#d9252a', 'Osasuna'),
    ('romain-del-castillo', 'Romain Del Castillo', 'RW', 75, 22, '#d9252a', 'Osasuna'),
    ('moi-gomez', 'Moi Gómez', 'LW', 74, 18, '#d9252a', 'Osasuna'),
    ('ruben-garcia', 'Rubén García', 'RW', 74, 18, '#d9252a', 'Osasuna'),
    ('abel-bretones', 'Abel Bretones', 'LB', 73, 15, '#d9252a', 'Osasuna'),
    ('jorge-herrando', 'Jorge Herrando', 'CB', 73, 15, '#d9252a', 'Osasuna'),

    -- Udinese
    ('jurgen-ekkelenkamp', 'Jurgen Ekkelenkamp', 'CM', 75, 22, '#111111', 'Udinese'),
    ('maduka-okoye', 'Maduka Okoye', 'GK', 75, 22, '#111111', 'Udinese'),
    ('nicolo-zaniolo', 'Nicolò Zaniolo', 'CAM', 75, 22, '#111111', 'Udinese'),
    ('unai-gomez', 'Unai Gómez', 'CAM', 75, 22, '#111111', 'Udinese'),
    ('hassane-kamara', 'Hassane Kamara', 'LB', 74, 18, '#111111', 'Udinese'),
    ('jesper-karlstrom', 'Jesper Karlström', 'CM', 74, 18, '#111111', 'Udinese'),
    ('keinan-davis', 'Keinan Davis', 'ST', 74, 18, '#111111', 'Udinese'),
    ('christian-kabasele', 'Christian Kabasele', 'CB', 73, 15, '#111111', 'Udinese'),
    ('mergim-vojvoda', 'Mergim Vojvoda', 'RB', 73, 15, '#111111', 'Udinese'),
    ('oier-zarraga', 'Oier Zarraga', 'CM', 73, 15, '#111111', 'Udinese'),
    ('lennon-miller', 'Lennon Miller', 'CM', 71, 12, '#111111', 'Udinese'),

    -- Borussia Dortmund
    ('marcel-sabitzer', 'Marcel Sabitzer', 'CM', 80, 48, '#f2c94c', 'Borussia Dortmund'),
    ('joey-veerman', 'Joey Veerman', 'CM', 79, 42, '#f2c94c', 'Borussia Dortmund'),
    ('maximilian-beier', 'Maximilian Beier', 'ST', 79, 42, '#f2c94c', 'Borussia Dortmund'),
    ('emre-can', 'Emre Can', 'CDM', 78, 36, '#f2c94c', 'Borussia Dortmund'),
    ('jobe-bellingham', 'Jobe Bellingham', 'CM', 78, 36, '#f2c94c', 'Borussia Dortmund'),
    ('niklas-sule', 'Niklas Süle', 'CB', 78, 36, '#f2c94c', 'Borussia Dortmund'),
    ('daniel-svensson', 'Daniel Svensson', 'LB', 77, 30, '#f2c94c', 'Borussia Dortmund'),
    ('carney-chukwuemeka', 'Carney Chukwuemeka', 'CAM', 75, 22, '#f2c94c', 'Borussia Dortmund'),
    ('fabio-silva', 'Fábio Silva', 'ST', 74, 18, '#f2c94c', 'Borussia Dortmund'),
    ('alexander-meyer', 'Alexander Meyer', 'GK', 72, 13, '#f2c94c', 'Borussia Dortmund'),

    -- Borussia Mönchengladbach
    ('tim-kleindienst', 'Tim Kleindienst', 'ST', 78, 36, '#35d06a', 'Borussia Mönchengladbach'),
    ('franck-honorat', 'Franck Honorat', 'RW', 77, 30, '#35d06a', 'Borussia Mönchengladbach'),
    ('kevin-stoger', 'Kevin Stöger', 'CAM', 77, 30, '#35d06a', 'Borussia Mönchengladbach'),
    ('nicolas-kuhn', 'Nicolas Kühn', 'RW', 76, 26, '#35d06a', 'Borussia Mönchengladbach'),
    ('florian-neuhaus', 'Florian Neuhaus', 'CM', 75, 22, '#35d06a', 'Borussia Mönchengladbach'),
    ('moritz-nicolas', 'Moritz Nicolas', 'GK', 75, 22, '#35d06a', 'Borussia Mönchengladbach'),
    ('joe-scally', 'Joe Scally', 'RB', 74, 18, '#35d06a', 'Borussia Mönchengladbach'),
    ('robin-hack', 'Robin Hack', 'LW', 74, 18, '#35d06a', 'Borussia Mönchengladbach'),
    ('philipp-sander', 'Philipp Sander', 'CM', 73, 15, '#35d06a', 'Borussia Mönchengladbach'),
    ('shuto-machino', 'Shuto Machino', 'ST', 73, 15, '#35d06a', 'Borussia Mönchengladbach'),

    -- Getafe
    ('david-soria', 'David Soria', 'GK', 78, 36, '#1355a0', 'Getafe'),
    ('borja-mayoral', 'Borja Mayoral', 'ST', 76, 26, '#1355a0', 'Getafe'),
    ('djene-dakonam', 'Djené Dakonam', 'CB', 76, 26, '#1355a0', 'Getafe'),
    ('nemanja-gudelj', 'Nemanja Gudelj', 'CDM', 76, 26, '#1355a0', 'Getafe'),
    ('orel-mangala', 'Orel Mangala', 'CM', 76, 26, '#1355a0', 'Getafe'),
    ('johan-mojica', 'Johan Mojica', 'LB', 75, 22, '#1355a0', 'Getafe'),
    ('enes-unal', 'Enes Ünal', 'ST', 74, 18, '#1355a0', 'Getafe'),
    ('martin-satriano', 'Martín Satriano', 'ST', 74, 18, '#1355a0', 'Getafe'),
    ('kiko-femenia', 'Kiko Femenía', 'RB', 73, 15, '#1355a0', 'Getafe'),
    ('christantus-uche', 'Christantus Uche', 'CM', 72, 13, '#1355a0', 'Getafe'),

    -- Inter
    ('henrikh-mkhitaryan', 'Henrikh Mkhitaryan', 'CM', 80, 48, '#131f6b', 'Inter'),
    ('ivan-provedel', 'Ivan Provedel', 'GK', 80, 48, '#131f6b', 'Inter'),
    ('stefan-de-vrij', 'Stefan de Vrij', 'CB', 80, 48, '#131f6b', 'Inter'),
    ('yann-bisseck', 'Yann Bisseck', 'CB', 79, 42, '#131f6b', 'Inter'),
    ('djed-spence', 'Djed Spence', 'RB', 78, 36, '#131f6b', 'Inter'),
    ('petar-sucic', 'Petar Sučić', 'CM', 78, 36, '#131f6b', 'Inter'),
    ('ange-yoan-bonny', 'Ange-Yoan Bonny', 'ST', 77, 30, '#131f6b', 'Inter'),
    ('josep-martinez', 'Josep Martínez', 'GK', 77, 30, '#131f6b', 'Inter'),
    ('luis-henrique', 'Luis Henrique', 'RW', 77, 30, '#131f6b', 'Inter'),
    ('andy-diouf', 'Andy Diouf', 'CM', 74, 18, '#131f6b', 'Inter'),

    -- Sevilla
    ('ruben-vargas', 'Rubén Vargas', 'LW', 77, 30, '#d9252a', 'Sevilla'),
    ('lucien-agoume', 'Lucien Agoumé', 'CM', 76, 26, '#d9252a', 'Sevilla'),
    ('chidera-ejuke', 'Chidera Ejuke', 'LW', 75, 22, '#d9252a', 'Sevilla'),
    ('marcao', 'Marcão', 'CB', 75, 22, '#d9252a', 'Sevilla'),
    ('gabriel-suazo', 'Gabriel Suazo', 'LB', 74, 18, '#d9252a', 'Sevilla'),
    ('jon-guridi', 'Jon Guridi', 'CM', 74, 18, '#d9252a', 'Sevilla'),
    ('jose-angel-carmona', 'José Ángel Carmona', 'RB', 74, 18, '#d9252a', 'Sevilla'),
    ('juan-iglesias', 'Juan Iglesias', 'RB', 74, 18, '#d9252a', 'Sevilla'),
    ('kike-salas', 'Kike Salas', 'CB', 73, 15, '#d9252a', 'Sevilla'),
    ('felix-correia', 'Félix Correia', 'RW', 72, 13, '#d9252a', 'Sevilla'),

    -- Atlético Madrid
    ('cristian-romero', 'Cristian Romero', 'CB', 85, 112, '#d9252a', 'Atlético Madrid'),
    ('alex-baena', 'Álex Baena', 'CAM', 83, 78, '#d9252a', 'Atlético Madrid'),
    ('pablo-barrios', 'Pablo Barrios', 'CM', 82, 66, '#d9252a', 'Atlético Madrid'),
    ('david-hancko', 'David Hancko', 'CB', 81, 56, '#d9252a', 'Atlético Madrid'),
    ('koke', 'Koke', 'CM', 81, 56, '#d9252a', 'Atlético Madrid'),
    ('morten-hjulmand', 'Morten Hjulmand', 'CDM', 81, 56, '#d9252a', 'Atlético Madrid'),
    ('johnny-cardoso', 'Johnny Cardoso', 'CDM', 78, 36, '#d9252a', 'Atlético Madrid'),
    ('juan-musso', 'Juan Musso', 'GK', 77, 30, '#d9252a', 'Atlético Madrid'),
    ('marc-pubill', 'Marc Pubill', 'RB', 76, 26, '#d9252a', 'Atlético Madrid'),

    -- Beşiktaş
    ('alexander-nubel', 'Alexander Nübel', 'GK', 82, 66, '#111111', 'Beşiktaş'),
    ('orkun-kokcu', 'Orkun Kökçü', 'CM', 80, 48, '#111111', 'Beşiktaş'),
    ('wilfred-ndidi', 'Wilfred Ndidi', 'CDM', 78, 36, '#111111', 'Beşiktaş'),
    ('emmanuel-agbadou', 'Emmanuel Agbadou', 'CB', 76, 26, '#111111', 'Beşiktaş'),
    ('ernest-poku', 'Ernest Poku', 'RW', 76, 26, '#111111', 'Beşiktaş'),
    ('amir-murillo', 'Amir Murillo', 'RB', 74, 18, '#111111', 'Beşiktaş'),
    ('fabio-miretti', 'Fabio Miretti', 'CM', 74, 18, '#111111', 'Beşiktaş'),
    ('salih-ozcan', 'Salih Özcan', 'CDM', 74, 18, '#111111', 'Beşiktaş'),
    ('kassoum-ouattara', 'Kassoum Ouattara', 'LB', 72, 13, '#111111', 'Beşiktaş'),

    -- Burnley
    ('kyle-walker', 'Kyle Walker', 'RB', 78, 36, '#7a1f2b', 'Burnley'),
    ('jamie-vardy', 'Jamie Vardy', 'ST', 74, 18, '#7a1f2b', 'Burnley'),
    ('josh-cullen', 'Josh Cullen', 'CM', 74, 18, '#7a1f2b', 'Burnley'),
    ('largie-ramazani', 'Largie Ramazani', 'LW', 74, 18, '#7a1f2b', 'Burnley'),
    ('marcus-edwards', 'Marcus Edwards', 'RW', 74, 18, '#7a1f2b', 'Burnley'),
    ('armando-broja', 'Armando Broja', 'ST', 73, 15, '#7a1f2b', 'Burnley'),
    ('hannibal-mejbri', 'Hannibal Mejbri', 'CM', 73, 15, '#7a1f2b', 'Burnley'),
    ('lyle-foster', 'Lyle Foster', 'ST', 73, 15, '#7a1f2b', 'Burnley'),
    ('gregoire-coudert', 'Grégoire Coudert', 'GK', 72, 13, '#7a1f2b', 'Burnley'),

    -- Parma
    ('adrian-bernabe', 'Adrián Bernabé', 'CM', 76, 26, '#f2c94c', 'Parma'),
    ('diego-carlos', 'Diego Carlos', 'CB', 75, 22, '#f2c94c', 'Parma'),
    ('emanuele-valeri', 'Emanuele Valeri', 'LB', 74, 18, '#f2c94c', 'Parma'),
    ('giovanni-fabbian', 'Giovanni Fabbian', 'CM', 74, 18, '#f2c94c', 'Parma'),
    ('hans-nicolussi-caviglia', 'Hans Nicolussi Caviglia', 'CM', 74, 18, '#f2c94c', 'Parma'),
    ('vincent-sierro', 'Vincent Sierro', 'CM', 74, 18, '#f2c94c', 'Parma'),
    ('mandela-keita', 'Mandela Keita', 'CDM', 73, 15, '#f2c94c', 'Parma'),
    ('nahuel-estevez', 'Nahuel Estévez', 'CM', 73, 15, '#f2c94c', 'Parma'),
    ('pontus-almqvist', 'Pontus Almqvist', 'RW', 72, 13, '#f2c94c', 'Parma'),

    -- Uten klubb
    ('karim-benzema', 'Karim Benzema', 'ST', 83, 78, '#f2c94c', 'Uten klubb'),
    ('jadon-sancho', 'Jadon Sancho', 'RW', 78, 36, '#f2c94c', 'Uten klubb'),
    ('mauro-icardi', 'Mauro Icardi', 'ST', 78, 36, '#f2c94c', 'Uten klubb'),
    ('yves-bissouma', 'Yves Bissouma', 'CDM', 78, 36, '#f2c94c', 'Uten klubb'),
    ('sergio-ramos', 'Sergio Ramos', 'CB', 77, 30, '#f2c94c', 'Uten klubb'),
    ('adam-webster', 'Adam Webster', 'CB', 74, 18, '#f2c94c', 'Uten klubb'),
    ('solly-march', 'Solly March', 'RW', 74, 18, '#f2c94c', 'Uten klubb'),
    ('milan-badelj', 'Milan Badelj', 'CM', 72, 13, '#f2c94c', 'Uten klubb'),
    ('tyrell-malacia', 'Tyrell Malacia', 'LB', 72, 13, '#f2c94c', 'Uten klubb'),

    -- Wolfsburg
    ('christian-eriksen', 'Christian Eriksen', 'CM', 78, 36, '#35d06a', 'Wolfsburg'),
    ('maximilian-arnold', 'Maximilian Arnold', 'CM', 78, 36, '#35d06a', 'Wolfsburg'),
    ('joakim-maehle', 'Joakim Mæhle', 'LB', 77, 30, '#35d06a', 'Wolfsburg'),
    ('mattias-svanberg', 'Mattias Svanberg', 'CM', 75, 22, '#35d06a', 'Wolfsburg'),
    ('vinicius-souza', 'Vinícius Souza', 'CDM', 74, 18, '#35d06a', 'Wolfsburg'),
    ('elvis-rexhbecaj', 'Elvis Rexhbeçaj', 'CM', 73, 15, '#35d06a', 'Wolfsburg'),
    ('kilian-fischer', 'Kilian Fischer', 'RB', 73, 15, '#35d06a', 'Wolfsburg'),
    ('hauke-wahl', 'Hauke Wahl', 'CB', 72, 13, '#35d06a', 'Wolfsburg'),
    ('yannick-gerhardt', 'Yannick Gerhardt', 'CM', 72, 13, '#35d06a', 'Wolfsburg'),

    -- Augsburg
    ('finn-dahmen', 'Finn Dahmen', 'GK', 76, 26, '#d9252a', 'Augsburg'),
    ('alexis-claude-maurice', 'Alexis Claude-Maurice', 'CAM', 74, 18, '#d9252a', 'Augsburg'),
    ('fabian-rieder', 'Fabian Rieder', 'CAM', 74, 18, '#d9252a', 'Augsburg'),
    ('keven-schlotterbeck', 'Keven Schlotterbeck', 'CB', 74, 18, '#d9252a', 'Augsburg'),
    ('kristijan-jakic', 'Kristijan Jakić', 'CDM', 74, 18, '#d9252a', 'Augsburg'),
    ('jeffrey-gouweleeuw', 'Jeffrey Gouweleeuw', 'CB', 73, 15, '#d9252a', 'Augsburg'),
    ('marius-wolf', 'Marius Wolf', 'RB', 73, 15, '#d9252a', 'Augsburg'),
    ('han-noah-massengo', 'Han-Noah Massengo', 'CM', 72, 13, '#d9252a', 'Augsburg'),

    -- Sporting CP
    ('goncalo-inacio', 'Gonçalo Inácio', 'CB', 81, 56, '#35d06a', 'Sporting CP'),
    ('ousmane-diomande', 'Ousmane Diomande', 'CB', 81, 56, '#35d06a', 'Sporting CP'),
    ('rui-silva', 'Rui Silva', 'GK', 79, 42, '#35d06a', 'Sporting CP'),
    ('luis-javier-suarez', 'Luis Javier Suárez', 'ST', 78, 36, '#35d06a', 'Sporting CP'),
    ('maxi-araujo', 'Maxi Araújo', 'LB', 78, 36, '#35d06a', 'Sporting CP'),
    ('fotis-ioannidis', 'Fotis Ioannidis', 'ST', 77, 30, '#35d06a', 'Sporting CP'),
    ('zeno-debast', 'Zeno Debast', 'CB', 77, 30, '#35d06a', 'Sporting CP'),
    ('geny-catamo', 'Geny Catamo', 'RW', 76, 26, '#35d06a', 'Sporting CP'),

    -- Toulouse
    ('aron-donnum', 'Aron Dønnum', 'LW', 78, 36, '#7a5cff', 'Toulouse'),
    ('guillaume-restes', 'Guillaume Restes', 'GK', 75, 22, '#7a5cff', 'Toulouse'),
    ('warren-kamanzi', 'Warren Kamanzi', 'RB', 75, 22, '#7a5cff', 'Toulouse'),
    ('cristian-casseres-jr', 'Cristian Cásseres Jr.', 'CM', 74, 18, '#7a5cff', 'Toulouse'),
    ('mark-mckenzie', 'Mark McKenzie', 'CB', 74, 18, '#7a5cff', 'Toulouse'),
    ('frank-magri', 'Frank Magri', 'ST', 73, 15, '#7a5cff', 'Toulouse'),
    ('rasmus-nicolaisen', 'Rasmus Nicolaisen', 'CB', 73, 15, '#7a5cff', 'Toulouse'),
    ('yann-gboho', 'Yann Gboho', 'RW', 73, 15, '#7a5cff', 'Toulouse'),

    -- Al-Ahli
    ('francisco-trincao', 'Francisco Trincão', 'RW', 81, 56, '#35d06a', 'Al-Ahli'),
    ('ivan-toney', 'Ivan Toney', 'ST', 81, 56, '#35d06a', 'Al-Ahli'),
    ('riyad-mahrez', 'Riyad Mahrez', 'RW', 81, 56, '#35d06a', 'Al-Ahli'),
    ('edouard-mendy', 'Édouard Mendy', 'GK', 80, 48, '#35d06a', 'Al-Ahli'),
    ('merih-demiral', 'Merih Demiral', 'CB', 79, 42, '#35d06a', 'Al-Ahli'),
    ('roger-ibanez', 'Roger Ibañez', 'CB', 79, 42, '#35d06a', 'Al-Ahli'),
    ('galeno', 'Galeno', 'LW', 78, 36, '#35d06a', 'Al-Ahli'),

    -- Al-Hilal
    ('ruben-neves', 'Rúben Neves', 'CDM', 82, 66, '#1355a0', 'Al-Hilal'),
    ('sergej-milinkovic-savic', 'Sergej Milinković-Savić', 'CM', 82, 66, '#1355a0', 'Al-Hilal'),
    ('yassine-bounou', 'Yassine Bounou', 'GK', 82, 66, '#1355a0', 'Al-Hilal'),
    ('kalidou-koulibaly', 'Kalidou Koulibaly', 'CB', 80, 48, '#1355a0', 'Al-Hilal'),
    ('malcom', 'Malcom', 'RW', 80, 48, '#1355a0', 'Al-Hilal'),
    ('crysencio-summerville', 'Crysencio Summerville', 'LW', 77, 30, '#1355a0', 'Al-Hilal'),
    ('salem-al-dawsari', 'Salem Al-Dawsari', 'LW', 77, 30, '#1355a0', 'Al-Hilal'),

    -- Brest
    ('brendan-chardonnet', 'Brendan Chardonnet', 'CB', 74, 18, '#d9252a', 'Brest'),
    ('ludovic-ajorque', 'Ludovic Ajorque', 'ST', 74, 18, '#d9252a', 'Brest'),
    ('bradley-locko', 'Bradley Locko', 'LB', 73, 15, '#d9252a', 'Brest'),
    ('hugo-magnetti', 'Hugo Magnetti', 'CM', 73, 15, '#d9252a', 'Brest'),
    ('kenny-lala', 'Kenny Lala', 'RB', 73, 15, '#d9252a', 'Brest'),
    ('kamory-doumbia', 'Kamory Doumbia', 'CAM', 72, 13, '#d9252a', 'Brest'),
    ('mama-balde', 'Mama Baldé', 'ST', 72, 13, '#d9252a', 'Brest'),

    -- Feyenoord
    ('anis-hadj-moussa', 'Anis Hadj Moussa', 'RW', 77, 30, '#d9252a', 'Feyenoord'),
    ('gernot-trauner', 'Gernot Trauner', 'CB', 77, 30, '#d9252a', 'Feyenoord'),
    ('timon-wellenreuther', 'Timon Wellenreuther', 'GK', 77, 30, '#d9252a', 'Feyenoord'),
    ('raheem-sterling', 'Raheem Sterling', 'LW', 76, 26, '#d9252a', 'Feyenoord'),
    ('sem-steijn', 'Sem Steijn', 'CAM', 76, 26, '#d9252a', 'Feyenoord'),
    ('givairo-read', 'Givairo Read', 'RB', 74, 18, '#d9252a', 'Feyenoord'),
    ('reiss-nelson', 'Reiss Nelson', 'LW', 74, 18, '#d9252a', 'Feyenoord'),

    -- Lens
    ('florian-thauvin', 'Florian Thauvin', 'RW', 78, 36, '#f2c94c', 'Lens'),
    ('jean-clair-todibo', 'Jean-Clair Todibo', 'CB', 78, 36, '#f2c94c', 'Lens'),
    ('amadou-haidara', 'Amadou Haidara', 'CM', 77, 30, '#f2c94c', 'Lens'),
    ('odsonne-edouard', 'Odsonne Édouard', 'ST', 76, 26, '#f2c94c', 'Lens'),
    ('robin-risser', 'Robin Risser', 'GK', 76, 26, '#f2c94c', 'Lens'),
    ('ruben-aguilar', 'Ruben Aguilar', 'RB', 74, 18, '#f2c94c', 'Lens'),
    ('jonathan-gradit', 'Jonathan Gradit', 'CB', 73, 15, '#f2c94c', 'Lens'),

    -- Mallorca
    ('sergi-darder', 'Sergi Darder', 'CM', 77, 30, '#d9252a', 'Mallorca'),
    ('antonio-raillo', 'Antonio Raíllo', 'CB', 75, 22, '#d9252a', 'Mallorca'),
    ('martin-valjent', 'Martin Valjent', 'CB', 75, 22, '#d9252a', 'Mallorca'),
    ('arnau-tenas', 'Arnau Tenas', 'GK', 74, 18, '#d9252a', 'Mallorca'),
    ('manu-morlanes', 'Manu Morlanes', 'CM', 74, 18, '#d9252a', 'Mallorca'),
    ('pablo-torre', 'Pablo Torre', 'CAM', 73, 15, '#d9252a', 'Mallorca'),
    ('adrian-liso', 'Adrián Liso', 'LW', 72, 13, '#d9252a', 'Mallorca'),

    -- Nantes
    ('lucas-perri', 'Lucas Perri', 'GK', 77, 30, '#f2c94c', 'Nantes'),
    ('deiver-machado', 'Deiver Machado', 'LB', 73, 15, '#f2c94c', 'Nantes'),
    ('johann-lepenant', 'Johann Lepenant', 'CM', 73, 15, '#f2c94c', 'Nantes'),
    ('mostafa-mohamed', 'Mostafa Mohamed', 'ST', 73, 15, '#f2c94c', 'Nantes'),
    ('francis-coquelin', 'Francis Coquelin', 'CDM', 72, 13, '#f2c94c', 'Nantes'),
    ('frederic-guilbert', 'Frédéric Guilbert', 'RB', 72, 13, '#f2c94c', 'Nantes'),
    ('kelvin-amian', 'Kelvin Amian', 'RB', 72, 13, '#f2c94c', 'Nantes'),

    -- Strasbourg
    ('emanuel-emegha', 'Emanuel Emegha', 'ST', 76, 26, '#1b76d1', 'Strasbourg'),
    ('joaquin-panichelli', 'Joaquín Panichelli', 'ST', 76, 26, '#1b76d1', 'Strasbourg'),
    ('filip-jorgensen', 'Filip Jørgensen', 'GK', 75, 22, '#1b76d1', 'Strasbourg'),
    ('dario-essugo', 'Dário Essugo', 'CM', 74, 18, '#1b76d1', 'Strasbourg'),
    ('sebastian-nanasi', 'Sebastian Nanasi', 'LW', 74, 18, '#1b76d1', 'Strasbourg'),
    ('andrew-omobamidele', 'Andrew Omobamidele', 'CB', 73, 15, '#1b76d1', 'Strasbourg'),
    ('ismael-doukoure', 'Ismaël Doukouré', 'CB', 73, 15, '#1b76d1', 'Strasbourg'),

    -- Al-Nassr
    ('cristiano-ronaldo', 'Cristiano Ronaldo', 'ST', 85, 112, '#f2c94c', 'Al-Nassr'),
    ('marcelo-brozovic', 'Marcelo Brozović', 'CM', 81, 56, '#f2c94c', 'Al-Nassr'),
    ('sadio-mane', 'Sadio Mané', 'LW', 81, 56, '#f2c94c', 'Al-Nassr'),
    ('joao-felix', 'João Félix', 'CAM', 80, 48, '#f2c94c', 'Al-Nassr'),
    ('bento', 'Bento', 'GK', 78, 36, '#f2c94c', 'Al-Nassr'),
    ('samu-costa', 'Samú Costa', 'CM', 76, 26, '#f2c94c', 'Al-Nassr'),

    -- Cagliari
    ('elia-caprile', 'Elia Caprile', 'GK', 76, 26, '#7a1f2b', 'Cagliari'),
    ('daniel-maldini', 'Daniel Maldini', 'CAM', 74, 18, '#7a1f2b', 'Cagliari'),
    ('yerry-mina', 'Yerry Mina', 'CB', 74, 18, '#7a1f2b', 'Cagliari'),
    ('gabriele-zappa', 'Gabriele Zappa', 'RB', 73, 15, '#7a1f2b', 'Cagliari'),
    ('andrea-belotti', 'Andrea Belotti', 'ST', 72, 13, '#7a1f2b', 'Cagliari'),
    ('jacopo-fazzini', 'Jacopo Fazzini', 'CAM', 72, 13, '#7a1f2b', 'Cagliari'),

    -- Lecce
    ('wladimiro-falcone', 'Wladimiro Falcone', 'GK', 77, 30, '#f2c94c', 'Lecce'),
    ('kialonda-gaspar', 'Kialonda Gaspar', 'CB', 74, 18, '#f2c94c', 'Lecce'),
    ('lassana-coulibaly', 'Lassana Coulibaly', 'CM', 74, 18, '#f2c94c', 'Lecce'),
    ('antonino-gallo', 'Antonino Gallo', 'LB', 73, 15, '#f2c94c', 'Lecce'),
    ('nikola-stulic', 'Nikola Štulić', 'ST', 72, 13, '#f2c94c', 'Lecce'),
    ('santiago-pierotti', 'Santiago Pierotti', 'RW', 72, 13, '#f2c94c', 'Lecce'),

    -- Paris FC
    ('ilan-kebbal', 'Ilan Kebbal', 'CAM', 74, 18, '#1355a0', 'Paris FC'),
    ('lassine-sinayoko', 'Lassine Sinayoko', 'ST', 74, 18, '#1355a0', 'Paris FC'),
    ('maxime-lopez', 'Maxime Lopez', 'CM', 74, 18, '#1355a0', 'Paris FC'),
    ('moses-simon', 'Moses Simon', 'LW', 74, 18, '#1355a0', 'Paris FC'),
    ('jean-philippe-krasso', 'Jean-Philippe Krasso', 'ST', 72, 13, '#1355a0', 'Paris FC'),
    ('pablo-pagis', 'Pablo Pagis', 'RW', 72, 13, '#1355a0', 'Paris FC'),

    -- PSV Eindhoven
    ('jerdy-schouten', 'Jerdy Schouten', 'CDM', 78, 36, '#d9252a', 'PSV Eindhoven'),
    ('guus-til', 'Guus Til', 'CAM', 77, 30, '#d9252a', 'PSV Eindhoven'),
    ('ivan-perisic', 'Ivan Perišić', 'LW', 77, 30, '#d9252a', 'PSV Eindhoven'),
    ('sergino-dest', 'Sergiño Dest', 'RB', 77, 30, '#d9252a', 'PSV Eindhoven'),
    ('ricardo-pepi', 'Ricardo Pepi', 'ST', 76, 26, '#d9252a', 'PSV Eindhoven'),
    ('filip-kostic', 'Filip Kostić', 'LW', 74, 18, '#d9252a', 'PSV Eindhoven'),

    -- Al-Diriyah
    ('berat-djimsiti', 'Berat Djimsiti', 'CB', 78, 36, '#35d06a', 'Al-Diriyah'),
    ('enzo-millot', 'Enzo Millot', 'CAM', 78, 36, '#35d06a', 'Al-Diriyah'),
    ('chancel-mbemba', 'Chancel Mbemba', 'CB', 77, 30, '#35d06a', 'Al-Diriyah'),
    ('nikola-vasilj', 'Nikola Vasilj', 'GK', 75, 22, '#35d06a', 'Al-Diriyah'),
    ('gaetan-laborde', 'Gaëtan Laborde', 'ST', 74, 18, '#35d06a', 'Al-Diriyah'),

    -- Al-Ittihad
    ('fabinho', 'Fabinho', 'CDM', 79, 42, '#f2c94c', 'Al-Ittihad'),
    ('houssem-aouar', 'Houssem Aouar', 'CAM', 78, 36, '#f2c94c', 'Al-Ittihad'),
    ('predrag-rajkovic', 'Predrag Rajković', 'GK', 78, 36, '#f2c94c', 'Al-Ittihad'),
    ('steven-bergwijn', 'Steven Bergwijn', 'LW', 77, 30, '#f2c94c', 'Al-Ittihad'),
    ('george-ilenikhena', 'George Ilenikhena', 'ST', 72, 13, '#f2c94c', 'Al-Ittihad'),

    -- Alavés
    ('antonio-sivera', 'Antonio Sivera', 'GK', 76, 26, '#1b76d1', 'Alavés'),
    ('antonio-blanco', 'Antonio Blanco', 'CDM', 75, 22, '#1b76d1', 'Alavés'),
    ('lucas-boye', 'Lucas Boyé', 'ST', 75, 22, '#1b76d1', 'Alavés'),
    ('toni-martinez', 'Toni Martínez', 'ST', 75, 22, '#1b76d1', 'Alavés'),
    ('nahuel-tenaglia', 'Nahuel Tenaglia', 'CB', 74, 18, '#1b76d1', 'Alavés'),

    -- Bayern München
    ('konrad-laimer', 'Konrad Laimer', 'RB', 82, 66, '#d9252a', 'Bayern München'),
    ('ismael-saibari', 'Ismael Saibari', 'CAM', 78, 36, '#d9252a', 'Bayern München'),
    ('nathaniel-brown', 'Nathaniel Brown', 'LB', 78, 36, '#d9252a', 'Bayern München'),
    ('jonas-urbig', 'Jonas Urbig', 'GK', 75, 22, '#d9252a', 'Bayern München'),
    ('lennart-karl', 'Lennart Karl', 'CAM', 74, 18, '#d9252a', 'Bayern München'),

    -- Elche
    ('facundo-buonanotte', 'Facundo Buonanotte', 'CAM', 75, 22, '#35d06a', 'Elche'),
    ('matias-dituro', 'Matías Dituro', 'GK', 74, 18, '#35d06a', 'Elche'),
    ('marc-aguado', 'Marc Aguado', 'CM', 73, 15, '#35d06a', 'Elche'),
    ('german-valera', 'Germán Valera', 'RW', 72, 13, '#35d06a', 'Elche'),
    ('tete-morente', 'Tete Morente', 'RW', 72, 13, '#35d06a', 'Elche'),

    -- Girona
    ('paulo-gazzaniga', 'Paulo Gazzaniga', 'GK', 78, 36, '#d9252a', 'Girona'),
    ('fran-beltran', 'Fran Beltrán', 'CM', 76, 26, '#d9252a', 'Girona'),
    ('bryan-gil', 'Bryan Gil', 'LW', 75, 22, '#d9252a', 'Girona'),
    ('vladyslav-vanat', 'Vladyslav Vanat', 'ST', 75, 22, '#d9252a', 'Girona'),
    ('abel-ruiz', 'Abel Ruiz', 'ST', 74, 18, '#d9252a', 'Girona'),

    -- Heidenheim
    ('patrick-mainka', 'Patrick Mainka', 'CB', 73, 15, '#d9252a', 'Heidenheim'),
    ('adrian-beck', 'Adrian Beck', 'CAM', 72, 13, '#d9252a', 'Heidenheim'),
    ('budu-zivzivadze', 'Budu Zivzivadze', 'ST', 72, 13, '#d9252a', 'Heidenheim'),
    ('jan-schoppner', 'Jan Schöppner', 'CM', 72, 13, '#d9252a', 'Heidenheim'),
    ('mathias-honsak', 'Mathias Honsak', 'LW', 72, 13, '#d9252a', 'Heidenheim'),

    -- Ipswich Town
    ('daizen-maeda', 'Daizen Maeda', 'LW', 78, 36, '#1355a0', 'Ipswich Town'),
    ('sasa-lukic', 'Saša Lukić', 'CM', 77, 30, '#1355a0', 'Ipswich Town'),
    ('issa-diop', 'Issa Diop', 'CB', 75, 22, '#1355a0', 'Ipswich Town'),
    ('julio-enciso', 'Julio Enciso', 'CAM', 75, 22, '#1355a0', 'Ipswich Town'),
    ('zian-flemming', 'Zian Flemming', 'ST', 75, 22, '#1355a0', 'Ipswich Town'),

    -- Levante
    ('carlos-alvarez', 'Carlos Álvarez', 'CAM', 75, 22, '#7a1f2b', 'Levante'),
    ('etta-eyong', 'Etta Eyong', 'ST', 74, 18, '#7a1f2b', 'Levante'),
    ('ivan-romero', 'Iván Romero', 'ST', 73, 15, '#7a1f2b', 'Levante'),
    ('hugo-sotelo', 'Hugo Sotelo', 'CM', 72, 13, '#7a1f2b', 'Levante'),
    ('kervin-arriaga', 'Kervin Arriaga', 'CDM', 72, 13, '#7a1f2b', 'Levante'),

    -- Manchester City
    ('marc-guehi', 'Marc Guéhi', 'CB', 84, 94, '#7bb8ff', 'Manchester City'),
    ('elliot-anderson', 'Elliot Anderson', 'CM', 83, 78, '#7bb8ff', 'Manchester City'),
    ('geronimo-rulli', 'Gerónimo Rulli', 'GK', 81, 56, '#7bb8ff', 'Manchester City'),
    ('iliman-ndiaye', 'Iliman Ndiaye', 'LW', 80, 48, '#7bb8ff', 'Manchester City'),
    ('ayyoub-bouaddi', 'Ayyoub Bouaddi', 'CM', 74, 18, '#7bb8ff', 'Manchester City'),

    -- Olympiacos
    ('leon-bailey', 'Leon Bailey', 'RW', 79, 42, '#d9252a', 'Olympiacos'),
    ('ayoub-el-kaabi', 'Ayoub El Kaabi', 'ST', 78, 36, '#d9252a', 'Olympiacos'),
    ('remo-freuler', 'Remo Freuler', 'CM', 78, 36, '#d9252a', 'Olympiacos'),
    ('joel-roca', 'Joel Roca', 'LW', 72, 13, '#d9252a', 'Olympiacos'),
    ('manolis-saliakas', 'Manolis Saliakas', 'RB', 72, 13, '#d9252a', 'Olympiacos'),

    -- Paris Saint-Germain
    ('lucas-chevalier', 'Lucas Chevalier', 'GK', 82, 66, '#203f91', 'Paris Saint-Germain'),
    ('maghnes-akliouche', 'Maghnes Akliouche', 'CAM', 80, 48, '#203f91', 'Paris Saint-Germain'),
    ('lucas-digne', 'Lucas Digne', 'LB', 79, 42, '#203f91', 'Paris Saint-Germain'),
    ('senny-mayulu', 'Senny Mayulu', 'CM', 75, 22, '#203f91', 'Paris Saint-Germain'),
    ('ibrahim-mbaye', 'Ibrahim Mbaye', 'LW', 72, 13, '#203f91', 'Paris Saint-Germain'),

    -- River Plate
    ('thiago-almada', 'Thiago Almada', 'CAM', 80, 48, '#d9252a', 'River Plate'),
    ('nicolas-otamendi', 'Nicolás Otamendi', 'CB', 79, 42, '#d9252a', 'River Plate'),
    ('mauro-arambarri', 'Mauro Arambarri', 'CM', 77, 30, '#d9252a', 'River Plate'),
    ('lucas-beltran', 'Lucas Beltrán', 'ST', 74, 18, '#d9252a', 'River Plate'),
    ('kendry-paez', 'Kendry Páez', 'CAM', 72, 13, '#d9252a', 'River Plate'),

    -- Schalke 04
    ('robin-gosens', 'Robin Gosens', 'LB', 78, 36, '#1355a0', 'Schalke 04'),
    ('edin-dzeko', 'Edin Džeko', 'ST', 77, 30, '#1355a0', 'Schalke 04'),
    ('hwang-hee-chan', 'Hwang Hee-chan', 'ST', 76, 26, '#1355a0', 'Schalke 04'),
    ('kevin-muller', 'Kevin Müller', 'GK', 74, 18, '#1355a0', 'Schalke 04'),
    ('junior-adamu', 'Junior Adamu', 'ST', 73, 15, '#1355a0', 'Schalke 04'),

    -- Venezia
    ('akor-adams', 'Akor Adams', 'ST', 75, 22, '#ff8f00', 'Venezia'),
    ('lorenzo-montipo', 'Lorenzo Montipò', 'GK', 75, 22, '#ff8f00', 'Venezia'),
    ('simon-sohm', 'Simon Sohm', 'CM', 75, 22, '#ff8f00', 'Venezia'),
    ('toma-basic', 'Toma Bašić', 'CM', 74, 18, '#ff8f00', 'Venezia'),
    ('pasquale-mazzocchi', 'Pasquale Mazzocchi', 'RB', 72, 13, '#ff8f00', 'Venezia'),

    -- Al-Qadsiah
    ('mohammed-kudus', 'Mohammed Kudus', 'RW', 83, 78, '#d9252a', 'Al-Qadsiah'),
    ('julian-quinones', 'Julián Quiñones', 'ST', 79, 42, '#d9252a', 'Al-Qadsiah'),
    ('nahitan-nandez', 'Nahitan Nández', 'CM', 78, 36, '#d9252a', 'Al-Qadsiah'),
    ('julian-weigl', 'Julian Weigl', 'CDM', 75, 22, '#d9252a', 'Al-Qadsiah'),

    -- Arsenal
    ('ezri-konsa', 'Ezri Konsa', 'CB', 82, 66, '#d73a49', 'Arsenal'),
    ('christos-tzolis', 'Christos Tzolis', 'LW', 79, 42, '#d73a49', 'Arsenal'),
    ('kepa-arrizabalaga', 'Kepa Arrizabalaga', 'GK', 79, 42, '#d73a49', 'Arsenal'),
    ('illan-meslier', 'Illan Meslier', 'GK', 74, 18, '#d73a49', 'Arsenal'),

    -- Club Brugge
    ('hans-vanaken', 'Hans Vanaken', 'CAM', 79, 42, '#1355a0', 'Club Brugge'),
    ('simon-mignolet', 'Simon Mignolet', 'GK', 77, 30, '#1355a0', 'Club Brugge'),
    ('felix-lemarechal', 'Félix Lemaréchal', 'CM', 72, 13, '#1355a0', 'Club Brugge'),
    ('jan-virgili', 'Jan Virgili', 'LW', 72, 13, '#1355a0', 'Club Brugge'),

    -- Cremonese
    ('federico-baschirotto', 'Federico Baschirotto', 'CB', 73, 15, '#d9252a', 'Cremonese'),
    ('federico-bonazzoli', 'Federico Bonazzoli', 'ST', 73, 15, '#d9252a', 'Cremonese'),
    ('sebastiano-luperto', 'Sebastiano Luperto', 'CB', 73, 15, '#d9252a', 'Cremonese'),
    ('warren-bondo', 'Warren Bondo', 'CM', 72, 13, '#d9252a', 'Cremonese'),

    -- Pisa
    ('juan-cuadrado', 'Juan Cuadrado', 'RW', 73, 15, '#111111', 'Pisa'),
    ('m-bala-nzola', 'M''Bala Nzola', 'ST', 73, 15, '#111111', 'Pisa'),
    ('antonio-caracciolo', 'Antonio Caracciolo', 'CB', 72, 13, '#111111', 'Pisa'),
    ('stefano-moreo', 'Stefano Moreo', 'ST', 72, 13, '#111111', 'Pisa'),

    -- Bodø/Glimt
    ('jens-petter-hauge', 'Jens Petter Hauge', 'LW', 78, 36, '#f2c94c', 'Bodø/Glimt'),
    ('fredrik-bjorkan', 'Fredrik Bjørkan', 'LB', 77, 30, '#f2c94c', 'Bodø/Glimt'),
    ('sondre-brunstad-fet', 'Sondre Brunstad Fet', 'CM', 77, 30, '#f2c94c', 'Bodø/Glimt'),

    -- Celtic
    ('callum-mcgregor', 'Callum McGregor', 'CM', 77, 30, '#35d06a', 'Celtic'),
    ('kasper-hogh', 'Kasper Høgh', 'ST', 75, 22, '#35d06a', 'Celtic'),
    ('sam-johnstone', 'Sam Johnstone', 'GK', 75, 22, '#35d06a', 'Celtic'),

    -- Deportivo La Coruña
    ('jose-maria-gimenez', 'José María Giménez', 'CB', 82, 66, '#1b76d1', 'Deportivo La Coruña'),
    ('angelino', 'Angeliño', 'LB', 78, 36, '#1b76d1', 'Deportivo La Coruña'),
    ('pierre-emerick-aubameyang', 'Pierre-Emerick Aubameyang', 'ST', 78, 36, '#1b76d1', 'Deportivo La Coruña'),

    -- Flamengo
    ('lucas-paqueta', 'Lucas Paquetá', 'CAM', 81, 56, '#d9252a', 'Flamengo'),
    ('giorgian-de-arrascaeta', 'Giorgian de Arrascaeta', 'CAM', 80, 48, '#d9252a', 'Flamengo'),
    ('jorginho', 'Jorginho', 'CM', 78, 36, '#d9252a', 'Flamengo'),

    -- LAFC
    ('denis-bouanga', 'Denis Bouanga', 'LW', 80, 48, '#f2c94c', 'LAFC'),
    ('hugo-lloris', 'Hugo Lloris', 'GK', 79, 42, '#f2c94c', 'LAFC'),
    ('igor-jesus', 'Igor Jesus', 'ST', 77, 30, '#f2c94c', 'LAFC'),

    -- Le Havre
    ('djibril-sow', 'Djibril Sow', 'CM', 75, 22, '#7bb8ff', 'Le Havre'),
    ('abdoulaye-toure', 'Abdoulaye Touré', 'CM', 73, 15, '#7bb8ff', 'Le Havre'),
    ('loic-nego', 'Loïc Nego', 'RB', 72, 13, '#7bb8ff', 'Le Havre'),

    -- Lorient
    ('yvon-mvogo', 'Yvon Mvogo', 'GK', 74, 18, '#ff8f00', 'Lorient'),
    ('laurent-abergel', 'Laurent Abergel', 'CM', 72, 13, '#ff8f00', 'Lorient'),
    ('tosin-aiyegun', 'Tosin Aiyegun', 'ST', 72, 13, '#ff8f00', 'Lorient'),

    -- Real Madrid
    ('antonio-rudiger', 'Antonio Rüdiger', 'CB', 85, 112, '#ffffff', 'Real Madrid'),
    ('alvaro-carreras', 'Álvaro Carreras', 'LB', 80, 48, '#ffffff', 'Real Madrid'),
    ('yan-diomande', 'Yan Diomande', 'RW', 77, 30, '#ffffff', 'Real Madrid'),

    -- Real Oviedo
    ('aaron-escandell', 'Aarón Escandell', 'GK', 73, 15, '#1355a0', 'Real Oviedo'),
    ('david-costas', 'David Costas', 'CB', 72, 13, '#1355a0', 'Real Oviedo'),
    ('ilyas-chaira', 'Ilyas Chaira', 'LW', 71, 12, '#1355a0', 'Real Oviedo'),

    -- Abha
    ('donovan-leon', 'Donovan Léon', 'GK', 74, 18, '#35d06a', 'Abha'),
    ('michy-batshuayi', 'Michy Batshuayi', 'ST', 73, 15, '#35d06a', 'Abha'),

    -- Al-Duhail
    ('tuta', 'Tuta', 'CB', 76, 26, '#7a1f2b', 'Al-Duhail'),
    ('arthur-desmas', 'Arthur Desmas', 'GK', 73, 15, '#7a1f2b', 'Al-Duhail'),

    -- Al-Khaleej
    ('joshua-king', 'Joshua King', 'ST', 75, 22, '#f2c94c', 'Al-Khaleej'),
    ('omar-mascarell', 'Omar Mascarell', 'CDM', 74, 18, '#f2c94c', 'Al-Khaleej'),

    -- Almería
    ('mikel-vesga', 'Mikel Vesga', 'CDM', 76, 26, '#d9252a', 'Almería'),
    ('alex-sola', 'Álex Sola', 'RW', 73, 15, '#d9252a', 'Almería'),

    -- Angers
    ('anthony-lopes', 'Anthony Lopes', 'GK', 76, 26, '#111111', 'Angers'),
    ('haris-belkebla', 'Haris Belkebla', 'CM', 72, 13, '#111111', 'Angers'),

    -- Auxerre
    ('elisha-owusu', 'Elisha Owusu', 'CM', 72, 13, '#1b76d1', 'Auxerre'),
    ('kevin-danois', 'Kevin Danois', 'CM', 72, 13, '#1b76d1', 'Auxerre'),

    -- Birmingham City
    ('carlos-vicente', 'Carlos Vicente', 'RW', 75, 22, '#1355a0', 'Birmingham City'),
    ('kristoffer-lund', 'Kristoffer Lund', 'LB', 73, 15, '#1355a0', 'Birmingham City'),

    -- Coventry City
    ('taiwo-awoniyi', 'Taiwo Awoniyi', 'ST', 74, 18, '#7bb8ff', 'Coventry City'),
    ('aurele-amenda', 'Aurèle Amenda', 'CB', 73, 15, '#7bb8ff', 'Coventry City'),

    -- Frosinone
    ('romano-schmid', 'Romano Schmid', 'CAM', 77, 30, '#f2c94c', 'Frosinone'),
    ('patrizio-masini', 'Patrizio Masini', 'CM', 72, 13, '#f2c94c', 'Frosinone'),

    -- Hellas Verona
    ('suat-serdar', 'Suat Serdar', 'CM', 74, 18, '#f2c94c', 'Hellas Verona'),
    ('abdou-harroui', 'Abdou Harroui', 'CM', 72, 13, '#f2c94c', 'Hellas Verona'),

    -- Inter Miami
    ('rodrigo-de-paul', 'Rodrigo De Paul', 'CM', 81, 56, '#ff8fb1', 'Inter Miami'),
    ('luis-suarez', 'Luis Suárez', 'ST', 78, 36, '#ff8fb1', 'Inter Miami'),

    -- Konyaspor
    ('arthur-masuaku', 'Arthur Masuaku', 'LB', 73, 15, '#35d06a', 'Konyaspor'),
    ('chidozie-awaziem', 'Chidozie Awaziem', 'CB', 72, 13, '#35d06a', 'Konyaspor'),

    -- LA Galaxy
    ('hirving-lozano', 'Hirving Lozano', 'RW', 76, 26, '#1355a0', 'LA Galaxy'),
    ('marco-reus', 'Marco Reus', 'CAM', 76, 26, '#1355a0', 'LA Galaxy'),

    -- Paderborn
    ('marvin-pieringer', 'Marvin Pieringer', 'ST', 72, 13, '#35d06a', 'Paderborn'),
    ('rayan-philippe', 'Rayan Philippe', 'ST', 72, 13, '#35d06a', 'Paderborn'),

    -- Palmeiras
    ('andreas-pereira', 'Andreas Pereira', 'CAM', 79, 42, '#35d06a', 'Palmeiras'),
    ('jhon-arias', 'Jhon Arias', 'RW', 77, 30, '#35d06a', 'Palmeiras'),

    -- Racing de Santander
    ('ivan-martin', 'Iván Martín', 'CM', 76, 26, '#35d06a', 'Racing de Santander'),
    ('julen-agirrezabala', 'Julen Agirrezabala', 'GK', 75, 22, '#35d06a', 'Racing de Santander'),

    -- SC Braga
    ('ricardo-horta', 'Ricardo Horta', 'LW', 78, 36, '#d9252a', 'SC Braga'),
    ('jonas-wind', 'Jonas Wind', 'ST', 75, 22, '#d9252a', 'SC Braga'),

    -- Sheffield United
    ('kalvin-phillips', 'Kalvin Phillips', 'CDM', 74, 18, '#d9252a', 'Sheffield United'),
    ('matt-doherty', 'Matt Doherty', 'RB', 73, 15, '#d9252a', 'Sheffield United'),

    -- St. Pauli
    ('eric-smith', 'Eric Smith', 'CB', 74, 18, '#7a1f2b', 'St. Pauli'),
    ('danel-sinani', 'Danel Sinani', 'CAM', 72, 13, '#7a1f2b', 'St. Pauli'),

    -- Trabzonspor
    ('ruslan-malinovskyi', 'Ruslan Malinovskyi', 'CAM', 76, 26, '#7a1f2b', 'Trabzonspor'),
    ('batista-mendy', 'Batista Mendy', 'CDM', 74, 18, '#7a1f2b', 'Trabzonspor'),

    -- Watford
    ('federico-ravaglia', 'Federico Ravaglia', 'GK', 75, 22, '#f2c94c', 'Watford'),
    ('iker-bravo', 'Iker Bravo', 'ST', 72, 13, '#f2c94c', 'Watford'),

    -- Young Boys
    ('cedric-zesiger', 'Cédric Zesiger', 'CB', 73, 15, '#f2c94c', 'Young Boys'),
    ('samuel-essende', 'Samuel Essende', 'ST', 73, 15, '#f2c94c', 'Young Boys'),

    -- AEK Athens
    ('lovro-majer', 'Lovro Majer', 'CAM', 76, 26, '#f2c94c', 'AEK Athens'),

    -- Al Jazira
    ('kristjan-asllani', 'Kristjan Asllani', 'CDM', 75, 22, '#d9252a', 'Al Jazira'),

    -- Al-Fateh
    ('adrian-semper', 'Adrian Šemper', 'GK', 73, 15, '#35d06a', 'Al-Fateh'),

    -- Al-Rayyan
    ('aleksandar-mitrovic', 'Aleksandar Mitrović', 'ST', 80, 48, '#e62b3f', 'Al-Rayyan'),

    -- Al-Shabab
    ('thomas-partey', 'Thomas Partey', 'CDM', 80, 48, '#ffffff', 'Al-Shabab'),

    -- Al-Shamal
    ('wesley-said', 'Wesley Saïd', 'ST', 73, 15, '#1355a0', 'Al-Shamal'),

    -- Aldosivi
    ('mateo-kovacic', 'Mateo Kovačić', 'CM', 80, 48, '#35d06a', 'Aldosivi'),

    -- Amed
    ('gift-orban', 'Gift Orban', 'ST', 73, 15, '#35d06a', 'Amed'),

    -- Anderlecht
    ('thelo-aasgaard', 'Thelo Aasgaard', 'CAM', 77, 30, '#7a5cff', 'Anderlecht'),

    -- Aris
    ('rafa-mir', 'Rafa Mir', 'ST', 74, 18, '#35d06a', 'Aris'),

    -- Atlético Mineiro
    ('fred', 'Fred', 'CM', 77, 30, '#111111', 'Atlético Mineiro'),

    -- Atlético Nacional
    ('james-rodriguez', 'James Rodríguez', 'CAM', 77, 30, '#35d06a', 'Atlético Nacional'),

    -- Barcelona
    ('joao-cancelo', 'João Cancelo', 'RB', 82, 66, '#f2c94c', 'Barcelona'),

    -- Belgrano
    ('franco-vazquez', 'Franco Vázquez', 'CAM', 73, 15, '#35d06a', 'Belgrano'),

    -- Cardiff City
    ('gabriel-osho', 'Gabriel Osho', 'CB', 72, 13, '#1355a0', 'Cardiff City'),

    -- Cerezo Osaka
    ('jackson-irvine', 'Jackson Irvine', 'CM', 74, 18, '#35d06a', 'Cerezo Osaka'),

    -- Columbus Crew
    ('brais-mendez', 'Brais Méndez', 'CAM', 80, 48, '#f2c94c', 'Columbus Crew'),

    -- Corinthians
    ('memphis-depay', 'Memphis Depay', 'ST', 78, 36, '#111111', 'Corinthians'),

    -- Çorum
    ('ylber-ramadani', 'Ylber Ramadani', 'CDM', 73, 15, '#35d06a', 'Çorum'),

    -- Crvena Zvezda
    ('bamba-dieng', 'Bamba Dieng', 'ST', 72, 13, '#d9252a', 'Crvena Zvezda'),

    -- Eibar
    ('unai-elgezabal', 'Unai Elgezabal', 'CB', 72, 13, '#35d06a', 'Eibar'),

    -- Gençlerbirliği
    ('adama-traore', 'Adama Traoré', 'RW', 75, 22, '#35d06a', 'Gençlerbirliği'),

    -- Hull City
    ('hidemasa-morita', 'Hidemasa Morita', 'CM', 78, 36, '#ff8f00', 'Hull City'),

    -- Independiente
    ('chimy-avila', 'Chimy Ávila', 'ST', 73, 15, '#d9252a', 'Independiente'),

    -- Internacional
    ('guillermo-maripan', 'Guillermo Maripán', 'CB', 74, 18, '#d9252a', 'Internacional'),

    -- İstanbul Başakşehir
    ('andreas-skov-olsen', 'Andreas Skov Olsen', 'RW', 76, 26, '#ff8f00', 'İstanbul Başakşehir'),

    -- Liverpool
    ('kostas-tsimikas', 'Kostas Tsimikas', 'LB', 76, 26, '#d9252a', 'Liverpool'),

    -- Molde
    ('mathias-lovik', 'Mathias Løvik', 'LB', 75, 22, '#1355a0', 'Molde'),

    -- Monza
    ('michael-folorunsho', 'Michael Folorunsho', 'CM', 74, 18, '#d9252a', 'Monza'),

    -- Neom
    ('malang-sarr', 'Malang Sarr', 'CB', 74, 18, '#111111', 'Neom'),

    -- Pachuca
    ('salomon-rondon', 'Salomón Rondón', 'ST', 73, 15, '#1355a0', 'Pachuca'),

    -- Palermo
    ('mamadou-coulibaly', 'Mamadou Coulibaly', 'CM', 72, 13, '#ff8fb1', 'Palermo'),

    -- Panathinaikos
    ('inaki-pena', 'Iñaki Peña', 'GK', 76, 26, '#35d06a', 'Panathinaikos'),

    -- Queens Park Rangers
    ('dennis-cirkin', 'Dennis Cirkin', 'LB', 72, 13, '#1355a0', 'Queens Park Rangers'),

    -- Racing Club
    ('valentin-carboni', 'Valentín Carboni', 'CAM', 74, 18, '#7bb8ff', 'Racing Club'),

    -- Red Bull Salzburg
    ('haris-tabakovic', 'Haris Tabaković', 'ST', 74, 18, '#e62b3f', 'Red Bull Salzburg'),

    -- Rizespor
    ('yahia-fofana', 'Yahia Fofana', 'GK', 74, 18, '#35d06a', 'Rizespor'),

    -- Rosario Central
    ('angel-di-maria', 'Ángel Di María', 'RW', 78, 36, '#f2c94c', 'Rosario Central'),

    -- Sanfrecce Hiroshima
    ('takuma-asano', 'Takuma Asano', 'RW', 74, 18, '#35d06a', 'Sanfrecce Hiroshima'),

    -- Santos
    ('neymar', 'Neymar', 'LW', 80, 48, '#ffffff', 'Santos'),

    -- Southampton
    ('aaron-ramsdale', 'Aaron Ramsdale', 'GK', 78, 36, '#d9252a', 'Southampton'),

    -- Spartak Moscow
    ('christopher-wooh', 'Christopher Wooh', 'CB', 73, 15, '#d9252a', 'Spartak Moscow'),

    -- Teplice
    ('ladislav-krejci', 'Ladislav Krejčí', 'CB', 76, 26, '#35d06a', 'Teplice'),

    -- Toluca
    ('federico-vinas', 'Federico Viñas', 'ST', 72, 13, '#d9252a', 'Toluca'),

    -- Utrecht
    ('kevin-paredes', 'Kevin Paredes', 'LW', 72, 13, '#d9252a', 'Utrecht'),

    -- Vancouver Whitecaps
    ('thomas-muller', 'Thomas Müller', 'CAM', 78, 36, '#1355a0', 'Vancouver Whitecaps'),

    -- Viktoria Plzeň
    ('denis-vavro', 'Denis Vavro', 'CB', 74, 18, '#1355a0', 'Viktoria Plzeň')
), calculated as (
  select slug, name, position, overall, price, accent, club,
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
insert into player_catalog (slug, name, position, overall, price, attributes, accent, club)
select slug, name, position, overall, price, attributes, accent, club from calculated
on conflict (slug) do nothing;

-- Norske spillere skal ligge over FC-ratingen sin. De nye kortene over har allerede fått
-- +3; her får de eksisterende norske kortene samme løft. Nusa er utelatt fordi han
-- allerede ble løftet til 83 i 0016. Målverdiene er faste, så migrasjonen kan kjøres på nytt.
with boost (slug, overall, price) as (
  values
    ('haaland', 94, 320),
    ('odegaard', 91, 260),
    ('ajer', 79, 42),
    ('ryerson', 79, 42),
    ('sander-berge', 80, 48),
    ('aursnes', 81, 56),
    ('patrick-berg', 77, 30),
    ('thorsby', 78, 36),
    ('nypan', 75, 22),
    ('oscar-bobb', 78, 36),
    ('strand-larsen', 81, 56),
    ('alexander-sorloth', 87, 165)
), targets as (
  select catalog.id, boost.overall, boost.price, boost.overall - catalog.overall as delta
  from player_catalog as catalog
  join boost on boost.slug = catalog.slug
  where catalog.overall < boost.overall
)
update player_catalog as catalog
set overall = targets.overall,
    price = greatest(catalog.price, targets.price),
    attributes = (
      select jsonb_object_agg(key, least(99, greatest(20, value::int + targets.delta)))
      from jsonb_each_text(catalog.attributes)
    )
from targets
where catalog.id = targets.id;

-- Kort brukerne allerede eier får den nye ratingen, som for Nusa i 0016.
update manager_cards
set overall = catalog.overall,
    attributes = catalog.attributes
from player_catalog as catalog
where manager_cards.catalog_id = catalog.id
  and catalog.slug in ('haaland', 'odegaard', 'ajer', 'ryerson', 'sander-berge', 'aursnes', 'patrick-berg', 'thorsby', 'nypan', 'oscar-bobb', 'strand-larsen', 'alexander-sorloth')
  and manager_cards.overall is distinct from catalog.overall;
