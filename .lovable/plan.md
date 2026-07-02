## 1. Ombyggnadsår per aggregat

Idag finns `renovationYear` bara på besiktningen (fastighetsnivå). Vi lägger till samma fält per aggregat så det kan skilja sig mellan olika aggregat i samma besiktning.

- Lägg till `renovationYear?: string` på `Unit` i `src/lib/db.ts`.
- Lägg till ett inmatningsfält "Ombyggnadsår" i aggregat-editorn i `src/sections/UnitsSection.tsx`, placerat nära befintliga byggnads-/verksamhetsfält.
- Exponera `unit.renovationYear` i `src/lib/excelPlaceholders.ts` (både i `unitFields`-outputen och i listan `AVAILABLE_PLACEHOLDERS` så det syns i mallguiden).
- Fastighetsnivåns `{{renovationYear}}` behålls oförändrad.

## 2. Intygsbladet kopieras vid fler än 13 aggregat

Intygsbladet har idag plats för 13 rader med `{{unit.*}}`-platshållare (rad 9–21). När det är fler aggregat än så tappas resten bort i exporten.

- I `src/lib/excelExport.ts`, bygg om `processSheetWithUnitRows` så att den:
  1. Identifierar mall-raderna med `unit.*`-platshållare **innan** något ersätts.
  2. Sparar en oförändrad kopia av bladets `model` (via `JSON.parse(JSON.stringify(...))`) och rad-mall.
  3. Fyller första bladet med aggregat 1–N (där N = antal unit-rader i mallen, t.ex. 13).
  4. Om det finns fler aggregat: skapa nya blad genom att duplicera modellen — namngivna `<originalnamn> (2)`, `(3)` osv. via befintlig `uniqueSheetName` — och fyll dem med nästa chunk aggregat.
  5. Överblivna unit-rader på sista bladet blankas (som idag).
- Icke-unit-celler (rubriker, sidfot, signaturplatshållare m.m.) fylls på varje kopia med samma besiktningsdata så bladet är komplett i sig.
- Aggregat-bladen (`TEMPLATE_SHEET_NAME = "Aggregat"`) påverkas inte — de dupliceras redan per aggregat.

## Teknisk sammanfattning

Filer som ändras:
- `src/lib/db.ts` — nytt fält på `Unit`.
- `src/sections/UnitsSection.tsx` — UI-fält för ombyggnadsår.
- `src/lib/excelPlaceholders.ts` — mapping + listning av `unit.renovationYear`.
- `src/lib/excelExport.ts` — chunkning + bladduplicering för intygs-liknande blad.

Inga schemaändringar i backend, ingen migration av befintlig data (nya fält är valfria och tomma tills användaren fyller i dem).
