# HG ELEC - SaaS Devis & Factures

Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres + Auth) + PDF server (Playwright) + Vercel.

## Prerequis
- Node.js 18+
- Supabase project (local ou cloud)

## Installation
```bash
npm install
```

## Variables d'environnement
Creer `.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Base de donnees (Supabase)
1. Appliquer la migration SQL `supabase/migrations/0001_init.sql` dans votre projet Supabase.
2. Verifier que les fonctions/trigger sont bien crees (tenant auto + numerotation DEV/FAC).

### Seed du catalogue electricien
Le seed cree un catalogue complet avec `internal_unit_price = 0`.
```
-- Dans SQL Editor Supabase
select public.seed_catalog('<TENANT_ID>');
```
> Remplacez `<TENANT_ID>` par l'id de votre entreprise (table `tenants`).

## Lancer en local
```bash
npm run dev
```
Acces: http://localhost:3000

## PDF
Route serveur:
```
GET /api/pdf?type=quote&id=<QUOTE_ID>
GET /api/pdf?type=invoice&id=<INVOICE_ID>
```
Aucun prix unitaire n'est expose dans le HTML/PDF client.
En local, configurez `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` si Chromium n'est pas detecte automatiquement.

## Tests
```bash
npm test
```

## Deploiement Vercel
- Ajouter les variables d'environnement dans Vercel.
- Build command: `npm run build`
- Output: Next.js

## Notes importantes
- RLS active sur toutes les tables.
- Numerotation DEV/FAC atomique via `document_counters`.
- Mode client: prix unitaires masques (UI + PDF).

