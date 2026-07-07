## Ändringar

1. **`src/sections/InspectionHeaderForm.tsx`**
   - Ta bort fältet "Ombyggnadsår" ur formuläret och ur lokal state.
   - Justera byggnorms-autofyllnaden så den enbart baseras på `buildingYear` (eftersom ombyggnadsår försvinner från inspektionen). Övrig logik för val/manuell inmatning av byggnorm behålls oförändrad.

2. **`src/sections/UnitsSection.tsx`**
   - Fältet "Ombyggnadsår" finns redan per aggregat och lämnas kvar som det är. Ingen extra ändring behövs där.

3. **`src/sections/IntygView.tsx`**
   - Ta bort raden som visar `inspection.renovationYear` i sammanfattningen (den flyttar med aggregatet, som redan visas separat).

4. **`src/lib/db.ts`**
   - Ta bort `renovationYear` från `Inspection`-interfacet. `Unit.renovationYear` behålls.

5. **`src/lib/excelPlaceholders.ts`**
   - Ta bort inspektions-nivåns `renovationYear` (rad 63) och motsvarande post i nyckellistan (rad 144). Aggregatets `unit.renovationYear` behålls.

Ingen datamigrering behövs – gamla poster med `inspection.renovationYear` ignoreras helt enkelt efter typborttagning (Dexie lagrar fält utan schema).
