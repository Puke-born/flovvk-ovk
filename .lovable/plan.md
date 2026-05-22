## Mål

Få kantlinjerna i rutnätet att matcha Excel-bilden: kolumnerna I–S grupperas parvis vertikalt (rad 21+22, 23+24, …, 49+50) som "sammanslagna" block utan inre kantlinjer. Kolumn H, T och rubrik-/radnummerkolumnerna behåller alla sina linjer för tillfället, men för att efterlika målbilden ska även sträcken mellan 21+22, osv bort även i H och T.

## Regler per cell (rad r = 0..29, kol c = 0..12 där 0=H, 12=T)

Block = rader I–S (c ∈ 1..11) parade som (0,1), (2,3), …, (28,29).

Inom ett block, behåll bara den yttre ramen:

- **Topp**: visa om `r % 2 === 0` (övre raden i paret) eller om c utanför 1..11.
- **Botten**: visa om `r % 2 === 1` (nedre raden i paret) eller om c utanför 1..11.
- **Vänster**: visa om `c === 1` (vänsterkant av I-blocket) eller om c utanför 1..11. Dvs alla vertikala linjer mellan I–S inuti blocket göms.
- **Höger**: visa om `c === 11` (högerkant av S-blocket) eller om c utanför 1..11.

Kolumn H (c=0) och T (c=12) behåller alla fyra kanter som idag förtillfället. Rubrikraden och radnummerkolumnen oförändrade (alla linjer kvar).

Implementeras genom att sätta individuella `borderTop/Right/Bottom/Left: "1px solid black"` per `<td>` istället för shorthand `border`. Ingen ändring i export, datamodell eller proportioner.

## Filer

- `src/sections/UnitsSection.tsx` — uppdatera `RemarksGrid` cell-rendering med per-sida border-logik enligt ovan.