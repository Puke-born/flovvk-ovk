import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Copy, X } from "lucide-react";
import {
  db,
  uid,
  addUnit,
  updateUnit,
  duplicateUnit,
  deleteUnit,
  STATUS_OPTIONS,
  REPLACEMENT_OPTIONS,
  VENT_TYPES,
  INSPECTION_TYPES,
  INSPECTION_INTERVALS,
  type Unit,
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/Field";
import { SelectField } from "@/components/SelectField";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  inspectionId: string;
}

export function UnitsSection({ inspectionId }: Props) {
  const units = useLiveQuery(
    () => db.units.where("inspectionId").equals(inspectionId).sortBy("order"),
    [inspectionId],
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (units && units.length > 0 && !units.find((u) => u.id === activeId)) {
      setActiveId(units[0].id);
    }
    if (units && units.length === 0) setActiveId(null);
  }, [units, activeId]);

  const active = units?.find((u) => u.id === activeId) ?? null;

  const handleAdd = async () => {
    const id = await addUnit(inspectionId);
    setActiveId(id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      {/* Sidebar */}
      <Card className="p-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Aggregat ({units?.length ?? 0})</h3>
        </div>
        <div className="space-y-1">
          {units?.map((u, i) => (
            <button
              key={u.id}
              onClick={() => setActiveId(u.id)}
              className={cn(
                "w-full text-left rounded-md px-3 py-3 min-h-[52px] text-sm transition-colors flex items-center gap-2",
                activeId === u.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold shrink-0",
                  activeId === u.id ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {i + 1}
              </span>
              <span className="truncate flex-1">{u.systemDesignation || "Namnlös"}</span>
              {u.verdict && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                    u.verdict === "G"
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive",
                    activeId === u.id && "bg-primary-foreground/20 text-primary-foreground",
                  )}
                >
                  {u.verdict}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button onClick={handleAdd} className="w-full mt-3 touch-button" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Lägg till aggregat
        </Button>
      </Card>

      {/* Editor */}
      <div>
        {active ? (
          <UnitEditor key={active.id} unit={active} onDuplicate={async () => {
            const id = await duplicateUnit(active.id);
            if (id) {
              setActiveId(id);
              toast.success("Aggregat duplicerat");
            }
          }} onDelete={async () => {
            await deleteUnit(active.id);
            toast.success("Aggregat raderat");
          }} />
        ) : (
          <Card className="p-10 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Inga aggregat ännu.</p>
            <Button onClick={handleAdd} size="lg" className="touch-button">
              <Plus className="h-5 w-5 mr-2" />
              Lägg till första aggregatet
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function UnitEditor({
  unit,
  onDuplicate,
  onDelete,
}: {
  unit: Unit;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<Unit>(unit);

  useEffect(() => {
    setForm(unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  useDebouncedEffect(
    () => {
      const { id, inspectionId, createdAt, updatedAt, order, ...patch } = form;
      updateUnit(unit.id, patch);
    },
    [form],
    400,
  );

  const set = <K extends keyof Unit>(k: K, v: Unit[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">
          {form.systemDesignation || <span className="italic text-muted-foreground">Namnlöst aggregat</span>}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Radera
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Radera aggregat?</AlertDialogTitle>
                <AlertDialogDescription>Detta kan inte ångras.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="touch-button">Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  className="touch-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Radera
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Section title="System">
        <Field
          label="Systembeteckning *"
          value={form.systemDesignation}
          onChange={(e) => set("systemDesignation", e.target.value)}
          containerClassName="sm:col-span-2"
        />
        <Field label="Aggregat" value={form.aggregate ?? ""} onChange={(e) => set("aggregate", e.target.value)} />
        <Field
          label="Aggregatplacering *"
          value={form.placement ?? ""}
          onChange={(e) => set("placement", e.target.value)}
        />
        <SelectField
          label="Typ av ventilation"
          value={form.ventilationType ?? ""}
          onValueChange={(v) => set("ventilationType", v)}
          options={VENT_TYPES}
        />
        <Field label="Antal lägenheter" value={form.apartmentCount ?? ""} onChange={(e) => set("apartmentCount", e.target.value)} />
        <Field label="Drifttider" value={form.operatingHours ?? ""} onChange={(e) => set("operatingHours", e.target.value)} />
        <Field label="Betjänad yta" value={form.servedArea ?? ""} onChange={(e) => set("servedArea", e.target.value)} />
        <Field
          label="Verksamhet"
          value={form.business ?? ""}
          onChange={(e) => set("business", e.target.value)}
          containerClassName="sm:col-span-2"
        />
      </Section>

      <Section title="Besiktning">
        <SelectField
          label="Typ av besiktning"
          value={form.inspectionType ?? ""}
          onValueChange={(v) => set("inspectionType", v)}
          options={INSPECTION_TYPES}
        />
        <SelectField
          label="Besiktningsintervall"
          value={form.inspectionInterval ?? ""}
          onValueChange={(v) => set("inspectionInterval", v)}
          options={INSPECTION_INTERVALS}
          allowEmpty={false}
        />
        <Field
          label="Besiktningsdatum"
          type="date"
          value={form.inspectionDate ?? ""}
          onChange={(e) => set("inspectionDate", e.target.value)}
        />
        <Field
          label="Ombesiktningsdag"
          type="date"
          value={form.inspectionType === "OB" ? (form.reInspectionDate ?? "") : ""}
          onChange={(e) => set("reInspectionDate", e.target.value)}
          disabled={form.inspectionType !== "OB"}
          title={form.inspectionType !== "OB" ? "Välj 'OB' (ombesiktning) som typ för att aktivera" : undefined}
        />
        <Field
          label="Nästa ord. besiktning"
          type="date"
          value={form.nextOrdinaryDate ?? ""}
          onChange={(e) => set("nextOrdinaryDate", e.target.value)}
        />
        <Field
          label="Föregående besiktning"
          type="date"
          value={form.previousInspectionDate ?? ""}
          onChange={(e) => set("previousInspectionDate", e.target.value)}
        />
      </Section>

      <Section title="Anmärkningar">
        <div className="sm:col-span-2 lg:col-span-3">
          <RemarksGrid
            value={form.gridCells}
            onChange={(next) => set("gridCells", next)}
          />
        </div>
      </Section>

      <Section title="Bedömning">
        <SelectField
          label="Aggregatstatus"
          value={form.status ?? ""}
          onValueChange={(v) => set("status", v as Unit["status"])}
          options={STATUS_OPTIONS}
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Bytesintervall"
          value={form.replacementInterval ?? ""}
          onValueChange={(v) => set("replacementInterval", v as Unit["replacementInterval"])}
          options={REPLACEMENT_OPTIONS}
        />
        <SelectField
          label="Besiktningsutlåtande"
          value={form.verdict ?? ""}
          onValueChange={(v) => set("verdict", v as Unit["verdict"])}
          options={["G", "EG"]}
        />
      </Section>
    </Card>
  );
}

const GRID_ROWS = 30;
const GRID_COLS = 13;

function RemarksGrid({
  value,
  onChange,
}: {
  value: string[][] | undefined;
  onChange: (next: string[][]) => void;
}) {
  const getCell = (r: number, c: number) => value?.[r]?.[c] ?? "";
  const setCell = (r: number, c: number, v: string) => {
    const next: string[][] = (value ?? []).map((row) => [...(row ?? [])]);
    while (next.length <= r) next.push([]);
    const row = [...(next[r] ?? [])];
    while (row.length <= c) row.push("");
    row[c] = v;
    next[r] = row;
    onChange(next);
  };

  return (
    <div className="overflow-auto border border-border rounded-md max-h-[60vh]">
      <table className="border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            <th className="sticky left-0 z-20 bg-muted border border-border w-10 h-8 text-xs font-semibold text-muted-foreground"></th>
            {Array.from({ length: GRID_COLS }, (_, c) => (
              <th
                key={c}
                className="border border-border w-28 h-8 text-xs font-semibold text-muted-foreground"
              >
                {c + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: GRID_ROWS }, (_, r) => (
            <tr key={r}>
              <th className="sticky left-0 z-10 bg-muted border border-border w-10 h-8 text-xs font-semibold text-muted-foreground text-center">
                {r + 1}
              </th>
              {Array.from({ length: GRID_COLS }, (_, c) => (
                <td key={c} className="border border-border p-0">
                  <input
                    type="text"
                    value={getCell(r, c)}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    className="w-28 h-8 px-2 bg-transparent outline-none focus:bg-accent/40 text-sm"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wide text-primary mb-3 pb-1 border-b border-primary/20">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}
