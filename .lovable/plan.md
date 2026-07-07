## Ändringar

### 1. `src/sections/InspectionHeaderForm.tsx` — Fastighet & uppdrag

Byt ut den nuvarande layouten (separat Arb.nr-rad + 6-kolumnersgrid) mot två grid-rader med 12-kolumners bas för att styra teckenbredder.

**Rad 1:** `Arb.nr` + `Bygg.ID` + `Byggår` + `Byggnorm`
- Arb.nr: smalt (col-span 2 av 12) — passar 5–6 tecken
- Bygg.ID: smalt (col-span 2) — passar ~6 tecken
- Byggår: mycket smalt (col-span 2) — passar 4 tecken
- Byggnorm: brett (col-span 6) — fyller resten

**Rad 2:** `Fastighetsbeteckning` + `Adress` + `Postnr` + `Ort`
- Fastighetsbeteckning: (col-span 4)
- Adress: (col-span 4)
- Postnr: smalt (col-span 2) — passar 6 tecken
- Ort: smalt (col-span 2) — passar 6–9 tecken

Ta bort den separata `<div className="mb-3">` som idag håller Arb.nr ovanför gridden. På mobil (< sm) faller allt tillbaka till 2 kolumner som idag.

### 2. `src/sections/UnitsSection.tsx` — Aggregat-kortets "System"-sektion

Byt fältordningen i `<Section title="System">` (rad 336–365) till tre logiska rader i ett 6-kolumners grid (som `Section` redan använder på sm+):

**Rad 1:** `Systembeteckning` + `Aggregat` + `Aggregatplacering` (span 2 vardera)

**Rad 2:** `Typ av ventilation` + `Ombyggnadsår` + `Drifttider` (span 2 vardera)

**Rad 3:** `Betjänad yta` + `Verksamhet` + `Antal lägenheter` (Antal lägenheter smalt eftersom det oftast är 2–3 tecken; ex. `servedArea` span 2, `business` span 3, `apartmentCount` span 1)

Detta flyttar `Verksamhet` upp bredvid `Betjänad yta` (istället för längst ner), och `Drifttider` hamnar bredvid `Typ av ventilation` som önskat. `Systembeteckning` tar inte längre halva raden ensamt.

### Notering
Inga ändringar av logik, datamodell, validering eller autofyllnad. Endast omordning/omdimensionering av fält. Mobilt (< sm) fortsätter fälten stapla i en/två kolumner.
