## Mål

Få rutnätet i UnitsSection att visuellt matcha Excel-mallen (H–T, rad 21–50) med korrekta kolumnbredder, radhöjd och svarta kantlinjer.

## Mått från Excel → CSS

Excel-kolumnbredd `w` ≈ `w*7 + 5` px (default-font). Radhöjd 12,75 pt ≈ 17 px.

| Col | Excel w | px |
|-----|--------:|---:|
| H | 3,43 | 29 |
| I | 9,43 | 71 |
| J | 8,43 | 64 |
| K | 8,43 | 64 |
| L | 3,00 | 26 |
| M | 2,57 | 23 |
| N | 1,00 | 12 |
| O | 1,43 | 15 |
| P | 1,14 | 13 |
| Q | 3,71 | 31 |
| R | 2,14 | 20 |
| S | 2,86 | 25 |
| T | 3,14 | 27 |

Total bredd ≈ 420 px + radnummer-kolumn (~32 px) ≈ 452 px.
Radhöjd: 17 px (alla 30 rader).

## Visuella ändringar (`src/sections/UnitsSection.tsx` – `RemarksGrid`)

- Byt ut nuvarande `<table>` med jämna kolumner mot `<table style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>` och en `<colgroup>` med en `<col>` per kolumn där `width` sätts i px enligt tabellen ovan. Första kolumnen är radnummer (32 px).
- Rubrikrad visar `H I J K L M N O P Q R S T` (Excel-bokstäver istället för 1–13) för att matcha Excel-fönstret på bilden. Bakgrund `bg-muted`, font `text-xs`, centrerad.
- Radnummer-kolumn visar `21`–`50` (Excel-radnummer), sticky vänster, `bg-muted`, `text-xs`, höger-justerad med liten padding.
- Varje cell: höjd 17 px (`h-[17px]`), `p-0`. Inputen inuti: `h-full w-full border-0 bg-transparent px-1 text-xs leading-none focus:outline-none focus:ring-1 focus:ring-ring`.
- **Svarta kantlinjer**: alla `<td>`/`<th>` får `border border-black` (1 px). `borderCollapse: collapse` gör att linjerna inte dubblas. Använd direkt `border-black` (inte semantic token) eftersom det är en visuell Excel-replika och ska se identisk ut i light/dark.
- Wrappern runt tabellen får `overflow-x-auto` så mobil fungerar, samt `inline-block` så tabellen inte sträcks ut.
- Inga ändringar i datamodell, debouncing, eller export — bara CSS/markup i `RemarksGrid`.

## Filer som ändras

- `src/sections/UnitsSection.tsx` — uppdatera `RemarksGrid`-komponenten enligt ovan.

Inga ändringar i `excelExport.ts`, `db.ts` eller mallen.
