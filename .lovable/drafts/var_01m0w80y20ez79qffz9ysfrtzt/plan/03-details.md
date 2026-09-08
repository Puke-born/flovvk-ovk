## Teknisk genomgång

**Driftansvarig-förslag** — `src/sections/InspectionHeaderForm.tsx`: `ContactDialog` för driftansvarig får `initial` satt till den valda fastighetsägaren (`selectedOwner`, utan `id`) när sådan finns. `ContactDialog` visar en rad "Förifyllt från fastighetsägaren" när `initial` innehåller data; inget nytt fält i datamodellen.

**Sparning i LFP-rutnätet**
- `src/components/AirflowGrid.tsx` (`GridCell`): lägg en `useEffect`-cleanup som anropar `commit(local)` vid avmontering om `focusedRef.current` är true och `local !== value`. `local`/`value` hålls i refs så cleanupen ser senaste värdet.
- `src/sections/LfpSection.tsx`: `useDebouncedEffect`-sparningen kompletteras med en flush — en ref med senaste `draft` plus en effekt som vid byte av `sheet.id` och vid avmontering kör `saveLfpSheetIn(owner, latestDraftRef.current)` direkt för det föregående bladet. Ordningen blir: cellens cleanup uppdaterar `draft`, därefter flushas bladet.
- Eftersom `LfpSection` inte längre monteras om vid bladbyte sker flushen i effekten som lyssnar på `sheet.id`, med det gamla bladets id/ägare sparat i ref.
- `src/components/NotesGrid.tsx` får samma commit-vid-avmontering som `GridCell` om den använder samma lokala state-mönster.

**Ny ventilationstyp T** — `src/lib/db.ts`: `VENT_TYPES` utökas med `"T"`. `src/sections/UnitsSection.tsx`: `VENT_TYPE_LABELS.T = "T - Mekanisk tilluft"`, `VENT_TYPE_ORDER = ["S","F","T","FT","FX","FTX"]`, K-kravet i `ventOptions` utökas till `T`, och `intervalForVentType` behandlar `T` som `FT`. Befintliga aggregat påverkas inte.

**Signaturimport** — `src/components/SignaturePad.tsx`: dold `<input type="file" accept="image/png,image/jpeg">` plus knapp "Importera bild". Filen läses som data-URL, ritas centrerat och proportionerligt på canvasen, och för JPEG görs nära-vita pixlar transparenta via `getImageData`/`putImageData` innan `toDataURL("image/png")` skickas till `onChange`. Samma lagringsformat som ritad signatur, så Excel-exporten behöver inga ändringar. Ingen PDF-hantering.

**Verifiering** — `bunx tsgo --noEmit -p tsconfig.app.json` samt Playwright-körning som skriver i en cell, byter blad och kontrollerar att texten finns kvar.
