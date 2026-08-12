# Byggnorm-logik: byggår vs ombyggnadsår

## Regel
- Fastighet & uppdrag: Byggnorm bestäms av **Byggår** (senaste norm med år <= byggår). Ingen annan input påverkar den.
- Aggregat: om **Ombyggnadsår** är ifyllt får det aggregatet en egen byggnorm baserad på ombyggnadsåret. Är fältet tomt ärver aggregatet fastighetens byggnorm.

## Vad som byggs
1. Aggregatkortet får ett Byggnorm-fält (samma lista som i fastighetshuvudet, plus möjlighet till egen text).
   - Tomt ombyggnadsår → fältet visar fastighetens byggnorm som ärvt värde (gråmarkerat).
   - Ifyllt ombyggnadsår → autoifylls med normen för det året, går att ändra manuellt.
   - Ändras ombyggnadsåret räknas normen om, så länge värdet inte manuellt övertagits.
2. Excel-export: `{{unit.buildingNorm}}` läggs till som platshållare och fylls med aggregatets norm (ärvd eller egen). `{{buildingNorm}}` fortsätter vara fastighetens norm från byggåret.
3. Intyg-vyn visar aggregatets norm när den avviker från fastighetens.

## Tekniskt
- `src/lib/db.ts`: nytt fält `buildingNorm?: string` på `Unit` (Dexie-version bumpas, inga index behövs).
- Ny hjälpfunktion `normForYear(norms, year)` i `src/lib/db.ts` (eller `src/lib/utils.ts`) som återanvänds av både `InspectionHeaderForm` och aggregatkortet, så matchningsregeln finns på ett ställe.
- `src/sections/InspectionHeaderForm.tsx`: byter till den delade funktionen, oförändrat beteende.
- `src/sections/UnitsSection.tsx`: byggnormsfält + autofyll kopplad till `renovationYear`.
- `src/lib/excelPlaceholders.ts`: `unit.buildingNorm` med fallback till fastighetens norm.
