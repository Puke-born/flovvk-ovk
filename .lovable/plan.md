# Excel-likt rutnät i Anmärkningar

Mål: `RemarksGrid` ska bete sig som Excel — navigering, visning av lång text, redigeringsläge, selektion, klipp/klistra. All ändring sker i `src/sections/UnitsSection.tsx` (ev. brytas ut till egen fil) — ingen ändring av datalager eller export.

## Beteenden som ska implementeras

### 1. Två lägen per cell: "selected" och "editing" (som Excel)

- **Selected**: cellen har fokus men input är inte aktiv. Pilar flyttar selektion. Text visas som overlay och får flöda över tomma grannar (befintligt beteende).
- **Editing**: aktiveras genom dubbelklick, `F2`, `Enter`, eller direktinmatning (bokstav/siffra). Visar input med synlig text + caret. `Esc` avbryter (återställer värdet), `Enter` bekräftar.
- Implementeras med två states: `active: {r,c}` och `editing: boolean`. Endast en `<input>` renderas i hela griden — för den aktiva cellen. Övriga celler är rena `<td>` med overlay-text.

### 2. Tangentbordsnavigering

- `←↑→↓` flyttar selektionen.
- `Tab` / `Shift+Tab` → höger/vänster.
- `Enter` i selektion → starta redigering. `Enter` i redigering → bekräfta och flytta ner.
- `Esc` → avbryt redigering, behåll selektion.
- `Home` / `End` → början/slutet av raden. `Ctrl+Home/End` → A1 / sista cell.
- `Delete` / `Backspace` på selekterad (icke-edit) cell → töm cellen.
- Direkt bokstavs-/sifferinmatning på selekterad cell → starta redigering och ersätt värdet.

### 3. Visning av lång text (Excel overflow-regel)

- Om cellen inte är i fokus och nästa cell(er) till höger är tomma → texten får flöda över dem (overlay med `width: max-content`, redan på plats).
- Om nästa cell innehåller text → den aktuella cellens text klipps vid cellgränsen (`overflow: hidden; text-overflow: clip`). Implementeras genom att overlay får `max-width` = bredden på alla efterföljande tomma celler i samma rad.
- Vid redigering: input växer/scrollar internt så all text är tillgänglig (`overflow-x: auto`), men cellen behåller sin layout-bredd (samma som Excel).

### 4. Visuell selektion

- Selekterad cell får tjock primary-färgad ram (2px) ovanpå befintliga svarta gridlines, utan att flytta layout (använd `box-shadow: inset 0 0 0 2px hsl(var(--primary))`).
- Radnummer och kolumnbokstav för aktiv cell highlightas i sticky headern.

### 5. Klipp / kopiera / klistra

- `Ctrl+C` / `Ctrl+X` på selekterad cell → skriver värdet till clipboard (`navigator.clipboard.writeText`). `Cut` tömmer cellen efter.
- `Ctrl+V` → läser text från clipboard. Om texten innehåller `\t` eller `\n` → tolkas som ett område och fyller flera celler med start i aktiv cell (Excel-paste-beteende). Annars enkel cellfyllning.

### 6. Autoscroll och sticky headers

- När selektionen flyttas utanför viewport scrollas containern så cellen blir synlig (`scrollIntoView({ block: "nearest", inline: "nearest" })`).
- Sticky kolumn- och radhuvuden behålls (redan på plats).

### 7. Sammanfogade celler (B21:L21 osv.)

- Befintlig "merge"-logik (`inMerge`-borders) behålls. Selektion på en merge-cell behandlar hela det sammanfogade området som en enhet: pilnavigering hoppar över interna celler i samma merge, och overlay/input renderas i merge-startcellen med bredd = summan av kolumnbredderna.
- Detaljerad merge-karta (samma som `excelExport.ts` använder) extraheras till en konstant så grid och export delar källan.

## Filer som ändras

- `src/sections/UnitsSection.tsx` — `RemarksGrid` byggs om enligt ovan. Om filen blir för stor: bryt ut till `src/sections/RemarksGrid.tsx`.
- (Eventuellt) ny `src/lib/gridMerges.ts` för delad merge-karta om vi vill att grid och export ska dela den. Annars hårdkodas en lokal karta i `RemarksGrid`.

## Det här ändras INTE

- Datastrukturen (`gridCells: string[][]`) — oförändrad.
- `excelExport.ts` — läser fortsatt direkt från `gridCells`.
- Prefill av "Märkeffekt:" / "Luftmängd:" — bibehålls.

## Verifiering

1. Klicka cell I21 → selekterad (blå ram). Pil höger → I22 selekterad.
2. Skriv direkt "5 kW" → cellen går i edit-läge, ersätter "Märkeffekt:". `Esc` återställer.
3. Skriv lång text i tom cell → texten flödar över tomma celler till höger. Fyll en cell till höger → texten klipps automatiskt.
4. `Ctrl+C` på en cell, navigera, `Ctrl+V` → värdet klistras in. Kopiera flera celler från Excel och klistra in → fyller område.
5. `Delete` på selekterad cell → tömmer.
6. Selektion följs av scroll när man pilar utanför viewport.
7. Export oförändrad: samma `gridCells` skrivs till mallen.

## Öppen fråga

Vill du även ha **musdrag för att markera ett område** (flera celler) med `Ctrl+C` på området? Det är märkbart mer kod (range-selection state + range paste). Om "ja" lägger jag till det; om "nej, en cell i taget räcker" hoppar jag över för enkelhetens skull. Svar: Nej.