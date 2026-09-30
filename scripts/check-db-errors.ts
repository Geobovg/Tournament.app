// Sjekker at alle feilmeldinger fra raise exception i migreringene har en oversettelse i
// src/i18n/db-errors.ts. Kjøres med `npm run check:db-errors`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DB_ERROR_RULES } from "../src/i18n/db-errors.ts";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const messages = new Set<string>();
for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql"))) {
  const sql = readFileSync(join(dir, file), "utf8");
  for (const found of sql.matchAll(/raise\s+exception\s+'((?:[^']|'')*)'/gi)) messages.add(found[1].replaceAll("''", "'"));
}

// % byttes med et eksempeltall, slik Postgres setter inn verdiene.
const missing = [...messages].filter((message) => {
  const sample = message.replaceAll("%", "7");
  return !DB_ERROR_RULES.some((rule) => rule.pattern.test(sample));
});

if (missing.length) {
  console.error(`${missing.length} feilmelding(er) mangler oversettelse i src/i18n/db-errors.ts:`);
  for (const message of missing.sort()) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`Alle ${messages.size} feilmeldinger fra databasen har oversettelse.`);
