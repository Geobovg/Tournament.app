/**
 * Klubbmerker for spillerkortene i managerkarriere.
 *
 * Bildene ligger i public/crests og er hentet fra TheSportsDB. Merkene er
 * klubbenes egne varemerker og brukes her kun for å identifisere klubben.
 * Klubber uten merke faller tilbake til et nøytralt ikon på kortet.
 */
const crests: Record<string, string> = {
  "AC Milan": "/crests/ac-milan.png",
  "AFC Bournemouth": "/crests/afc-bournemouth.png",
  "Ajax": "/crests/ajax.png",
  "Al-Diriyah": "/crests/al-diriyah.png",
  "Al-Hilal": "/crests/al-hilal.png",
  "Al-Ittihad": "/crests/al-ittihad.png",
  "Al-Nassr": "/crests/al-nassr.png",
  "Al-Qadsiah": "/crests/al-qadsiah.png",
  "Arsenal": "/crests/arsenal.png",
  "Aston Villa": "/crests/aston-villa.png",
  "Athletic Club": "/crests/athletic-club.png",
  "Atlético Madrid": "/crests/atletico-madrid.png",
  "Barcelona": "/crests/barcelona.png",
  "Bayer Leverkusen": "/crests/bayer-leverkusen.png",
  "Bayern München": "/crests/bayern-munchen.png",
  "Benfica": "/crests/benfica.png",
  "Beşiktaş": "/crests/besiktas.png",
  "Bodø/Glimt": "/crests/bodo-glimt.png",
  "Bologna": "/crests/bologna.png",
  "Borussia Dortmund": "/crests/borussia-dortmund.png",
  "Brentford": "/crests/brentford.png",
  "Chelsea": "/crests/chelsea.png",
  "Chicago Fire": "/crests/chicago-fire.png",
  "Club Brugge": "/crests/club-brugge.png",
  "Como": "/crests/como.png",
  "Cremonese": "/crests/cremonese.png",
  "Crystal Palace": "/crests/crystal-palace.png",
  "Deportivo La Coruña": "/crests/deportivo-la-coruna.png",
  "Everton": "/crests/everton.png",
  "FC Porto": "/crests/fc-porto.png",
  "Fenerbahçe": "/crests/fenerbahce.png",
  "Fulham": "/crests/fulham.png",
  "Galatasaray": "/crests/galatasaray.png",
  "Inter": "/crests/inter.png",
  "Inter Miami": "/crests/inter-miami.png",
  "Juventus": "/crests/juventus.png",
  "LAFC": "/crests/lafc.png",
  "Lazio": "/crests/lazio.png",
  "Leeds United": "/crests/leeds-united.png",
  "Liverpool": "/crests/liverpool.png",
  "Lommel SK": "/crests/lommel-sk.png",
  "Lyon": "/crests/lyon.png",
  "Manchester City": "/crests/manchester-city.png",
  "Manchester United": "/crests/manchester-united.png",
  "Napoli": "/crests/napoli.png",
  "Newcastle United": "/crests/newcastle-united.png",
  "Nottingham Forest": "/crests/nottingham-forest.png",
  "Orlando City": "/crests/orlando-city.png",
  "Paris Saint-Germain": "/crests/paris-saint-germain.png",
  "RB Leipzig": "/crests/rb-leipzig.png",
  "Real Betis": "/crests/real-betis.png",
  "Real Madrid": "/crests/real-madrid.png",
  "SC Braga": "/crests/sc-braga.png",
  "Tottenham Hotspur": "/crests/tottenham-hotspur.png",
  "Trabzonspor": "/crests/trabzonspor.png",
  "Valencia": "/crests/valencia.png",
};

export function clubCrest(club: string): string | null {
  return crests[club] ?? null;
}
