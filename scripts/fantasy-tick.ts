// Kjører den automatiske Fantasy-jobben én gang mot en lokal server, som Supabase gjør hvert
// andre minutt i produksjon. Kjøres med `npm run fantasy:tick` (eventuelt `-- --fixtures`
// for å hente terminlista på nytt med en gang). Adressen kan endres med FANTASY_TICK_URL.
const secret = process.env.FANTASY_CRON_SECRET;
if (!secret) throw new Error("Mangler FANTASY_CRON_SECRET i .env.local");
const base = process.env.FANTASY_TICK_URL ?? "http://localhost:3001/api/fantasy/tick";
const url = process.argv.includes("--fixtures") ? `${base}?fixtures=1` : base;
const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
const body = await response.json();
if (!response.ok) {
  console.error(`Feil ${response.status}:`, body);
  process.exit(1);
}
console.log(`Sesong ${body.season}, klokka ${body.now}`);
for (const step of body.steps) console.log(`  ${step}`);

export {};
