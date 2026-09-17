---
name: commit-push
description: Commit og push endringene dine med en AI-foreslatt commit-melding du kan godkjenne eller endre. Bruk når brukeren ber om å committe og pushe, eller sier "/commit-push".
---

# Commit og push

Følg stegene i rekkefølge.

## Steg 1: Sjekk hvilken branch du står på

```
git branch --show-current
```

Hvis det er `main`: varsle brukeren tydelig om at han er i ferd med å committe
rett på `main`, som bryter med den vanlige flyten (feature branch -> PR).
Spør (AskUserQuestion) om han vil fortsette likevel eller avbryte. Avbryter
han: stopp helt, ikke gjør noen git-endringer. Fortsetter han: gå videre til
steg 2. Er han på en feature-branch: gå rett til steg 2, ingen advarsel
nødvendig.

## Steg 2: Vis status og be om bekreftelse på hvilke filer som skal med

```
git status
git diff
```

Se gjennom hva som er endret/nytt. Lag en kort oppsummering på vanlig norsk
(ikke lim inn rå git-output) av hvilke filer som er endret og hva slags
endring det ser ut til å være. Spør brukeren (AskUserQuestion, med
"Alle filene" som anbefalt valg) om han vil legge til alle disse filene, eller
om noen skal holdes utenfor (be ham i så fall liste hvilke). Legg spesielt
merke til filer som ofte er lokale/ikke-relevante for selve funksjonen (f.eks.
`.claude/launch.json`, låsefiler som bare har versjonsoppdateringer uten
reell sammenheng med endringen) - nevn dem eksplisitt i oppsummeringen slik at
brukeren får ta et bevisst valg, i stedet for å anta at de skal med.

Kjør deretter `git add <bekreftede filer>` (aldri `git add -A` blindt - bruk
alltid den bekreftede fillisten).

Hvis det ikke er noen endringer i det hele tatt: si ifra og stopp - ingenting
å committe.

## Steg 3: Foreslå en commit-melding

Basert på diffen fra steg 2, skriv en kort, beskrivende commit-melding på
norsk (fritekst, ingen fast prefix-konvensjon som "feat:"/"fix:" - teamet har
valgt å holde dette fritt foreløpig). Meldingen skal beskrive HVA som endret
seg, kort og konkret - ikke en generisk frase som "oppdater kode".

Spør brukeren med AskUserQuestion, med det foreslåtte forslaget som første
(anbefalte) valg, og la ham skrive sin egen melding via "Other" hvis han vil
noe annet.

## Steg 4: Commit

```
git commit -m "<godkjent/egen melding>"
```

Husk attribution-linjen (Co-Authored-By) hvis det er satt opp som standard i
denne økten.

## Steg 5: Push

Sjekk om branchen allerede har en upstream:
```
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

- Har den upstream: `git push`
- Har den IKKE upstream (vanlig for en helt ny branch): `git push -u origin <branch>`

## Steg 6: Bekreft

Fortell brukeren kort hva som ble committet (meldingen) og at det er pushet
til GitHub. Ikke opprett en PR automatisk - det gjøres fortsatt manuelt på
GitHub sin nettside, som avklart tidligere.
