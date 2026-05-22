## Mål

Få text i en cell att flöda över intilliggande tomma celler (Excel-beteende). Idag klipps texten av eftersom `<input>` alltid klipper sitt innehåll vid sin egen bredd och täcks av nästa cell.

## Lösning

I `RemarksGrid` (src/sections/UnitsSection.tsx), byt ut nuvarande `<input>`-rendering mot en cell-wrapper som innehåller två lager:

1. **Overflow-overlay** (visas när cellen INTE är fokuserad):
   - `<div>` absolut-positionerad ovanpå cellen.
   - `white-space: nowrap`, `overflow: visible`, `pointer-events: none`.
   - Bredd: `width: max-content` (eller `width: auto`) så texten får sin naturliga längd.
   - `z-index` högre än grannceller men lägre än fokuserad input.
   - Visar `getCell(r, c)`.

2. **Input-lager** (alltid i DOM för tab/typing):
   - `<input>` med `position: absolute; inset: 0`.
   - `background: transparent`, `color: transparent` när inte fokuserad (för att inte dubbel-rita text), `color: inherit` på `:focus`.
   - På `:focus` får inputen `z-index` högst och `background: hsl(var(--background))` så man ser vad man skriver utan att grannceller stör.
   - Vid focus får cellen även förhöjt z-index så omkringliggande inte täcker.

Cell-`<td>` får `position: relative` och `overflow: visible`. Tabellens `overflow: visible` redan ok (containern har `overflow: auto`).

För att grannceller inte ska täcka overlay-texten: ge varje `<td>` `background` endast vid fokus. Tomma celler har `background: transparent` (vilket de redan har) så overflow-texten syns igenom dem.

## Detaljer

- Lägg till lokalt `focusedCell` state `{r,c} | null` i `RemarksGrid` för att kunna sätta z-index/bg vid fokus.
- Alt: använd CSS `:focus-within` på `<td>` istället för React-state — enklare, ingen rerender.
- Overlay text använder samma typografi som input (`text-xs`, samma padding `px-1`, samma höjd) så inget visuellt hopp vid focus/blur.
- Border-logiken är oförändrad.

## Filer

- `src/sections/UnitsSection.tsx` — uppdatera cell-rendering i `RemarksGrid`.

Inga ändringar i datamodell eller export.
