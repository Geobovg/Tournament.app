---
name: ny-funksjon
description: Start en ny funksjon riktig - synker main med GitHub og oppretter en ny feature-branch med riktig navneformat (navn/beskrivelse). Bruk når brukeren ber om å starte/lage en ny funksjon, en ny branch, eller sier "/ny-funksjon".
---

# Start ny funksjon

Denne skillen automatiserer steg 1-2 fra teamets git/PR-guide: sørge for at man
starter rent fra en oppdatert `main`, og deretter opprette riktig navngitt
feature-branch. Følg stegene i rekkefølge. Ikke hopp over sjekkene, selv om
working tree ser rent ut - kjør dem likevel, det er billig og trygt.

## Steg 1: Sjekk om working tree er rent

Kjør:
```
git status --porcelain
git branch --show-current
```

Hvis nåværende branch ikke er `main`, sjekk også om den har commits som ikke
er pushet eller ikke er del av `main` ennå:
```
git log main..HEAD --oneline
```
(bruk `origin/<branch>..HEAD` i stedet hvis branchen har en upstream, for å
fange opp lokale commits som ikke er pushet)

**Hvis alt er tomt** (ingen endringer, ingen ekstra commits): fortsett til
steg 2 uten å spørre om noe.

**Hvis det er ulagrede endringer og/eller upushede commits:** lag en kort,
enkel oppsummering på vanlig norsk (IKKE bare lim inn rå git-output) - f.eks.
"Du har ulagrede endringer i 2 filer (`page.tsx`, `styles.css`), og 1 commit
som ikke er pushet på branchen `henrik/gammel-ting`." Spør deretter brukeren
(bruk AskUserQuestion) hva han vil gjøre, med disse valgene:

- **Stash endringene** - ulagrede endringer legges til side med
  `git stash push -u -m "<kort beskrivelse>"` slik at de ikke går tapt. De
  blir liggende i stash til brukeren selv henter dem tilbake senere med
  `git stash pop` (skillen popper dem IKKE automatisk inn i den nye
  branchen - det er brukerens eget valg når han vil fortsette på det gamle).
  Committede-men-upushede commits rører vi ikke her - de bor trygt på den
  gamle branchen og håndteres i steg 2.
- **Forkast endringene** - kun de ulagrede endringene fjernes permanent
  (`git checkout -- .` for sporede filer + `git clean -fd` for usporede).
  Dette er destruktivt for de ulagrede endringene - vær eksplisitt om det i
  spørsmålet, ikke bare skriv "forkast". Committede commits på branchen
  rører vi fortsatt ikke her.
- **Avbryt** - stopp skillen helt, ikke gjør noen git-endringer.

## Steg 2: Bytt til main

Husk hvilken branch du kom fra (fra steg 1). Kjør:
```
git checkout main
```

Gi brukeren en kort infomelding, f.eks. "Byttet fra `henrik/gammel-ting` til
main." (kun hvis forrige branch ikke var main - ikke si noe hvis brukeren
allerede sto på main).

Hvis forrige branch ikke var `main`: spør brukeren (AskUserQuestion) om han
vil slette den gamle branchen nå. Sjekk først om den er merget:
```
git branch --merged main
```
- Er den i lista (merget): trygg sletting med `git branch -d <branch>`.
- Er den IKKE i lista (ikke merget/ikke pushet ferdig): vær eksplisitt i
  spørsmålet om at branchen har endringer som ikke er inne i main ennå, og
  bruk `git branch -D <branch>` kun ved et klart, eksplisitt ja.
- Svarer brukeren nei: ikke slett noe, bare fortsett.

## Steg 3: Synk main med GitHub

```
git pull
```

## Steg 4: Spør om funksjonen

Spør brukeren i vanlig chat (ikke AskUserQuestion - fritekst) om en kort
beskrivelse av funksjonen han skal jobbe med.

## Steg 5: Lag branch-navnet

**Navn-del:** bruk lokal-delen av e-posten til den innloggede Claude-brukeren
i denne økten (f.eks. `henrik@bovg.no` -> `henrik`), lowercased.

**Beskrivelse-del:** oversett det brukeren skrev til en kort kebab-case-slug:
- lowercase alt
- transliterer norske tegn: æ->ae, ø->o, å->a
- fjern alt som ikke er `a-z`, `0-9` eller mellomrom/bindestrek
- mellomrom -> bindestrek, slå sammen gjentatte bindestreker
- korte ned til ca. 4-5 ord / maks ~40 tegn, behold meningen

Eksempel: "Legg til støtte for å bytte bakgrunnsfarge på turneringskort" ->
`bytte-bakgrunnsfarge-turneringskort`

Fullt branch-navn: `<navn>/<beskrivelse>`, f.eks. `henrik/bytte-bakgrunnsfarge-turneringskort`.

## Steg 6: Sjekk kollisjon

```
git branch --list <navn>/<beskrivelse>
git ls-remote --heads origin <navn>/<beskrivelse>
```

Hvis branchen allerede finnes (lokalt eller på GitHub): **ikke** finn på et
nytt navn selv (f.eks. med `-2`) - stopp og forklar situasjonen til
brukeren, la ham bestemme (skrive en annen beskrivelse, eller undersøke den
eksisterende branchen).

## Steg 7: Opprett og bytt til branchen

```
git checkout -b <navn>/<beskrivelse>
```

Bekreft til slutt kort: hvilken branch han nå står på, og at den ble
opprettet fra oppdatert main. Ikke push branchen automatisk - det er neste
steg i den vanlige arbeidsflyten, ikke denne skillens jobb.
