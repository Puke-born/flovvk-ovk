## Så byggs det

### 1. Datamodell (Dexie v6)

Ny typ `LfpSheet` i `src/lib/db.ts` med exakt samma fält som LFP-appens `Sheet`: `name`, `kund`, `anlaggning`, `utfordAv`, `arbNr`, `datum`, `system`, `plan`, `rows: GridRow[]` (36 rader), `notes`, `cellColors`, `importedCells` (lagras som `Record<number, string[]>` eftersom `Set` inte kan sparas i IndexedDB och konverteras till `Set` i UI-lagret).

`Unit` får `lfpSheets?: LfpSheet[]`. Migrering v5 → v6 sätter tom lista på befintliga aggregat. Fälten `kund`/`anlaggning`/`utfordAv`/`arbNr`/`datum`/`system` fylls automatiskt från besiktningen (fastighetsägare, fastighetsbeteckning, besiktningsman, Arb.nr, besiktningsdatum, systembeteckning) så du inte skriver dubbelt — men de går att ändra per blad.

### 2. Komponenter

- `src/components/AirflowGrid.tsx` och `src/components/NotesGrid.tsx` läggs in oförändrade (bara importvägar/tokens anpassade). Rutnätsfärg-tokens `--grid-border`, `--grid-header`, `--grid-cell`, `--grid-cell-alt` läggs till i `src/index.css` och `tailwind.config.ts` om de saknas.
- Ny `src/sections/LfpSection.tsx`: bladflikar (+ lägg till, byt namn, ta bort, duplicera), formelrad/färgpalett för markerade celler, `AirflowGrid`, `NotesGrid` och import-knapp. Renderas som ny sektion "Luftflödesprotokoll (LFP)" i aggregatkortet, under Anmärkningar, och kan fällas ihop så kortet inte blir för långt.
- Skrivning sparas debounced till Dexie (samma mönster som `BufferedField`/`RemarksGrid` idag) så det inte laggar.

### 3. Import

`src/lib/lfpImport.ts` = LFP-appens `importExcel.ts` (`getSheetNames` + `importSheets`, rader 14–49, kolumner A–J, anteckningar 51–55). Dialog: välj fil → välj blad → varje valt blad blir ett nytt LFP-blad på det aktuella aggregatet med importerade celler gulmarkerade. `xlsx`-paketet läggs till för `.xls`-stöd (lazy-loadat som idag).

### 4. Samlad export

`src/lib/excelExport.ts` byggs ut:

1. Intygsblad och övriga icke-aggregatblad fylls som idag (inkl. chunk-duplicering vid fler än 13 aggregat).
2. För varje aggregat skapas aggregatfliken som idag.
3. Direkt efter varje aggregatflik skapas dess LFP-flikar från en LFP-mallflik, ifylld med LFP-appens `fillSheet`-logik (C4–C7, J4–J7, rutnät A14:J49, anteckningar A51:J55, cellfärger). Sid.nr blir "1/2", "2/2" räknat per aggregat.
4. Flikordningen sätts explicit via ExcelJS `orderNo`, så ordningen blir Intyg → LB01 → LFP LB01 → LFP LB01 (2) → LB02 …

**LFP-mallen:** exporten letar först efter en flik med namnet `LFP` i din uppladdade OVK-mall och använder den som LFP-mall. Finns den inte kan du ladda upp en separat LFP-mall i Inställningar → Excel-mall (lagras i Dexie precis som huvudmallen). Saknas båda hoppas LFP-flikarna över med ett tydligt meddelande.

### 5. Övrigt

- `{{unit.lfpSheetCount}}` läggs till som platshållare om du vill visa antal LFP-blad i protokollet.
- Enter-som-Tab-beteendet i LFP-rutnätet behålls som i LFP-appen (piltangenter upp/ner), och Enter flyttar till cellen nedanför.
- Allt fungerar offline; inget backend behövs.
