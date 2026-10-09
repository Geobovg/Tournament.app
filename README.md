# Futebol

Fullstack webapp bygget med Next.js (App Router, TypeScript, Tailwind) og Supabase (Postgres/DB).

## Kom i gang

1. Installer avhengigheter (allerede gjort ved oppsett):
   ```bash
   npm install
   ```
2. Kopier `.env.local.example` til `.env.local` og fyll inn Supabase-prosjektets URL og anon key (finnes under Project Settings > API i Supabase-dashbordet):
   ```bash
   cp .env.local.example .env.local
   ```
3. Start utviklingsserver:
   ```bash
   npm run dev
   ```
4. Åpne [http://localhost:3000](http://localhost:3000).

## Struktur

- `src/app` – sider og layouts (Next.js App Router)
- `src/lib/supabase` – Supabase-klienter (`client.ts` for nettleser, `server.ts` for server components/actions)

## Databasemigreringer

Nye filer i `supabase/migrations` kjøres automatisk mot Supabase når de merges til `main`, av GitHub-jobben
`.github/workflows/supabase-migrations.yml`. Den trenger hemmeligheten `SUPABASE_DB_URL` i GitHub
(Settings > Secrets and variables > Actions): tilkoblingsstrengen for «Session pooler» fra Supabase
(Connect-knappen øverst i dashbordet), med databasepassordet fylt inn.

## Stack

- Next.js + TypeScript + Tailwind CSS
- Supabase (database, evt. Auth/Storage senere)
- Vercel (planlagt hosting)
