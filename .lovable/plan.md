## Bakgrund

All data sparas redan lokalt i IndexedDB (via Dexie, databasen `ovk-app`). Stänger du webbläsaren ligger besiktningar, enheter, kontakter, besiktningsmän, byggnadsnormer och Excel-mallen kvar.

Det som *inte* fungerar idag är att starta appen utan internet — själva app-filerna (HTML/JS/CSS) hämtas från servern varje gång. Det är därför du upplever att offline-stödet inte är klart.

## Mål

Appen ska kunna öppnas och användas utan internetuppkoppling, både i webbläsaren och som installerad app på surfplattan. Befintlig data i IndexedDB ändras inte.

## Plan

1. **Lägg till `vite-plugin-pwa`** med `generateSW` och `registerType: "autoUpdate"`.
   - Pre-cacha hela app-skalet (HTML, JS, CSS, ikoner, fonter).
   - HTML-navigeringar via `NetworkFirst` (så nya versioner hämtas när nät finns, men cache används offline).
   - Hashade assets via `CacheFirst`.

2. **Säker registrering** via en wrapper-modul som *bara* registrerar service worker när:
   - appen körs i produktion (inte i Lovable-preview, iframe eller dev),
   - URL:en inte innehåller `?sw=off` (kill-switch).
   
   I preview/dev avregistreras eventuell gammal SW automatiskt.

3. **Uppdateringsbeteende**: `autoUpdate` — nästa gång du öppnar appen med internet hämtas ny version i bakgrunden och aktiveras vid omladdning. Ingen popup eller knapp behövs.

4. **Manifest**: behåll nuvarande `manifest.webmanifest` och ikoner som de är.

5. **Verifiera**: bygg appen och bekräfta att `sw.js` genereras och att `manifest`/ikoner fortfarande pekar rätt.

## Vad som *inte* ändras

- Ingen ändring av IndexedDB/Dexie-schemat — data är redan offline.
- Inga ändringar i UI, sidor eller besiktningsflödet.
- Inga ändringar av `start_url`/`scope` i manifestet (de cachas av iOS/Android vid installation).

## Efter implementation

- Använd appen med internet en gång efter publicering så att service workern installeras.
- Därefter går den att öppna utan nät — både i webbläsaren och från hemskärmsikonen.
- Offline-läge fungerar bara i publicerad version, inte i Lovable-editorns preview.
