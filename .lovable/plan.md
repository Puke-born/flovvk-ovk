

## Plan: Byggnormer i Inställningar

Lägg till en ny flik i Inställningar där användaren kan hantera en lista över byggnormer kopplade till årtal (t.ex. "1988 — SBN 80", "2012 — BBR 19"). Listan kan sedan användas som referens/uppslag när man fyller i `buildingNorm` på en besiktning.

### Ändringar

**1. Datamodell (`src/lib/db.ts`)**
- Ny interface `BuildingNorm { id: string; year: string; norm: string; note?: string }`.
- Ny Dexie-tabell `buildingNorms` med index `id, year`.
- Bump till `version(3)` (lägg till tabellen utan migration av data).

**2. Ny dialog (`src/components/BuildingNormDialog.tsx`)**
- Liknande mönster som `ContactDialog` / `InspectorDialog`.
- Fält: Årtal (number/text), Byggnorm (text), Anteckning (valfri textarea).
- Spara/Avbryt-knappar.

**3. Inställningssidan (`src/pages/SettingsPage.tsx`)**
- Lägg till en fjärde flik "Byggnormer" i `TabsList` (grid-cols-4).
- Ny komponent `BuildingNormList` som listar normerna sorterade på årtal (stigande), med Lägg till / Redigera / Radera, samma UI-mönster som `ContactList`.
- Varje rad visar `År — Norm` stort och eventuell anteckning som muted text.

### Inte med i detta steg (kan göras senare om önskas)
- Autoifyllning av `buildingNorm` i `InspectionHeaderForm` baserat på byggår (kräver designval kring exakt matchning vs. intervall).

### Påverkade filer
- `src/lib/db.ts` (ny tabell + interface + version-bump)
- `src/components/BuildingNormDialog.tsx` (ny)
- `src/pages/SettingsPage.tsx` (ny flik + lista)

