
Lägg till stöd för anpassade fält under "Tekniska data":
- Lägg till `customTechFields: { id, label, value }[]` på `Unit` i `db.ts`.
- I `UnitsSection.tsx` Section "Tekniska data": rendera de anpassade fälten efter de fasta (Märkeffekt, Luftmängd, Q-dysa). Varje custom-fält har en redigerbar rubrik (liten input ovanför värdet eller inline label-edit) + värde + radera-knapp.
- "Lägg till fält"-knapp under Tekniska data.
- Q-dysa behålls som standardfält (annars förlorar befintliga besiktningar data) — om användaren inte vill ha det kan de lämna det tomt.
