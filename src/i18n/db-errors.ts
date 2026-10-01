import type { Dictionary } from "./dictionaries";

// Feilmeldingene fra databasefunksjonene (raise exception) er skrevet på norsk i SQL-en.
// Her kobles hver av dem til en oversatt tekst i t.dbErrors. Tall og navn i meldingen fanges
// med grupper i mønsteret og sendes videre til teksten.
// Ny raise exception i en migrering? Legg til en regel her, og kjør `npm run check:db-errors`.
type DbErrorRule = { pattern: RegExp; message: (t: Dictionary, ...values: string[]) => string };

// Ingen av meldingene inneholder kolon, så de overlever også `stripPrefix` i dbErrorMessage uendret.
export const DB_ERROR_RULES: DbErrorRule[] = [
  { pattern: /^Fant ikke denne SBC-en$/, message: (t) => t.dbErrors.sbcNotFound },
  { pattern: /^Fantasy-laget må ha 15 spillere fra denne sesongen$/, message: (t) => t.dbErrors.fantasyTeamSize },
  { pattern: /^Laget er for dyrt$/, message: (t) => t.dbErrors.fantasyTooExpensive },
  { pattern: /^Laget kan ikke endres før Free Hit-runden er ferdig$/, message: (t) => t.dbErrors.fantasyFreeHitActive },
  { pattern: /^Du har ikke noe fantasy-lag ennå$/, message: (t) => t.dbErrors.fantasyNoTeam },
  { pattern: /^Ukjent chip$/, message: (t) => t.dbErrors.fantasyUnknownChip },
  { pattern: /^Wildcard og Free Hit kan brukes fra andre runde laget er med$/, message: (t) => t.dbErrors.fantasyChipTooEarly },
  { pattern: /^Denne chipen er allerede brukt i denne halvdelen av sesongen$/, message: (t) => t.dbErrors.fantasyChipUsed },
  { pattern: /^Du har ikke flere forsøk igjen på denne SBC-en denne uken$/, message: (t) => t.dbErrors.sbcNoAttemptsLeft },
  { pattern: /^Velg riktig antall kort til SBC-en$/, message: (t) => t.dbErrors.sbcWrongCardCount },
  { pattern: /^Noen av kortene kan ikke brukes i en SBC$/, message: (t) => t.dbErrors.sbcCardsNotUsable },
  { pattern: /^Kortene oppfyller ikke kravene til SBC-en$/, message: (t) => t.dbErrors.sbcRequirementsNotMet },
  { pattern: /^Academy-kort kan ikke kastes$/, message: (t) => t.dbErrors.academyCannotDiscard },
  { pattern: /^Academy-kort kan ikke selges$/, message: (t) => t.dbErrors.academyCannotSell },
  { pattern: /^Annonsen er ikke aktiv$/, message: (t) => t.dbErrors.listingNotActive },
  { pattern: /^Bare den som opprettet sesongen kan starte den$/, message: (t) => t.dbErrors.onlyCreatorCanStart },
  { pattern: /^Bare mottakeren kan foreslå ny pris$/, message: (t) => t.dbErrors.onlyRecipientCanCounter },
  { pattern: /^Bare selgerens venner kan by$/, message: (t) => t.dbErrors.onlySellerFriendsCanBid },
  { pattern: /^Bare selgerens venner kan kjøpe$/, message: (t) => t.dbErrors.onlySellerFriendsCanBuy },
  {
    pattern: /^Budet må være høyere enn gjeldende bud og lavere enn kjøp nå-prisen$/,
    message: (t) => t.dbErrors.bidOutOfRange,
  },
  { pattern: /^Både troppen og lageret er fullt$/, message: (t) => t.dbErrors.squadAndStorageFull },
  { pattern: /^Dere er ikke lenger venner$/, message: (t) => t.dbErrors.noLongerFriends },
  { pattern: /^Du eier allerede dette kortet$/, message: (t) => t.dbErrors.alreadyOwnCard },
  { pattern: /^Du eier ikke dette kortet$/, message: (t) => t.dbErrors.notYourCard },
  {
    pattern: /^Du har duplikater som må selges eller kastes før du åpner en ny pakke$/,
    message: (t) => t.dbErrors.duplicatesBeforePack,
  },
  {
    pattern: /^Du har ikke plass til (\d+) kort\. Selg eller kast kort først$/,
    message: (t, count) => t.dbErrors.noRoomForCards(count),
  },
  { pattern: /^Du har ingen gratis pakker av denne typen$/, message: (t) => t.dbErrors.noFreePacks },
  { pattern: /^Du kan bare sende tilbud til venner$/, message: (t) => t.dbErrors.offersOnlyToFriends },
  { pattern: /^Du kan ha maks (\d+) kort ute samtidig$/, message: (t, max) => t.dbErrors.listingLimit(max) },
  { pattern: /^Du kan ha maksimalt 7 på benken$/, message: (t) => t.dbErrors.benchMaxSeven },
  { pattern: /^Du kan ikke by på eget kort$/, message: (t) => t.dbErrors.cannotBidOwnCard },
  { pattern: /^Du kan ikke kjøpe eget kort$/, message: (t) => t.dbErrors.cannotBuyOwnCard },
  { pattern: /^Du kan ikke sende tilbud til deg selv$/, message: (t) => t.dbErrors.cannotOfferSelf },
  { pattern: /^Du kan ikke svare på dette tilbudet$/, message: (t) => t.dbErrors.cannotAnswerOffer },
  { pattern: /^Du må ha nøyaktig 7 på benken$/, message: (t) => t.dbErrors.benchExactlySeven },
  {
    pattern: /^Du sender for mange meldinger\. Vent litt før du skriver igjen\.$/,
    message: (t) => t.dbErrors.tooManyMessages,
  },
  { pattern: /^Elleveren og benken må ligge i troppen$/, message: (t) => t.dbErrors.lineupMustBeInSquad },
  { pattern: /^En spiller kan bare velges én gang$/, message: (t) => t.dbErrors.playerPickedOnce },
  { pattern: /^Fant ikke managerprofilen$/, message: (t) => t.dbErrors.managerProfileNotFound },
  { pattern: /^Ikke nok managerbudsjett$/, message: (t) => t.dbErrors.notEnoughBudget },
  { pattern: /^Katalogen har ikke nok kort til denne pakken$/, message: (t) => t.dbErrors.catalogTooSmall },
  { pattern: /^Kjøperen har ikke nok managerbudsjett$/, message: (t) => t.dbErrors.buyerNotEnoughBudget },
  { pattern: /^Kjøperens tropp er full$/, message: (t) => t.dbErrors.buyerSquadFull },
  { pattern: /^Kjøperens tropp og lager er fullt$/, message: (t) => t.dbErrors.buyerSquadAndStorageFull },
  {
    pattern: /^Kortet er allerede solgt eller annonsen er utløpt$/,
    message: (t) => t.dbErrors.cardSoldOrExpired,
  },
  { pattern: /^Kortet er ikke lenger tilgjengelig$/, message: (t) => t.dbErrors.cardNoLongerAvailable },
  { pattern: /^Kortet er ikke tilgjengelig$/, message: (t) => t.dbErrors.cardNotAvailable },
  { pattern: /^Kortet har allerede fått ny eier$/, message: (t) => t.dbErrors.cardAlreadyNewOwner },
  { pattern: /^Kortet har et aktivt overgangstilbud$/, message: (t) => t.dbErrors.cardHasActiveOffer },
  { pattern: /^Kortet har ingen markedsverdi$/, message: (t) => t.dbErrors.cardNoMarketValue },
  { pattern: /^Kortet ligger allerede ute$/, message: (t) => t.dbErrors.cardAlreadyListed },
  { pattern: /^Kortet ligger ute på markedet$/, message: (t) => t.dbErrors.cardOnMarket },
  { pattern: /^Lageret er fullt \(maks (\d+) kort\)$/, message: (t, max) => t.dbErrors.storageFull(max) },
  { pattern: /^Meldingen kan være maks 300 tegn$/, message: (t) => t.dbErrors.messageTooLong },
  { pattern: /^Minst to managere må ha blitt med$/, message: (t) => t.dbErrors.needTwoManagers },
  { pattern: /^Pakken finnes ikke$/, message: (t) => t.dbErrors.packNotFound },
  {
    pattern: /^Prisen må være mellom (\d+) og (\d+) managerbudsjett$/,
    message: (t, low, high) => t.dbErrors.priceRange(low, high),
  },
  { pattern: /^Sesongen er allerede i gang$/, message: (t) => t.dbErrors.seasonAlreadyStarted },
  { pattern: /^Skriv en melding først$/, message: (t) => t.dbErrors.writeMessageFirst },
  {
    pattern: /^Spillere på (\d+) eller bedre finnes bare i pakker og på overgangsmarkedet$/,
    message: (t, overall) => t.dbErrors.catalogOverallLimit(overall),
  },
  {
    pattern: /^Ta kortet av overgangsmarkedet før du sender et direkte tilbud$/,
    message: (t) => t.dbErrors.removeListingBeforeOffer,
  },
  { pattern: /^Tilbudet er ikke lenger aktivt$/, message: (t) => t.dbErrors.offerNoLongerActive },
  { pattern: /^Tilbudet har utløpt$/, message: (t) => t.dbErrors.offerExpired },
  { pattern: /^Troppen din er full$/, message: (t) => t.dbErrors.yourSquadFull },
  {
    pattern: /^Troppen er full \(maks (\d+) kort\)\. Bytt ut en spiller i stedet$/,
    message: (t, max) => t.dbErrors.squadFullSwap(max),
  },
  { pattern: /^Troppen er full \(maks 18 spillere\)$/, message: (t) => t.dbErrors.squadFullEighteen },
  { pattern: /^Troppen inneholder et kort du ikke eier$/, message: (t) => t.dbErrors.squadHasUnownedCard },
  { pattern: /^Troppen og lageret ditt er fullt$/, message: (t) => t.dbErrors.yourSquadAndStorageFull },
  { pattern: /^Troppen tar maks (\d+) kort$/, message: (t, max) => t.dbErrors.squadCapacity(max) },
  { pattern: /^Ugyldig formasjon$/, message: (t) => t.dbErrors.invalidFormation },
  { pattern: /^Ugyldig plassering$/, message: (t) => t.dbErrors.invalidPosition },
  { pattern: /^Ugyldig svar$/, message: (t) => t.dbErrors.invalidAnswer },
  { pattern: /^Ukjent rolle$/, message: (t) => t.dbErrors.unknownRole },
  { pattern: /^Unknown career record column$/, message: (t) => t.dbErrors.unknownCareerColumn },
  { pattern: /^Velg 1, 6 eller 24 timer$/, message: (t) => t.dbErrors.chooseDuration },
  { pattern: /^Velg et kort fra lageret$/, message: (t) => t.dbErrors.pickFromStorage },
  { pattern: /^Velg et kort fra troppen$/, message: (t) => t.dbErrors.pickFromSquad },
  { pattern: /^Velg nøyaktig 11 startspillere$/, message: (t) => t.dbErrors.pickElevenStarters },
  { pattern: /^Velg to forskjellige kort$/, message: (t) => t.dbErrors.pickTwoDifferentCards },
  { pattern: /^Vent på at vennen din svarer$/, message: (t) => t.dbErrors.waitForFriend },
];

// Meldinger uten regel (f.eks. tekniske Postgres-feil) vises som de er.
export function translateDbError(message: string, t: Dictionary): string {
  const text = message.trim();
  for (const rule of DB_ERROR_RULES) {
    const found = rule.pattern.exec(text);
    if (found) return rule.message(t, ...found.slice(1));
  }
  return message;
}
