## Bakgrund

Texterna "Märkeffekt:" (I21) och "Luftmängd:" (I23) syns i den exporterade Excel-filen — men antingen är de inbakade i mallens celler eller skrivs från `gridCells`. I appens rutnät ser användaren dem inte. Två separata problem ska lösas:

1. **Datan finns inte (eller hinner inte synas) i `gridCells`** för existerande aggregat — prefill-effekten lagts in men verkar inte slå igenom visuellt.
2. **Overlay-texten i cellen renderas inte tydligt** — grannens `<input>` har ev. UA-bakgrund som täcker den utflödande texten, eller färgen ärvs inte.

Målet: när rutnätet ritas ska I21="Märkeffekt:" och I23="Luftmängd:" synas direkt, och exporten ska spegla exakt det som står i rutnätet (inga "osynliga" defaultvärden från mallen).

## Ändringar

### 1. Initiera `gridCells` när ett aggregat skapas (`src/lib/db.ts`)

I `addUnit` (och `duplicateUnit` om källan saknar dem) sätt:
```ts
gridCells: (() => {
  const g: string[][] = [];
  g[0] = []; g[0][1] = "Märkeffekt:";
  g[2] = []; g[2][1] = "Luftmängd:";
  return g;
})()
```
Då finns texterna i datan från sekund noll — ingen useEffect-race.

### 2. Säkerställ prefill för befintliga aggregat (`src/sections/UnitsSection.tsx`)

Behåll useEffect i `RemarksGrid`, men:
- Kör den synkront i samma render som värdet sätts (redan så).
- När `value` är `undefined`, hoppa över anropet (parent ska skicka ifylld array efter punkt 1) — då undviker vi att skriva på inläsning innan Dexie-svar.

### 3. Gör overlay-texten synlig (`src/sections/UnitsSection.tsx`)

I `RemarksGrid` cell-rendering:
- Lägg `text-foreground` på overlay-`<div>` så färgen är explicit.
- Säkerställ att `<input>` har `bg-transparent` (redan) **och** `[appearance:none]` så vissa webbläsares default-fält-bakgrund inte täcker grannens overlay.
- Lägg `colorScheme: "normal"` eller `style={{ background: "transparent" }}` inline som extra säkerhet.

### 4. Inga ändringar i `excelExport.ts`

`writeUnitGrid` skriver redan från `gridCells`. När punkt 1 är på plats kommer exporten att spegla rutnätet eftersom texterna då alltid finns där (inte längre beroende av att mallens cell råkar ha samma text).

## Filer

- `src/lib/db.ts` — initiera `gridCells` i `addUnit`.
- `src/sections/UnitsSection.tsx` — overlay får explicit färg, input får `appearance:none`/transparent bg, prefill-effekt hoppar över när `value` är `undefined`.

## Verifiering

1. Öppna ett befintligt aggregat → texterna ska visas i I21/I23 inom någon sekund (prefill-effekten kör).
2. Skapa nytt aggregat → texterna syns direkt utan blink.
3. Ändra "Märkeffekt:" till "Märkeffekt 5kW" i rutnätet → exportera → cell I21 i Excel = "Märkeffekt 5kW".
4. Töm I21 i rutnätet → exportera → cell I21 i Excel är tom (eller behåller mallens text om vi inte skriver tomma — bekräfta med användaren om tomma celler ska rensa mallens text också).

## Öppen fråga

Just nu hoppar `writeUnitGrid` över tomma celler för att bevara mallens formatering. Om användaren tömmer en cell i rutnätet vill de troligen att exporten också blir tom. Vill du att tomma celler i rutnätet ska skriva över mallens text (skriva tom sträng), eller behålla nuvarande beteende?
