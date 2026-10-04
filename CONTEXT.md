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
En sesong der tabellen består av deg og venner som spiller managerkarrieren sammen; alle kampene er mot hverandre, ikke mot AI. Med 10 eller færre managere spilles det **dobbel serie** (alle møter alle hjemme og borte), med flere møtes alle én gang. Under 5 managere får bare vinneren premie, 5–6 gir premie til topp 2, og 7 eller flere til topp 3.
_Avoid_: Liga, Turnering (Turnering er noe annet, se over)

**Divisjon**:
Et av 10 vanskelighetsnivåer i AI-sesongen (Divisjon 10 lavest, Divisjon 1 høyest), der AI-troppenes samlede rating skaleres opp jo høyere divisjon. Etter en AI-sesong rykker topp 2 opp i divisjon 10–7 og bare vinneren i divisjon 6–2; plassen rett under spiller **kvalik**. De to nederste rykker ned, unntatt i divisjon 10. Belønningen for opprykk øker jo høyere divisjonen du rykker opp til er.
_Avoid_: Nivå (brukes om klubbnivå/XP, som er noe annet), Liga

**Kvalik**:
Én ekstra kamp etter en AI-sesong for den som havner rett under opprykksplassene, mot en klubb fra divisjonen over. Kampen må ha en vinner, og bare seier gir opprykk. Den teller ikke i tabellen.
_Avoid_: Playoff, Omspill


**SBC**:
En utfordring i Managerkarrieren der du leverer inn et bestemt antall kort som oppfyller kravene (f.eks. snitt-rating eller antall fra én liga) og får en premie i MB eller pakker. Kortene du leverer er borte for alltid. SBC-er med begrenset antall forsøk nullstilles hver fredag kl. 18:00 norsk tid. Heter «SBC» på alle språk.
_Avoid_: Oppdrag, Utfordring alene (tvetydig med vennekamp-utfordringer), Kjemi (finnes ikke i appen)

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
