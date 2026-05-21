## Mål

Ersätta sektionerna **Tekniska data** och **Anteckningar / övriga anmärkningar** på varje aggregat med ett fritt **13×30 rutnät** (kolumner × rader). Vid Excel-export skrivs rutnätet rakt in i cellerna **H21:T50** på aggregatets flik.

## Vad användaren ser

I aggregatkortet, mellan **Besiktning** och **Bedömning**, en ny sektion **"Anmärkningar"** med ett rutnät:

```text
       1   2   3   4   5   6   7   8   9  10  11  12  13
   1 [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]
   2 [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]
   ...
  30 [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]
```

- Varje cell är ett vanligt textinput-fält (en rad text).
- Kolumnnumren 1–13 motsvarar Excel-kolumnerna H–T.
- Radnumren 1–30 motsvarar Excel-rad 21–50.
- Sparas debouncat på samma sätt som resten av formuläret.
- Mobil: horisontell scroll inuti rutnätet, första kolumnen (radnummer) sticky.

Borttaget:
- Hela sektionen **Tekniska data** (Märkeffekt, Luftmängd, "Lägg till fält"-funktionen).
- Fältet **Anteckningar / övriga anmärkningar** under Bedömning.

## Excel-export

Vid duplicering av `Aggregat`-fliken fylls rutnätet in direkt efter platshållar­ersättningen:

- `gridCells[row][col]` → cellen på rad `21 + row`, kolumn `H..T` (offset `col` 0–12).
- Tomma celler hoppas över (befintligt cellinnehåll/formatering i mallen lämnas orört om appens cell är tom). Icke-tomma celler skrivs som strängvärde.
- Befintlig cellformatering i mallen (kantlinjer, font etc.) bevaras eftersom vi bara sätter `cell.value`.

Inga nya platshållare behövs — `H21:T50` är reserverat område i mallen.

## Teknisk implementation

**Datamodell (`src/lib/db.ts`):**
- Lägg till `gridCells?: string[][]` på `Unit` (30 rader × 13 kolumner, sparse — tomma rader/celler får vara `undefined`).
- Behåll `ratedPower`, `airflow`, `qNozzle`, `customTechFields`, `notes` i typen för bakåtkompatibilitet (gammal data går inte förlorad) men de används inte längre i UI eller export.
- Ingen schemaversion-bump behövs (inga nya index).

**UI (`src/sections/UnitsSection.tsx`):**
- Ta bort `<Section title="Tekniska data">…</Section>` (rader 277–346).
- Ta bort `<TextAreaField label="Anteckningar / övriga anmärkningar" …>` (rader 368–373).
- Lägg in ny `<Section title="Anmärkningar">` med en specialiserad `GridField`-komponent (lokal, samma fil eller egen liten komponent).
- `GridField` renderar en `<table>` med 30 rader × 13 textinputs. Stil: kompakt, monospace ej nödvändigt, `h-8`/`text-sm`, kantlinjer från `border-border`.
- Onchange uppdaterar `form.gridCells` (kopiera, fyll i, sätt). Sparas via befintlig `useDebouncedEffect` som redan flushar hela `form`.

**Export (`src/lib/excelExport.ts`):**
- I `processSheet` (eller en efterföljande funktion som körs per duplicerad aggregat-flik), efter `replaceInCell`-loopen, anropa en ny `writeUnitGrid(worksheet, unit)`.
- `writeUnitGrid` itererar `gridCells`: för varje icke-tom sträng, `worksheet.getCell(rowIdx, colIdx).value = value` där `rowIdx = 21 + r` och `colIdx = 8 + c` (H = kolumn 8).
- Måste skickas via `processSheet` så vi har tillgång till `unit`. Den körs redan per aggregat i exportloopen.

**Placeholder-listan (`src/lib/excelPlaceholders.ts`):**
- `UnitData` behöver inte ändras (rutnätet exporteras inte via platshållare).
- `unitFields` slutar mappa `notes`/`ratedPower`/`airflow`/`qNozzle` är OK att behålla — de skadar inget. Vi gör inga ändringar här i denna omgång.

**ExcelTemplateManager / Settings:**
- Lägg till en kort notis i hjälp-rutan: *"Rutnätet för anmärkningar skrivs automatiskt till cellerna H21:T50 på varje aggregat-flik. Lämna det området tomt i mallen (formatera gärna med kantlinjer)."*

## Filer som ändras

- `src/lib/db.ts` — lägg till `gridCells?: string[][]` på `Unit`.
- `src/sections/UnitsSection.tsx` — ta bort Tekniska data + Anteckningar, lägg in `GridField`.
- `src/lib/excelExport.ts` — skriv `gridCells` till H21:T50 per duplicerad aggregat-flik.
- `src/components/ExcelTemplateManager.tsx` — uppdatera hjälptext (litet tillägg).

## Att vara medveten om

- **Ingen migration av gammal data**: tidigare ifyllda `notes`/`ratedPower`/`airflow`/customTechFields finns kvar i databasen men visas inte. Om du vill att de ska migreras in i rutnätet (t.ex. notes → cell H21) säg till — annars lämnar vi dem orörda.
- **Mallens H21:T50 ska vara tomt** i din Excel-mall (men gärna formaterat med kantlinjer för snyggt utseende — formateringen bevaras).
- **Prestanda**: 390 inputs per aggregat är hanterbart men inte gratis. Vi använder okontrollerade uppdateringar via lokal `form`-state precis som idag, så det ska gå smidigt.
