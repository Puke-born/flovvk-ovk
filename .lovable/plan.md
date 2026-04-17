## OVK-besiktningsapp för Surfplatta (android)

En installerbar webbapp (manifest + ikoner) för OVK-besiktningar, optimerad för surfplatta. All data sparas lokalt i IndexedDB så inget försvinner mellan sessioner. Inget service worker / offline-cache i version 1 (för att undvika problem i Lovable-preview), men appen är "Add to Home Screen"-bar och fungerar fullständigt mot lokal data när den väl är laddad.

### Arbetsflöde

1. Startsida → "Ny besiktning" eller fortsätt på pågående.
2. Fyll i fastighets-/uppdragsdata (Fastighetsbeteckning, byggår, adress, fastighetsägare, driftansvarig, besiktningsman m.m.).
3. Lägg till obegränsat antal **aggregat-kort** under besiktningen.
4. Växla snabbt mellan aggregaten via en flik-/sidolist.
5. Öppna **Intyg-vyn** → ser sammanställningstabell över alla aggregat.
6. **Exportera PDF** (Intyg + Protokoll) som matchar mallen → spara/dela från surfplatta.
7. Efter export: möjlighet att arkivera/rensa besiktningen så listan hålls ren.

### Vyer

**1. Startsida (Besiktningar)**

- Lista över pågående besiktningar (kort med fastighetsbeteckning, datum, antal aggregat).
- Knapp "Ny besiktning".
- Möjlighet att radera/arkivera färdiga besiktningar.

**2. Besiktningsöversikt**

- Header med fastighetsdata + besiktningsman.
- Sökbara dropdowns för **Fastighetsägare** och **Driftansvarig** (förskriven lista, autofyller telefon/adress/postnr/e-post; "Lägg till ny" sparar i listan för framtida bruk).
- Tabbar: **Aggregat** | **Intyg** | **Inställningar**.

**3. Aggregat-vy (MVP-fält)**
Stora touch-vänliga inputs grupperade som i Excel-mallen:

- **Systembeteckning** (A14), Drifttider, Besiktningsintervall (3/6 år), Aggregat, **Aggregatplacering** (F16), Antal lägenheter
- **Fastighetsbeteckning** (J7), Byggår, Adress, Postnr, Bygg.ID, Byggnorm
- Typ av ventilation, Betjänad yta, Verksamhet
- Typ av besiktning, Besiktningsdatum, Ombesiktningsdag, Nästa ord. besiktningsdatum, Föregående besiktningsdatum
- Märkeffekt, Luftmängd, Q-dysa
- **Aggregatstatus** (K52) – dropdown: God / Äldre, bör bytas / Normalskick / Underhållsbehov / Visst underhållsbehov / Stort underhållsbehov / Remdrift (Byt till direktdriven EC-fläkt)
- **Bytesintervall** (K53) – dropdown: 0–2 år / 2–5 år / 5–10 år / 10 år eller mer / Snarast / Vid behov
- Besiktningsutlåtande (G/EG)
- Anteckningar / Övriga anmärkningar (fritext)

Vänsterkant: lista över aggregat i besiktningen + "Lägg till aggregat"-knapp. Tap för att växla. Swipe/long-press för att duplicera eller ta bort.

**4. Intyg-vy**

- Layout som efterliknar `Intyg.pdf` (sida 4 i exemplet).
- Header: Fastighetsbet./Kv.namn, Adress, Byggnad.
- Tabell auto-genererad från aggregaten (motsvarar rad 9–21 i Excel): System | Betjänar | Utfall (G/EG) | Besiktningsdatum | Nästa ord. besiktning.
- Footer: besiktningsman, behörighet, telefon, e-post, företag, adress.
- "Exportera PDF"-knapp.

**5. PDF-export**

- Genererar **Intyg** (sida-fyllande tabell + signaturfält) som matchar mallen.
- Genererar **Protokoll** (en sida per aggregat) med fastighetsblock, aggregatblock, status, bytesintervall, anteckningar – stilmässigt matchande PDF-exemplet.
- Klientsidan: pdfmake/jspdf så det funkar offline efter att sidan är laddad.
- Filnamn: `OVK_<Fastighetsbeteckning>_<datum>.pdf`.

### Lagring

- **IndexedDB** (via Dexie) – tål stora datamängder och bilder, persistent över sessioner.
- Schema: `inspections`, `units` (aggregat), `propertyOwners`, `operationsManagers`, `inspector` (ett enda inspektörs-record).
- Inställningar-vy för att hantera den förskrivna listan över fastighetsägare/driftansvariga och besiktningsmannens uppgifter (förifylls automatiskt på nya besiktningar).
- Auto-spara vid varje fältändring (debouncad), tydlig "Sparat ✓"-indikator.

### Installerbarhet (PWA-light)

- `manifest.webmanifest` med namn, ikoner (192/512), `display: standalone`, theme color.
- En `/install`-sida med instruktioner: *"Tryck på Installera app i Chrome → Lägg till på hemskärmen"*.
- **Ingen service worker** – undviker preview-problem och stale cache.

### Designprinciper (touch-optimerat)

- Min. 44px touch-targets, generös padding mellan fält.
- Stora typsnitt (16px+ inputs så iOS inte zoomar in).
- Sticky header med besiktningsnamn + tab-switch.
- Light theme, FST-inspirerad röd/svart accent (matchar logon i exemplet).
- Sidolist kollapsar till bottom-bar i porträttläge.

### Out of scope (v1)

- Service worker / "riktig" offline-cache.
- Fullständig checklista 1.1–9.1 med √-markering (kommer i v2).
- Foton/bilagor på aggregat.
- Synk mellan enheter / molnlagring.
- Historik över exporterade besiktningar.