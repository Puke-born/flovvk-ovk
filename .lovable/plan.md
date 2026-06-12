## Mål

1. Smidig första-gångs-upplevelse för nya användare.
2. E-post/lösenord-inloggning via Lovable Cloud.
3. Allt (besiktningar, enheter, besiktningsmän, byggnormer, fastighetsägare, driftansvariga, excel-mall) delas inom samma företag.
4. Offline-läge fortsätter fungera; ändringar synkas när enheten är online; vid konflikt varnas användaren innan serverversionen skriver över lokala ändringar.

## Steg

### 1. Aktivera Lovable Cloud
Slå på Cloud för att få databas, autentisering och edge functions.

### 2. Datamodell (Postgres + RLS)

```text
companies        id, name, created_at, created_by
company_members  id, company_id, user_id, role (owner|member), created_at
                 (en användare = ett företag i denna version)

inspections      ... + company_id, updated_at, updated_by, deleted_at
units            ... + company_id, updated_at, updated_by, deleted_at
property_owners  ... + company_id, updated_at, updated_by, deleted_at
operations_mgrs  ... + company_id, updated_at, updated_by, deleted_at
inspectors       ... + company_id, updated_at, updated_by, deleted_at
building_norms   ... + company_id, updated_at, updated_by, deleted_at
excel_template   company_id (PK), file_name, data (storage path), updated_at, updated_by
```

- RLS: medlemmar i `company_id` får full CRUD; andra noll åtkomst.
- Excel-mall lagras i privat Storage-bucket `excel-templates/<company_id>/template.xlsx`.
- Signaturer (bilder) stannar inbäddade i `inspectors.signature` (base64) som idag.

### 3. Autentisering

- Sida `/auth`: e-post + lösenord, växla mellan logga in / skapa konto.
- Skapa konto → edge function (eller DB-trigger) skapar `companies`-rad + `company_members` med rollen `owner`. Företagsnamn frågas i ett enkelt fält vid första inloggning om det saknas.
- Skyddade routes: alla nuvarande sidor kräver session. Oinloggade skickas till `/auth`.
- Sessionen cachas i IndexedDB via Supabase-klienten så att inloggade användare kan öppna appen offline.

### 4. Offline + synk

Behåll Dexie som primär lagring (appen är offline-first). Lägg till ett synk-lager:

- Varje tabell får `updated_at` (ms), `updated_by` (user_id), `deleted_at` (soft delete) lokalt och på servern.
- Outbox-kö i Dexie: alla skrivningar köas som mutationer (`upsert` / `delete` per rad).
- När online: skicka outbox i ordning. Servern accepterar `upsert` om `incoming.updated_at >= server.updated_at` (last-write-wins).
- Pull: efter push, hämta rader där `server.updated_at > local.lastPulledAt` för användarens `company_id`.
- Konfliktvarning: innan en inkommande server-rad skriver över en lokal rad som har osynkade ändringar i outboxen, visa en dialog ("En kollega har ändrat denna besiktning – behåll mina ändringar eller använd serverns version?"). Val sparas och tillämpas.
- Statusindikator i header: "Online / Synkar / Offline / X ändringar väntar".

### 5. Onboarding (informationsruta)

- Första gången en inloggad användare öppnar Hem och inga inspektioner/besiktningsmän/mall finns: visa en `Card` med kort text och länkar till Inställningar (Besiktningsmän, Excel-mall, Byggnormer, Fastighetsägare). Kan stängas och kommer inte tillbaka (flagga i localStorage per användare).

### 6. Migrering av befintlig lokal data

- Vid första inloggning: om Dexie har data utan `company_id`, märk allt med användarens nya `company_id` och lägg in i outbox för uppladdning. Visa toast: "Din lokala data flyttas till ditt företag."

### 7. Säkerhet

- RLS-policys via `has_company_role`-funktion (security definer) för att undvika rekursion.
- Lösenord-HIBP aktiveras.
- Bekräftelsemail av kontot avstängt (snabb onboarding); kan slås på senare.

## Teknisk översikt (för utvecklare)

- Nya filer: `src/pages/AuthPage.tsx`, `src/lib/auth.ts`, `src/lib/sync/` (outbox, puller, conflictResolver), `src/components/SyncStatus.tsx`, `src/components/ConflictDialog.tsx`, `src/components/OnboardingCard.tsx`.
- Dexie schema bump: lägg till `updated_at`, `updated_by`, `deleted_at`, `companyId`, ny tabell `outbox`, ny tabell `syncMeta`.
- Edge function `bootstrap-company` körs efter signup för att skapa företag + medlemskap atomärt.
- `App.tsx`: `AuthProvider` runt routes; `ProtectedRoute`-wrapper.

## Vad som INTE ändras

- UI/layout i besiktningssidor, excel-export, befintliga formulärfält.
- Service worker / PWA-uppdateringsnotis.
- Logik för G/EG, statusar, grid-celler.

## Begränsningar att nämna för dig

- En användare tillhör ett företag. Vill ni senare ha flera företag per användare eller inbjudningar via e-post bygger vi det som steg 2.
- Offline-synk fungerar bara på publicerad version (samma som service workern). I editor-preview körs allt lokalt utan synk.
- Första inloggningen kräver internet.
