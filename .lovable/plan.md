## Problem

Varje knapptryck i ett fält uppdaterar `form` i `UnitEditor`, vilket re-renderar hela editorn — inklusive `RemarksGrid` med 30×13 ≈ 390 celler. Varje cell gör dessutom en liten O(n)-loop för att räkna ut overflow-bredd, plus en absolut-positionerad overlay-div. Det är den dominerande kostnaden bakom lagget vid skrivning, dropdown-öppning och scroll (eftersom React commit + layout sker på varje tangent).

## Åtgärder (endast presentation/perf, ingen funktionsändring)

1. **Memoize `RemarksGrid`** med `React.memo`. Eftersom `value` (gridCells) bara byts när själva rutnätet ändras, kommer skrivning i andra fält inte längre att re-rendera 390 celler.

2. **Stabilisera `onChange`** som skickas in till `RemarksGrid` via `useCallback`, så memo-jämförelsen faktiskt håller. Använd `setForm(f => ...)` istället för att läsa `form` i closure.

3. **Förberäkna "tomma kolumner från höger" per rad** en gång per render av grid (en array `emptyRight[r][c]`) istället för att loopa inuti varje `renderCell`. Tar bort 390 små loopar.

4. **Memoize `renderCell`-resultatet per rad** är overkill — räcker med (1)+(3). Behåll övrig logik som den är.

5. **Mindre re-render i UnitEditor**: bryt ut `Section`-innehållen som behöver det inte — det räcker att grid är memo'd, eftersom Field/SelectField är billiga. Inga ändringar i Field/SelectField.

6. **Scrollag**: när grid inte längre re-renderar på varje tangent försvinner även scroll-jank (browsern slipper layouta om 390 celler). Inga övriga scroll-ändringar.

## Tekniska detaljer

Fil: `src/sections/UnitsSection.tsx`

- Wrap exporten: `const RemarksGrid = memo(function RemarksGridImpl({...}) {...})` med default shallow compare (value- och onChange-referens).
- I `UnitEditor`: `const handleGridChange = useCallback((next) => setForm(f => ({...f, gridCells: next})), [])`.
- I `RemarksGrid` render: bygg `const emptyRight = useMemo(...)` som för varje (r,c) säger hur många efterföljande tomma kolumner som finns; använd i `renderCell` istället för loopen.
- Behåll all befintlig navigering, redigering, copy/paste, kantlinjelogik och styling oförändrad.
