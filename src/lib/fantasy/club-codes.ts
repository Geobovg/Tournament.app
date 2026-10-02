// Korte klubbnavn til kampene på fantasy-kortene, som «ARS (H)» i Premier League Fantasy.
// Nøkkelen er navnet i football_clubs. Klubber som mangler her får de tre første bokstavene.
const codes: Record<string, string> = {
  // Premier League
  "AFC Bournemouth": "BOU", "Arsenal": "ARS", "Aston Villa": "AVL", "Brentford": "BRE", "Brighton & Hove Albion": "BHA",
  "Burnley": "BUR", "Chelsea": "CHE", "Coventry City": "COV", "Crystal Palace": "CRY", "Everton": "EVE", "Fulham": "FUL",
  "Hull City": "HUL", "Ipswich Town": "IPS", "Leeds United": "LEE", "Leicester City": "LEI", "Liverpool": "LIV",
  "Manchester City": "MCI", "Manchester United": "MUN", "Newcastle United": "NEW", "Nottingham Forest": "NFO",
  "Southampton": "SOU", "Sunderland": "SUN", "Tottenham Hotspur": "TOT", "West Ham United": "WHU", "Wolverhampton Wanderers": "WOL",
  // La Liga
  "Alavés": "ALA", "Athletic Club": "ATH", "Atlético Madrid": "ATM", "Barcelona": "BAR", "Celta Vigo": "CEL",
  "Deportivo La Coruña": "DEP", "Elche": "ELC", "Espanyol": "ESP", "Getafe": "GET", "Girona": "GIR", "Levante": "LEV",
  "Málaga": "MAL", "Mallorca": "MLL", "Osasuna": "OSA", "Racing de Santander": "RAC", "Rayo Vallecano": "RAY",
  "Real Betis": "BET", "Real Madrid": "RMA", "Real Oviedo": "OVI", "Real Sociedad": "RSO", "Sevilla": "SEV",
  "Valencia": "VAL", "Villarreal": "VIL",
  // Serie A
  "AC Milan": "MIL", "Atalanta": "ATA", "Bologna": "BOL", "Cagliari": "CAG", "Como": "COM", "Cremonese": "CRE",
  "Fiorentina": "FIO", "Frosinone": "FRO", "Genoa": "GEN", "Inter": "INT", "Juventus": "JUV", "Lazio": "LAZ",
  "Lecce": "LEC", "Monza": "MON", "Napoli": "NAP", "Parma": "PAR", "Pisa": "PIS", "Roma": "ROM", "Sassuolo": "SAS",
  "Torino": "TOR", "Udinese": "UDI", "Venezia": "VEN", "Hellas Verona": "VER",
  // Bundesliga
  "1. FC Köln": "KOE", "Augsburg": "FCA", "Bayer Leverkusen": "B04", "Bayern München": "FCB", "Borussia Dortmund": "BVB",
  "Borussia Mönchengladbach": "BMG", "Eintracht Frankfurt": "SGE", "Freiburg": "SCF", "Hamburger SV": "HSV",
  "Heidenheim": "HDH", "Hoffenheim": "TSG", "Mainz 05": "M05", "Paderborn": "SCP", "RB Leipzig": "RBL",
  "Schalke 04": "S04", "St. Pauli": "STP", "Stuttgart": "VFB", "SV Elversberg": "SVE", "Union Berlin": "FCU",
  "Werder Bremen": "SVW", "Wolfsburg": "WOB",
  // Ligue 1
  "Angers": "ANG", "Auxerre": "AUX", "Brest": "BRE", "Le Havre": "HAC", "Le Mans": "LMA", "Lens": "RCL", "Lille": "LIL",
  "Lorient": "LOR", "Lyon": "OL", "Marseille": "OM", "Metz": "MET", "Monaco": "ASM", "Nantes": "NAN", "Nice": "NIC",
  "Paris FC": "PFC", "Paris Saint-Germain": "PSG", "Rennes": "REN", "Strasbourg": "RCS", "Toulouse": "TFC", "Troyes": "TRO",
};

export function clubCode(name: string) {
  return codes[name] ?? name.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}
