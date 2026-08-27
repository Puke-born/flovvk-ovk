## Beteende

- Intyg är alltid första fliken och är förvald när besiktningen öppnas.
- "+" längst till höger i rad 1 lägger till ett nytt aggregat och väljer det.
- Rad 2 syns bara när ett aggregat är valt. "Protokoll" är förvalt och visar samma aggregatformulär som idag (utan LFP-sektionen längst ner).
- "+ LFP" skapar ett nytt LFP-blad med automatiskt namn (LFP LB01, LFP LB01 (2) …) och öppnar det.
- Högerklick/långtryck behövs inte: byt namn, duplicera och radera för LFP-blad ligger kvar som knappar i LFP-vyn.
- Många aggregat: flikraden scrollar horisontellt, med samma touch-vänliga höjd som idag. Duplicera/Radera aggregat ligger kvar i aggregatets huvud.

## Teknisk genomgång

- `src/pages/InspectionPage.tsx`: nuvarande `Tabs` med "Intyg"/"Aggregat" ersätts av en flikrad byggd av besiktningens aggregat plus Intyg. Valt läge hålls som `{ view: "intyg" } | { unitId, sheet: "form" | lfpSheetId }`.
- `src/sections/UnitsSection.tsx`: sidokolumnen (raderna kring 138–200) tas bort; komponenten tar emot valt aggregat/blad från sidan i stället för egen `activeId`. LFP-blocket i `UnitEditor` (kring rad 505–525, inkl. `lfpOpen`-knappen) tas bort.
- `src/sections/LfpSection.tsx`: den interna bladflikraden tas bort — bladet väljs nu av den yttre flikraden, så komponenten renderar ett blad åt gången (`activeSheetId` som prop). Import, färgpalett, rutnät och anteckningar är oförändrade.
- Datamodellen (`Unit.lfpSheets` i `src/lib/db.ts`) och `src/lib/excelExport.ts` rörs inte — exporten ger fortfarande Intyg → LB01 → LFP LB01 → …
