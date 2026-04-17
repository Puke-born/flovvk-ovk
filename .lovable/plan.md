
## Plan: Stöd för flera besiktningsmän + certifieringsnummer & signatur

### Ändringar

**1. Datamodell (`src/lib/db.ts`)**
- Ändra `inspector` från single-record till en lista: ny tabell `inspectors` (`id, name`).
- Lägg till fält på `Inspector`: `certificationNumber?: string` och `signature?: string` (base64 PNG från canvas).
- Bump Dexie till `version(2)` med migration som flyttar befintlig `inspector`-post (id="inspector") till nya `inspectors`-tabellen så inget data försvinner.
- På `Inspection`: lägg till `inspectorId?: string` + nya snapshot-fält `inspectorCertificationNumber` och `inspectorSignature`.
- `createInspection()` uppdateras att ta `inspectorId` (default = senast använda / första i listan) och kopiera in alla fält som snapshot.

**2. Inställningar (`src/pages/SettingsPage.tsx`)**
- Ersätt `InspectorForm` med en `InspectorList` (samma mönster som `ContactList` för ägare/driftansvariga):
  - Lista över besiktningsmän med "Lägg till" / redigera / radera.
  - Öppnar en `InspectorDialog` med alla fält + signatur-pad.

**3. Ny komponent: `InspectorDialog`**
- Modal med fält: Namn, Behörighet, **Certifieringsnummer** (ny, bredvid Behörighet i 2-kolumns grid), Företag, Telefon, E-post, Adress, Postnr, Ort.
- **Signatur-pad**: `<canvas>` med pointer events (touch + mus), "Rensa"-knapp. Sparas som base64 PNG via `canvas.toDataURL()`. Visar befintlig signatur som bild när man redigerar.

**4. Val av besiktningsman per besiktning**
- I `InspectionHeaderForm.tsx`: lägg till en dropdown "Besiktningsman" som listar alla från `inspectors`-tabellen. Vid val → snapshot kopieras till inspection-recordet (samma princip som ägare/driftansvarig).
- "Hantera besiktningsmän"-länk till `/settings`.

**5. Intyg + PDF-export (`src/sections/IntygView.tsx`, `src/lib/pdf.ts`)**
- Visa certifieringsnummer i footern bredvid behörighet.
- Rendera signatur-bilden i Intyg-vyn (ovanför namnet, som i PDF-mallen).
- I `exportIntygPdf`: bädda in signatur som bild via `doc.addImage(signature, "PNG", x, y, w, h)` och skriv ut certifieringsnummer.

### Tekniska detaljer
- Signatur-pad: vanilla canvas (~80 rader), inget extra paket. Storlek ~400×120 px, vit bakgrund, svart streck.
- Dexie v2-migration: `this.version(2).stores({ inspectors: "id, name", ... }).upgrade(async tx => { const old = await tx.table("inspector").get("inspector"); if (old) await tx.table("inspectors").add(old); })`. Behåller gamla `inspector`-tabellen tom för bakåtkompatibilitet (eller droppar den).
- Befintliga besiktningar behåller sina inspector-snapshots oförändrade.

### Påverkade filer
- `src/lib/db.ts` (schema + types + migration)
- `src/pages/SettingsPage.tsx` (ersätt InspectorForm med lista)
- `src/components/InspectorDialog.tsx` (ny)
- `src/components/SignaturePad.tsx` (ny)
- `src/sections/InspectionHeaderForm.tsx` (välj besiktningsman)
- `src/sections/IntygView.tsx` (visa cert.nr + signatur)
- `src/lib/pdf.ts` (cert.nr + signatur i PDF)
