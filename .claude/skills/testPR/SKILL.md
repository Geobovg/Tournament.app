---
name: testPR
description: Test en kollegas PR lokalt - bytter branch trygt, installerer avhengigheter og starter appen i browser-forhåndsvisningen. Bruk når brukeren ber om å teste en PR/branch fra en kollega, eller sier "/testPR".
---

# Test en PR

Følg stegene i rekkefølge.

## Steg 1: Sjekk om working tree er rent

Samme sjekk og logikk som i `ny-funksjon`-skillen:

```
git status --porcelain
git branch --show-current
```

Hvis nåværende branch ikke er `main`, sjekk også committede-men-upushede
commits (`git log origin/<branch>..HEAD --oneline` eller `main..HEAD` uten
upstream).

Er alt tomt: fortsett til steg 2. Er det ulagrede endringer og/eller
upushede commits: oppsummer kort på vanlig norsk, og spør brukeren
(AskUserQuestion) om å **stashe** (`git stash push -u -m "..."`, hentes
tilbake manuelt senere), **forkaste** (kun ulagrede endringer -
`git checkout -- .` + `git clean -fd`), eller **avbryte** (stopp helt).

## Steg 2: Sørg for at gh CLI er tilgjengelig

```
gh --version
```

**Hvis den finnes:** gå til steg 3.

**Hvis den ikke finnes:** informer kort ("gh CLI mangler, installerer via
winget..."), kjør deretter:
```
winget install --id GitHub.cli -e --silent
```
Prøv `gh --version` på nytt. Virker det fortsatt ikke (PATH kan henge etter
en fersk installasjon i samme terminaløkt), prøv full filsti direkte, typisk:
```
"C:\Program Files\GitHub CLI\gh.exe" --version
```
Fungerer heller ikke det: gi opp gh for denne kjøringen og gå til
**steg 3b (manuell variant)** i stedet - ikke la installasjonsproblemer
stoppe hele skillen.

## Steg 3: Sjekk innlogging og velg PR

```
gh auth status
```

**Hvis ikke innlogget:** kjør `gh auth login` og la brukeren fullføre
innlogging i nettleseren som åpnes. Vent til den er ferdig før du går videre.

**Hent åpne PR-er fra andre** (ikke dine egne):
```
gh pr list --state open --search "-author:@me" --json number,title,headRefName
```
Presenter dem for brukeren (AskUserQuestion) som "PR #<nummer>: <tittel>"
slik at han kan velge én. Er lista tom: si ifra at det ikke finnes åpne
PR-er fra andre å teste, og stopp.

Når brukeren har valgt:
```
gh pr checkout <nummer>
```
(dette gjør fetch + checkout av riktig branch automatisk) - gå til steg 4.

### Steg 3b: Manuell variant (hvis gh ikke er tilgjengelig)

Spør brukeren direkte (vanlig fritekst) hvilken branch han vil teste. Kjør
deretter:
```
git fetch
git checkout <branch>
```

## Steg 4: Installer avhengigheter

```
npm install
```
Kjør alltid dette steget, selv om det ser ut som ingenting har endret seg -
PR-en kan ha lagt til nye avhengigheter.

## Steg 5: Start appen og vis den

Start dev-serveren og åpne den automatisk i Claude sin innebygde
Browser-pane (bruk `preview_start` med prosjektets launch-konfigurasjon, og
naviger til siden som er relevant for det som skal testes). Ikke bare skriv
kommandoen og stopp - vis faktisk appen kjørende slik at brukeren (eller du,
på brukerens vegne) kan se den med en gang.

## Steg 6: Spør om godkjenning

Når brukeren har fått sett/testet funksjonen, spør (AskUserQuestion) om han
godkjenner eller avviser PR-en. Uansett svar: minn ham om å signalisere
resultatet i Teams Planner (kanban-tavlen), siden det ikke kan gjøres
automatisk herfra.
