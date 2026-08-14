# Uppstädning: ta bort molndelen, appen blir helt lokal

Appen använder redan enbart Dexie (IndexedDB). Ingen sida, komponent eller hook importerar Supabase-klienten — det finns ingen AuthProvider, AuthGuard eller inloggningssida kvar i koden. Det som finns kvar är databasobjekten i molnbackenden och de autogenererade klientfilerna.

## Vad som städas

### 1. Databasen (orsaken till säkerhetsvarningarna)
En migrering som tar bort allt som skapades för inloggning/företag:
- Tabellerna `sync_rows`, `company_members`, `companies` (i den ordningen p.g.a. relationer).
- Hjälpfunktionerna `is_company_member`, `current_company_id`, `sync_rows_lww` och `handle_new_user` (den senare tas bort med CASCADE så dess trigger på nya användare försvinner samtidigt).
- Typen `company_role`.

Efter migreringen finns inga tabeller kvar i den publika databasen, och RLS-varningarna för `companies`/`company_members` försvinner.

### 2. Kvarvarande kod
- Tar bort mappen `src/integrations/supabase/` (`client.ts` och `types.ts`) som inte importeras någonstans.
- Tar bort `@supabase/supabase-js` ur `package.json`.
- Genomsökning bekräftar att ingen inloggnings-, auth- eller företagslogik finns kvar i `src/` (träffarna på "company" är besiktningsmannens företagsnamn i protokollet och ska vara kvar).

### 3. Offline-läget
Ingen förändring behövs i uppstartsflödet: `main.tsx`/`App.tsx` startar direkt i appen utan sessionskontroll, och service workern samt Dexie sköter offline-driften som idag. Verifieras med en byggning och en snabb koll att appen laddar.

## Notering
Efter detta är Lovable Cloud-backenden tom men fortfarande kopplad till projektet. Om du senare vill ha synk mellan surfplattorna kan den återaktiveras då — inget av det lokala arbetsflödet påverkas.
