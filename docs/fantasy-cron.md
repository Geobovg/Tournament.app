# Den automatiske Fantasy-jobben

Fantasy trenger en jobb som kjører hele tiden: den henter terminlista, låser lagene ved fristen, henter kamper som pågår, regner ut poeng, avslutter runder og endrer prisene. Koden ligger i `src/lib/fantasy/tick.ts`, og den kjøres ved å kalle `POST /api/fantasy/tick`.

Supabase kaller den hvert andre minutt med `pg_cron` (planlegger) og `pg_net` (sender forespørselen). Begge er gratis i Supabase, så det trengs ingen betalt Vercel-plan.

## 1. Miljøvariabler i Vercel

I Vercel: prosjektet → **Settings** → **Environment Variables**. Legg til for **Production**:

| Navn | Verdi |
| --- | --- |
| `API_FOOTBALL_KEY` | API-nøkkelen fra dashboard.api-football.com |
| `FANTASY_CRON_SECRET` | En lang, tilfeldig tekst (samme som i steg 2) |

Deploy på nytt etterpå, så variablene blir med.

## 2. Jobben i Supabase

Kjør i Supabase SQL Editor. Bytt ut `<HEMMELIG>` med verdien av `FANTASY_CRON_SECRET`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Hemmeligheten lagres kryptert i Supabase Vault, ikke i selve jobben.
select vault.create_secret('<HEMMELIG>', 'fantasy_cron_secret');

select cron.schedule(
  'fantasy-tick',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://sendit.website/api/fantasy/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fantasy_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
```

Se om den går: `select * from cron.job_run_details order by start_time desc limit 10;` og svarene fra appen: `select status_code, content from net._http_response order by created desc limit 5;`

Stoppe jobben: `select cron.unschedule('fantasy-tick');`

## Lokalt

- `npm run fantasy:tick` kjører jobben én gang mot `http://localhost:3001` (bruk `-- --fixtures` for å hente terminlista med en gang).
- `npm run fantasy:clock -- --before 1` / `--after 1` / `--off` stiller den simulerte klokka når vi tester med en tidligere sesong.
- `npm run fantasy:sync` henter lag, staller og statistikk for en hel sesong (brukes når en ny sesong settes opp).
