import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, updateInspection, assignInspector, uid, type Contact, type Inspection } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { ContactPicker } from "@/components/ContactPicker";
import { ContactDialog } from "@/components/ContactDialog";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  inspection: Inspection;
}

export function InspectionHeaderForm({ inspection }: Props) {
  const owners = useLiveQuery(() => db.propertyOwners.toArray(), [], []);
  const ops = useLiveQuery(() => db.operationsManagers.toArray(), [], []);
  const inspectors = useLiveQuery(() => db.inspectors.toArray(), [], []);

  const [form, setForm] = useState({
    propertyDesignation: inspection.propertyDesignation ?? "",
    buildingYear: inspection.buildingYear ?? "",
    address: inspection.address ?? "",
    postalCode: inspection.postalCode ?? "",
    city: inspection.city ?? "",
    buildingId: inspection.buildingId ?? "",
    buildingNorm: inspection.buildingNorm ?? "",
  });

  // sync if external change
  useEffect(() => {
    setForm({
      propertyDesignation: inspection.propertyDesignation ?? "",
      buildingYear: inspection.buildingYear ?? "",
      address: inspection.address ?? "",
      postalCode: inspection.postalCode ?? "",
      city: inspection.city ?? "",
      buildingId: inspection.buildingId ?? "",
      buildingNorm: inspection.buildingNorm ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.id]);

  useDebouncedEffect(
    () => {
      updateInspection(inspection.id, form);
    },
    [form],
    400,
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [ownerDialog, setOwnerDialog] = useState(false);
  const [opsDialog, setOpsDialog] = useState(false);

  const selectedOwner = (owners ?? []).find((c) => c.id === inspection.propertyOwnerId);
  const selectedOps = (ops ?? []).find((c) => c.id === inspection.operationsManagerId);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Fastighet & uppdrag</h2>
        <span className="text-xs text-muted-foreground">Auto-sparas</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field
          label="Fastighetsbeteckning *"
          value={form.propertyDesignation}
          onChange={(e) => set("propertyDesignation", e.target.value)}
          containerClassName="sm:col-span-2 lg:col-span-1"
        />
        <Field label="Byggår" value={form.buildingYear} onChange={(e) => set("buildingYear", e.target.value)} />
        <Field label="Bygg.ID" value={form.buildingId} onChange={(e) => set("buildingId", e.target.value)} />
        <Field
          label="Adress"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          containerClassName="sm:col-span-2"
        />
        <Field label="Postnr" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        <Field label="Ort" value={form.city} onChange={(e) => set("city", e.target.value)} />
        <Field label="Byggnorm" value={form.buildingNorm} onChange={(e) => set("buildingNorm", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <ContactPicker
            label="Fastighetsägare"
            value={inspection.propertyOwnerId}
            contacts={owners ?? []}
            onSelect={(id) => updateInspection(inspection.id, { propertyOwnerId: id })}
            onAddNew={() => setOwnerDialog(true)}
          />
          {selectedOwner && <ContactPreview c={selectedOwner} />}
        </div>
        <div className="space-y-2">
          <ContactPicker
            label="Driftansvarig"
            value={inspection.operationsManagerId}
            contacts={ops ?? []}
            onSelect={(id) => updateInspection(inspection.id, { operationsManagerId: id })}
            onAddNew={() => setOpsDialog(true)}
          />
          {selectedOps && <ContactPreview c={selectedOps} />}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Besiktningsman
          </Label>
          <Link to="/settings" className="text-xs text-primary hover:underline">
            Hantera besiktningsmän
          </Link>
        </div>
        {(inspectors ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Inga besiktningsmän upplagda.{" "}
            <Link to="/settings" className="text-primary hover:underline">
              Lägg till en
            </Link>
            .
          </div>
        ) : (
          <Select
            value={inspection.inspectorId ?? "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") {
                updateInspection(inspection.id, {
                  inspectorId: undefined,
                  inspectorName: undefined,
                  inspectorAuthorization: undefined,
                  inspectorCertificationNumber: undefined,
                  inspectorSignature: undefined,
                  inspectorPhone: undefined,
                  inspectorEmail: undefined,
                  inspectorCompany: undefined,
                  inspectorAddress: undefined,
                  inspectorPostalCode: undefined,
                  inspectorCity: undefined,
                });
              } else {
                assignInspector(inspection.id, v);
              }
            }}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Välj besiktningsman…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">— ingen vald —</span>
              </SelectItem>
              {(inspectors ?? []).map((i) => (
                <SelectItem key={i.id} value={i.id} className="text-base py-3">
                  {i.name}
                  {i.certificationNumber ? ` · ${i.certificationNumber}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {inspection.inspectorName && (
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <div className="font-medium">{inspection.inspectorName}</div>
            <div className="text-muted-foreground">
              {[
                inspection.inspectorAuthorization,
                inspection.inspectorCertificationNumber &&
                  `Cert.nr ${inspection.inspectorCertificationNumber}`,
                inspection.inspectorCompany,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {inspection.inspectorSignature && (
              <img
                src={inspection.inspectorSignature}
                alt="Signatur"
                className="h-12 mt-1 object-contain"
              />
            )}
          </div>
        )}
      </div>

      <ContactDialog
        open={ownerDialog}
        onOpenChange={setOwnerDialog}
        title="Ny fastighetsägare"
        onSave={async (data) => {
          const id = uid();
          await db.propertyOwners.add({ id, ...data });
          await updateInspection(inspection.id, { propertyOwnerId: id });
        }}
      />
      <ContactDialog
        open={opsDialog}
        onOpenChange={setOpsDialog}
        title="Ny driftansvarig"
        onSave={async (data) => {
          const id = uid();
          await db.operationsManagers.add({ id, ...data });
          await updateInspection(inspection.id, { operationsManagerId: id });
        }}
      />
    </Card>
  );
}

function ContactPreview({ c }: { c: Contact }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-sm space-y-0.5">
      {c.contactPerson && <div>{c.contactPerson}</div>}
      {(c.address || c.postalCode || c.city) && (
        <div className="text-muted-foreground">
          {[c.address, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
        </div>
      )}
      <div className="text-muted-foreground">
        {[c.phone, c.email].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}
