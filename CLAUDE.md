@AGENTS.md

# Databasemigreringer

Migreringene i `supabase/migrations` kjøres automatisk mot produksjonsdatabasen når de merges til `main`
(`.github/workflows/supabase-migrations.yml`). Ikke be brukeren kjøre SQL i Supabase selv.

- Nye migreringer får neste ledige nummer (`0085_beskrivelse.sql` osv.). Nummeret må være unikt.
- Endre aldri en migrering som allerede er på `main`; lag en ny i stedet. Den gamle kjøres ikke på nytt.
- En migrering kjøres bare én gang, så den må virke mot databasen slik den er nå.
- Feiler en migrering, blir jobben rød i GitHub Actions og ingenting av den migreringen blir lagret.
