# Arenaer i AI-sesongen og hvordan AI-en blir vanskeligere

Mange managere hadde nådd divisjon 1–3, og AI-sesongen trengte mer å klatre i. Vi la til fem arenaer med ti divisjoner hver, som i Clash Royale, der vinneren av divisjon 1 går til neste arena og divisjon 10 er gulvet i hver arena. Det vanskelige var hvordan AI-en skal bli bedre når ratingen stopper på 99 og AI-favoritten i divisjon 1 allerede lå på 99.

Vi valgte at AI-ratingen ikke er det eneste som skiller arenaene. Fra arena 2 er AI-klubbene jevnere (mindre avstand mellom svakeste og beste klubb), de har en skjult styrkebonus i kampmodellen (+1 til +4) som ikke vises som rating, og AI-spillerne kan være opptil 99. Et alternativ var å strekke den gamle kurven over alle 50 divisjonene, men da ble hvert steg nesten umerkelig.

Simulering med den ekte kampmotoren viste at kurven fra før (divisjon 1 = 94, favoritt 99) var nesten umulig å vinne: det beste kortet i katalogen er 92, og det beste mulige laget har snitt rundt 89. Derfor ble AI-ratingen trukket ned og fordelt over arenaene: 58–84, 82–87, 86–90, 88–94 og 91–97. Sesonger som pågikk, fikk de nye ratingene. Med skjult bonus på toppen er Old Trafford og Camp Nou svært vanskelige med dagens katalog. Det er bevisst, men tallene ligger samlet i `src/lib/arenas.ts` og migrering 0062, så de kan justeres når katalogen og spesialkortene gjør lagene bedre.
