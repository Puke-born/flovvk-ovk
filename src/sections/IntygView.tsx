import { useLiveQuery } from "dexie-react-hooks";
import { FileDown } from "lucide-react";
import { db, type Inspection } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportIntygPdf, exportProtokollPdf } from "@/lib/pdf";
import { toast } from "sonner";

interface Props {
  inspection: Inspection;
}

export function IntygView({ inspection }: Props) {
  const units = useLiveQuery(
    () => db.units.where("inspectionId").equals(inspection.id).sortBy("order"),
    [inspection.id],
    [],
  );
  const owner = useLiveQuery(
    () => (inspection.propertyOwnerId ? db.propertyOwners.get(inspection.propertyOwnerId) : undefined),
    [inspection.propertyOwnerId],
  );
  const ops = useLiveQuery(
    () => (inspection.operationsManagerId ? db.operationsManagers.get(inspection.operationsManagerId) : undefined),
    [inspection.operationsManagerId],
  );
  const inspector = useLiveQuery(
    () => (inspection.inspectorId ? db.inspectors.get(inspection.inspectorId) : undefined),
    [inspection.inspectorId],
  );

  const ctx = { inspection, units: units ?? [], propertyOwner: owner, operationsManager: ops, inspector };

  const handleIntyg = () => {
    if (!inspection.propertyDesignation) {
      toast.error("Fyll i fastighetsbeteckning först");
      return;
    }
    exportIntygPdf(ctx);
  };
  const handleProtokoll = () => {
    if (!inspection.propertyDesignation) {
      toast.error("Fyll i fastighetsbeteckning först");
      return;
    }
    if ((units ?? []).length === 0) {
      toast.error("Lägg till minst ett aggregat");
      return;
    }
    exportProtokollPdf(ctx);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleIntyg} size="lg" className="touch-button h-14 flex-1">
          <FileDown className="h-5 w-5 mr-2" />
          Exportera Intyg (PDF)
        </Button>
        <Button onClick={handleProtokoll} size="lg" variant="outline" className="touch-button h-14 flex-1">
          <FileDown className="h-5 w-5 mr-2" />
          Exportera Protokoll (PDF)
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 sm:px-6 py-4">
          <div className="text-xs uppercase tracking-wider opacity-80">Intyg</div>
          <h2 className="text-xl sm:text-2xl font-bold">
            OVK – Obligatorisk ventilationskontroll
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <section>
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">Fastighet</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Row k="Fastighetsbeteckning" v={inspection.propertyDesignation} />
              <Row k="Byggår" v={inspection.buildingYear} />
              <Row
                k="Adress"
                v={[inspection.address, inspection.postalCode, inspection.city].filter(Boolean).join(", ")}
              />
              <Row k="Byggnorm" v={inspection.buildingNorm} />
              {owner && <Row k="Fastighetsägare" v={owner.name} />}
              {ops && <Row k="Driftansvarig" v={ops.name} />}
            </dl>
          </section>

          <section>
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Aggregat ({units?.length ?? 0})
            </h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Betjänar</TableHead>
                    <TableHead>Utfall</TableHead>
                    <TableHead>Besiktningsdatum</TableHead>
                    <TableHead>Nästa ord.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units && units.length > 0 ? (
                    units.map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>{u.systemDesignation || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {[u.placement, u.servedArea].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell>
                          {u.verdict ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                u.verdict === "G"
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              {u.verdict}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{u.inspectionDate || "—"}</TableCell>
                        <TableCell>{u.nextOrdinaryDate || "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Inga aggregat ännu.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">Besiktningsman</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Row k="Namn" v={inspection.inspectorName ?? inspector?.name} />
              <Row k="Behörighet" v={inspection.inspectorAuthorization ?? inspector?.authorization} />
              <Row
                k="Certifieringsnummer"
                v={inspection.inspectorCertificationNumber ?? inspector?.certificationNumber}
              />
              <Row k="Företag" v={inspection.inspectorCompany ?? inspector?.company} />
              <Row k="Telefon" v={inspection.inspectorPhone ?? inspector?.phone} />
              <Row k="E-post" v={inspection.inspectorEmail ?? inspector?.email} />
            </dl>
            {(inspection.inspectorSignature ?? inspector?.signature) && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Signatur
                </div>
                <img
                  src={inspection.inspectorSignature ?? inspector?.signature}
                  alt="Signatur"
                  className="h-20 object-contain bg-background border rounded"
                />
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex gap-2 py-1 border-b last:border-0">
      <dt className="text-muted-foreground min-w-[140px]">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}
