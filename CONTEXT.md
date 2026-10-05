# Futebol

En app for å holde styr på en simulert fotball-managerkarriere med spillerkort, og separat på egne EA FC/NHL-turneringer venner spiller mot hverandre.

## Language

**Managerkarriere**:
Den kortbaserte modusen der du bygger en tropp av spillerkort, kjøper/selger på overgangsmarkedet, åpner pakker og spiller simulerte kamper mot venners tropper. Alt skjer inne i appen.
_Avoid_: Karriere alene (tvetydig med Turnering)

**Markedschat**:
Én felles samtale på overgangsmarkedet der alle managere kan skrive og lese, og der hver melding vises med brukernavnet til den som skrev den.
_Avoid_: Annonsetråd, privatmelding (det er noe annet enn direkte overgangstilbud mellom venner)

**Turnering**:
En serie ekte EA FC- eller NHL-kamper som venner spiller på selve spillkonsollen/PC-en, der appen kun brukes til å registrere resultatene og holde oversikt (kamplogg, tabell). Appen simulerer ikke disse kampene.
_Avoid_: Karriere, Manager-turnering

**Sesong**:
En avgrenset periode i Managerkarrieren med en tabell og et sluttresultat/premie. Finnes i to varianter, se **AI-sesong** og **Vennesesong**.
_Avoid_: Liga (brukes ikke som eget begrep ennå), Karriere

**AI-sesong**:
En sesong der alle kampene spilles mot datamotstandere satt sammen av appen selv. Fungerer for én enkelt spiller uten venner. Har en **divisjon**: klarer du deg godt nok gjennom sesongen, rykker du opp til en vanskeligere divisjon neste sesong.
_Avoid_: Karrieresesong, Solo-sesong

**Vennesesong**:
En sesong der tabellen består av deg og venner som spiller managerkarrieren sammen; alle kampene er mot hverandre, ikke mot AI. Med 10 eller færre managere spilles det **dobbel serie** (alle møter alle hjemme og borte), med flere møtes alle én gang. Under 5 managere gis det ingen premie, 5–6 gir premie til topp 2, og 7 eller flere til topp 3.
_Avoid_: Liga, Turnering (Turnering er noe annet, se over)

**Arena**:
Et av fem stadioner i AI-sesongen, som i Clash Royale: Gamle Gress, Ullevaal, Wembley Stadium, Old Trafford og Camp Nou. Hver arena har ti **divisjoner**, så stigen er 50 nivåer lang. Vinner du divisjon 1, går du opp til divisjon 10 i neste arena. Du faller aldri ut av en arena du har nådd. AI-klubbene blir jevnere og får en skjult styrkebonus jo høyere arenaen er, og premiene ganges opp. Første gang du når en ny arena får du en egen belønning.
_Avoid_: Liga, Nivå, Stadion alene (Stadion er navnet, Arena er nivået)

**Divisjon**:
Et av ti vanskelighetsnivåer i hver **arena** (Divisjon 10 lavest, Divisjon 1 høyest), der AI-troppenes samlede rating skaleres opp jo høyere divisjon. Etter en AI-sesong rykker topp 2 opp i divisjon 10–7 og bare vinneren i divisjon 6–1; vinneren av divisjon 1 går til neste arena. Plassen rett under spiller **kvalik**. De to nederste rykker ned, unntatt i divisjon 10, som er gulvet i arenaen. Belønningen for opprykk øker jo høyere divisjonen du rykker opp til er.
_Avoid_: Nivå (brukes om klubbnivå/XP, som er noe annet), Liga

**Mestertittel**:
Det du får når du vinner divisjon 1 på Camp Nou, den siste arenaen. Du blir der og kan vinne flere; antallet vises på arenaveien.
_Avoid_: Mesterskap, Trofé

**Kvalik**:
Én ekstra kamp etter en AI-sesong for den som havner rett under opprykksplassene, mot en klubb fra divisjonen over (fra divisjon 1: en klubb fra divisjon 10 i neste arena). Kampen må ha en vinner, og bare seier gir opprykk. Den teller ikke i tabellen.
_Avoid_: Playoff, Omspill


**SBC**:
En utfordring i Managerkarrieren der du leverer inn et bestemt antall kort som oppfyller kravene (f.eks. snitt-rating eller antall fra én liga) og får en premie i MB eller pakker. Kortene du leverer er borte for alltid. Forsøkene kan være begrenset per dag (nullstilles kl. 18:00 norsk tid) eller per uke (fredag kl. 18:00). Heter «SBC» på alle språk.
_Avoid_: Oppdrag, Utfordring alene (tvetydig med vennekamp-utfordringer), Kjemi (finnes ikke i appen)

**Spesialkort**:
Et kort av en spiller som er bedre enn spillerens vanlige kort og har eget utseende. Det er et eget kort: du kan eie både vanlig-kortet og spesialkortet, men bare én av dem kan være i troppen, og de regnes ikke som duplikater av hverandre. Foreløpig finnes bare én type, **inform**.
_Avoid_: Spesialutgave, Event-kort

**Inform**:
Spesialkortet for en spiller som er i form denne uken, som Team of the Week i FC. Hver fredag kl. 18:00 trekkes 25 tilfeldige spillere blant topp 400 (en **inform-runde**). Kortet er 1–3 bedre, og har spilleren hatt inform før, bygger det på forrige inform. Spillere fra de to siste rundene trekkes ikke, og topp 20 kan bare få inform én gang.
_Avoid_: TOTW, Ukens lag

**Inform-pakke**:
En pakke til 800 MB som garanterer én inform fra ukens runde, og kan kjøpes én gang per uke. Vanlige pakker kan også gi inform, med liten sjanse.
_Avoid_: Spesialpakke (det er SBC-premien)

**Spesialpakke**:
Premien fra spesial-SBC-en (to kort på 88+): ett tilfeldig spesialkort blant alle som noen gang er laget. Kortet kan ikke selges på markedet. Pakken kan ikke kjøpes.
_Avoid_: Inform-pakke

**Personlig kort**:
Et kort av en ekte manager i appen, med bilde av personen selv. Hver manager kan ha ett, og bare eieren kan ha det: det kan ikke selges, byttes, leveres i SBC, kastes eller trekkes i pakker. Kortet kan spille alle posisjoner. Det starter på 80 og går opp 1 for hvert nytt nivå man når på AI-stigen; det er det høyeste nivået man har nådd som teller, så nedrykk gjør ikke kortet dårligere, og man får ingen oppgradering for å rykke opp igjen til et nivå man har vært på før. Maks 99. Kortene deles ut for hånd med `grant_personal_card` (migrering 0063).
_Avoid_: Ikon, Spesialkort (spesialkort er bedre versjoner av ekte spillere, se over)

**Fantasy**:
En egen modus utenfor Managerkarrieren, som Premier League Fantasy, men for spillere fra alle de fem store ligaene. Du velger et lag av ekte spillere innenfor et budsjett og får poeng etter hva de gjør i ekte kamper. Kampdataene hentes fra API-Football; appen simulerer ingenting her.
_Avoid_: Managerkarriere, Draft

**Liga** (i Fantasy):
En av de fem ekte ligaene spillerne hentes fra: Premier League, La Liga, Serie A, Bundesliga og Ligue 1. Hvilken liga en klubb spiller i står i `football_clubs`.
_Avoid_: Divisjon (det er AI-sesongens nivåer)

**Fantasy-liga**:
En tabell der du og venner sammenligner fantasy-poengene deres. Du blir med via invitasjonskode eller -lenke, som i turneringer.
_Avoid_: Liga alene (det er de ekte ligaene), Vennesesong

**Runde**:
Én uke i Fantasy, fra tirsdag til og med mandag (norsk tid), på tvers av alle fem ligaene, så mandagskampene avslutter helgerunden. Fristen er 90 minutter før rundens første kamp; da låses laget, og poengene for runden kommer fra alle ligakampene den uka.
_Avoid_: Gameweek, Kamp, Kalenderuke (uka starter tirsdag, ikke mandag)

**Chip**:
Et engangsvalg i Fantasy som gjelder én runde: Wildcard, Free Hit, Bench Boost eller Triple Captain. Hver kan brukes én gang i hver halvdel av sesongen.
_Avoid_: Kort (det er spillerkortene i Managerkarrieren), Bonus
