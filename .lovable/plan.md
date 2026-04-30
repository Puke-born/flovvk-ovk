## Mål

Möjliggöra export av besiktningsdata till en Excel-mall som du själv laddar upp i Inställningar. Mallen använder platshållare som `{{propertyDesignation}}` i cellerna. Vid export ersätts platshållarna med data, och för varje aggregat duplicerats en mallflik.

## Användarflöde

**1. Engångs-setup (Inställningar → ny flik "Excel-mall"):**
- Du laddar upp din .xlsx-mall.
- Appen läser in den och visar: filnamn, antal flikar, och en lista över alla platshållare den hittade (`{{...}}`).
- Du ser också en "Tillgängliga fält"-lista att kopiera från när du designar mallen.
- Mallen sparas lokalt (IndexedDB) — fungerar offline efter uppladdning.

**2. Mall-design (gör du i Excel):**
- I cellerna där fastighetsdata ska, skriv `{{propertyDesignation}}`, `{{address}}`, `{{inspectorName}}` osv.
- Skapa **en flik som heter exakt `Aggregat`** (eller annat namn vi bestämmer). Den används som mall för varje aggregat och duplicerats vid export. I den fliken använder du `{{unit.systemDesignation}}`, `{{unit.status}}` osv. (utan index — appen fyller i per kopia).
- Övriga flikar (intyg, sammanställning) använder fält på besiktningsnivå.

**3. Export (i besiktningsvyn):**
- Knapp "Exportera till Excel" i headern.
- Appen:
  1. Laddar mallen från IndexedDB.
  2. För varje aggregat: duplicerar `Aggregat`-fliken, döper den t.ex. till aggregatets systembeteckning, fyller i `{{unit.*}}`-platshållare.
  3. Tar bort original-`Aggregat`-fliken.
  4. Ersätter `{{...}}` på alla övriga flikar med besiktningsdata.
  5. Laddar ner ifylld fil som `<fastighetsbeteckning>_<datum>.xlsx`.
- Allt sker i webbläsaren — offline OK.

## Tillgängliga platshållare (preliminärt)

**Besiktning/fastighet:**
`{{propertyDesignation}}`, `{{buildingYear}}`, `{{renovationYear}}`, `{{address}}`, `{{postalCode}}`, `{{city}}`, `{{buildingId}}`, `{{buildingNorm}}`

**Fastighetsägare / driftansvarig (kopplade kontakter):**
`{{owner.name}}`, `{{owner.contactPerson}}`, `{{owner.address}}`, `{{owner.phone}}`, `{{owner.email}}` osv.
`{{ops.name}}`, `{{ops.contactPerson}}` osv.

**Besiktningsman:**
`{{inspector.name}}`, `{{inspector.authorization}}`, `{{inspector.certificationNumber}}`, `{{inspector.company}}`, `{{inspector.phone}}`, `{{inspector.email}}` — plus `{{inspector.signature}}` som infogas som **bild** i cellen om den finns.

**Aggregat (på `Aggregat`-fliken som dupliceras):**
`{{unit.systemDesignation}}`, `{{unit.placement}}`, `{{unit.aggregate}}`, `{{unit.ventilationType}}`, `{{unit.servedArea}}`, `{{unit.business}}`, `{{unit.operatingHours}}`, `{{unit.inspectionInterval}}`, `{{unit.apartmentCount}}`, `{{unit.inspectionType}}`, `{{unit.inspectionDate}}`, `{{unit.reInspectionDate}}`, `{{unit.nextOrdinaryDate}}`, `{{unit.previousInspectionDate}}`, `{{unit.ratedPower}}`, `{{unit.airflow}}`, `{{unit.qNozzle}}`, `{{unit.status}}`, `{{unit.replacementInterval}}`, `{{unit.verdict}}`, `{{unit.notes}}`

**Praktiskt:** `{{exportDate}}`, `{{unit.index}}` (1, 2, 3…), `{{unit.total}}`.

Du får exakt fält-listan i Inställningar — kopiera fritt.

## Tekniska detaljer

- **Bibliotek:** [`exceljs`](https://www.npmjs.com/package/exceljs) (klient-sida, bevarar formatering, formler, bilder, sammanfogade celler — bättre än SheetJS gratisversion för detta).
- **Lagring av mall:** Ny Dexie-tabell `excelTemplate` (single record) — sparar filnamn, uppladdningsdatum och själva filen som `Blob`/`ArrayBuffer`.
- **Platshållar-ersättning:** Loopa alla celler i alla flikar; om cell-värdet är en sträng som innehåller `{{...}}`, ersätt. Behåll cellens formatering (font, färg, kantlinjer).
- **Flik-duplicering:** `worksheet.model` kopieras, ny flik skapas med kopian, `{{unit.*}}` ersätts med det aggregatets data. Fliknamn = aggregatets `systemDesignation` (saneras för Excel-regler: max 31 tecken, inga `\ / ? * [ ]`).
- **Signatur som bild:** Om en cell innehåller bara `{{inspector.signature}}` och vi har en data-URL, infoga som bild i den cellen istället för text. (Annars hoppas över.)
- **Inga ändringar på Lovable Cloud / inloggning** — det tar vi separat senare som planerat.

## Påverkade filer

- `src/lib/db.ts` — ny `excelTemplate`-tabell, version-bump till 4.
- `src/lib/excelExport.ts` — ny: laddar mall, ersätter platshållare, duplicerar aggregat-flik, triggar nedladdning.
- `src/lib/excelPlaceholders.ts` — ny: bygger objektet `{ propertyDesignation, owner: {...}, units: [...] }` från en besiktning + listan över tillgängliga fältnamn (för UI).
- `src/pages/SettingsPage.tsx` — ny flik "Excel-mall" med uppladdning, status, fält-referens, ta bort-knapp.
- `src/components/ExcelTemplateManager.tsx` — ny: UI för uppladdning + lista med funna platshållare + tillgängliga fält.
- `src/pages/InspectionPage.tsx` — lägg tillbaka en "Exportera"-knapp i headern (bara aktiv om mall finns uppladdad).
- `package.json` — lägg till `exceljs`.

## Begränsningar att vara medveten om

- **Aggregat-fliken måste heta exakt det avtalade namnet** (förslag: `Aggregat`). Annars vet appen inte vilken som ska dupliceras.
- **Komplexa Excel-funktioner** (pivottabeller, vissa diagram, makron) bevaras vanligtvis av exceljs men inte garanterat 100%. Om du har sånt i mallen testar vi och justerar.
- **Bilder/loggor som redan finns i mallen** bevaras.
- **Formler i mallen** bevaras och räknar om sig när Excel öppnar filen.

## Vad vi gör efter godkännande

1. Lägger till `exceljs` och databas-tabellen.
2. Bygger Inställningar → Excel-mall (uppladdning + visning av funna platshållare).
3. Bygger export-funktionen och knappen i besiktningsvyn.
4. Du laddar upp din mall → vi testar tillsammans → justerar.

Säg till om något ska ändras (t.ex. annat namn än `Aggregat` på mall-fliken, eller fler/färre platshållarfält), annars kör vi.