-- Språket brukeren har valgt i appen. Tom verdi betyr at appen velger ut fra nettleserens språk.
-- Kan kjøres før den nye koden er ute: den gamle koden bruker ikke kolonnen.
alter table profiles add column if not exists locale text check (locale in ('no', 'en'));
