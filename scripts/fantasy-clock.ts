// Stiller den simulerte klokka for gjeldende Fantasy-sesong. Bare for testing med en
// tidligere sesong. Kjøres med `npm run fantasy:clock -- <valg>`:
//
//   --before 3   ett minutt før fristen i runde 3 (laget kan fortsatt endres)
//   --after 3    ett minutt etter at runde 3 er over (runden kan avsluttes)
//   --at 2024-08-16T18:00:00Z
//   --off        tilbake til ekte tid
import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Mangler ${name} i .env.local`);
  return value;
}

const db = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const [flag, value] = process.argv.slice(2);
const { data: season, error } = await db.from("fantasy_seasons").select("api_season").eq("is_current", true).single();
if (error) throw new Error(error.message);

let when: string | null;
if (flag === "--off") {
  when = null;
} else if (flag === "--at" && value) {
  when = new Date(value).toISOString();
} else if ((flag === "--before" || flag === "--after") && value) {
  const { data: round, error: roundError } = await db.from("fantasy_rounds").select("deadline_at, ends_at").eq("api_season", season.api_season).eq("number", Number(value)).single();
  if (roundError) throw new Error(`Fant ikke runde ${value}: ${roundError.message}`);
  const base = new Date(flag === "--before" ? round.deadline_at : round.ends_at).getTime();
  when = new Date(base + (flag === "--before" ? -60_000 : 60_000)).toISOString();
} else {
  throw new Error("Bruk --before <runde>, --after <runde>, --at <tid> eller --off");
}

const { error: updateError } = await db.from("fantasy_seasons").update({ simulated_now: when }).eq("api_season", season.api_season);
if (updateError) throw new Error(updateError.message);
console.log(when ? `Klokka i sesong ${season.api_season} er nå ${when}` : `Sesong ${season.api_season} bruker ekte tid igjen`);
