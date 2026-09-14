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

## Stack

- Next.js + TypeScript + Tailwind CSS
- Supabase (database, evt. Auth/Storage senere)
- Vercel (planlagt hosting)
