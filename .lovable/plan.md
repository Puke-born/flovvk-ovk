# Byggnorm flyttas till aggregatkorten

## Regel
- Byggnorm är en egenskap per aggregat, inte per fastighet.
- Tomt Ombyggnadsår på aggregatet → normen väljs automatiskt utifrån fastighetens Byggår (senaste norm med år <= byggår).
- Ifyllt Ombyggnadsår → normen väljs automatiskt utifrån ombyggnadsåret.
- Automatiken skriver bara över så länge användaren inte själv valt något; ett manuellt val ligger kvar tills ombyggnadsåret ändras aktivt.

## Vad som byggs
1. Fastighetshuvudet: rullistan "Byggnorm" tas bort helt (inklusive fritextläget och autofyll-logiken). Byggår finns kvar och styr nu normen indirekt via aggregaten.
2. Aggregatkortet: ny rullista "Byggnorm" placerad under "Betjänad yta", direkt efter "Antal lägenheter". Samma alternativlista som tidigare (sparade byggnormer + "Egen byggnorm…" som fritext), med länk till Inställningar för att hantera listan.
3. Autoval enligt regeln ovan, omräknat när ombyggnadsåret eller fastighetens byggår ändras.
4. Excel: `{{unit.buildingNorm}}` fylls med aggregatets valda norm. Den gamla platshållaren `{{buildingNorm}}` behålls som alias och fylls med första aggregatets norm så befintliga mallar inte slutar fungera.
5. Intyg-vyn visar aggregatets byggnorm i stället för fastighetens.

## Tekniskt
- `src/lib/db.ts`: `buildingNorm?: string` läggs till på `Unit`; `buildingNorm` tas bort från `Inspection`. Dexie-version bumpas till 5 (inga nya index behövs).
- Delad hjälpfunktion `normForYear(norms, year)` (i `src/lib/db.ts`) som gör matchningen senaste år <= angivet år.
- `src/sections/InspectionHeaderForm.tsx`: byggnormsfältet och tillhörande state/effekter tas bort; gridden justeras så raden fylls ut.
- `src/sections/UnitsSection.tsx`: nytt byggnormsfält med autoval kopplat till `renovationYear` och `inspection.buildingYear`, sparas debouncat som övriga fält.
- `src/lib/excelPlaceholders.ts` / `src/lib/excelExport.ts`: `unit.buildingNorm` läggs till och `buildingNorm` mappas om till första aggregatets värde.
