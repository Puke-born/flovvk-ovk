# Korrekt beräkning av "Nästa ord. besiktning"

Idag räknas nästa besiktning alltid som besiktningsdatum + intervall. Det bryter mot Boverkets regler när en besiktning görs för sent — då ska den ursprungliga cykeln behållas.

## Ny logik (per aggregat)

1. Är det en förstagångsbesiktning (typ = FB) eller saknas föregående besiktningsdatum: nästa datum = besiktningsdatum + intervall.
2. Annars räknas ut när besiktningen senast skulle ha gjorts: föregående datum + intervall.
3. Besiktningen gjord i tid eller tidigt: nästa datum = besiktningsdatum + intervall.
4. Besiktningen gjord för sent: nästa datum = nästa giltiga datum i den ursprungliga cykeln (föregående datum + intervall, upprepat med intervallet tills datumet ligger efter besiktningsdatumet).

Beräkningen görs separat för varje aggregat, eftersom intervall och historik kan skilja sig. Fältet kan fortfarande skrivas över manuellt; automatiken tar över igen först när man inte gjort en egen ändring.

Inget nytt fält läggs till i sidhuvudet.

## Teknisk detalj

- Ny funktion `calculateNextInspectionDate({ inspectionDate, previousDate, intervalYears, isFirstInspection })` i `src/lib/utils.ts`, med hjälpfunktion för årsaddition (skottårssäker) och ISO-datum (`YYYY-MM-DD`) in/ut.
- `src/sections/UnitsSection.tsx`: den befintliga effekten som sätter `nextOrdinaryDate` byts till att anropa funktionen; beroendelistan utökas med `previousInspectionDate` och `inspectionType`. Lokala `addYears` behålls bara om den används på annat håll.
- Enhetstester i `src/test/` för i tid, för tidigt, försenat (ett och flera intervall) samt FB/tomt föregående datum.
