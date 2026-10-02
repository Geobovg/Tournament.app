// Draktene på fantasy-kortene, som i Premier League Fantasy: hjemmedrakt for utespillere og
// keeperdrakt for keepere. Bildene hentes med scripts/fantasy-kits.ts til public/fantasy-kits.
// Ingen importer, så skriptet kan bruke fila.

// «Atlético Madrid» blir «atletico-madrid». Filnavnene til draktene bygges av dette.
export function kitSlug(clubName: string) {
  return clubName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ø/gi, "o").replace(/æ/gi, "ae").replace(/ß/g, "ss")
    .toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
