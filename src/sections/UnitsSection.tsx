import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Copy } from "lucide-react";
import {
  db,
  addUnit,
  updateUnit,
  duplicateUnit,
  deleteUnit,
  STATUS_OPTIONS,
  REPLACEMENT_OPTIONS,
  INSPECTION_INTERVALS,
  type Unit,
} from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BufferedField } from "@/components/Field";
import { SelectField, type SelectOption } from "@/components/SelectField";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import { cn } from "@/lib/utils";

const VENT_TYPE_LABELS: Record<string, string> = {
  S: "S - Självdrag",
  F: "F - Mekanisk frånluft",
  FT: "FT - Mekanisk från- och tilluft",
  FX: "FX - Mekanisk frånluft med återvinning",
  FTX: "FTX - Mekanisk från- och tilluft med återvinning",
};
const VENT_TYPE_ORDER = ["S", "F", "FT", "FX", "FTX"] as const;

const INSPECTION_TYPE_OPTIONS: SelectOption[] = [
  { value: "FB", label: "FB - Första besiktning" },
  { value: "ÅB", label: "ÅB - Återkommande besiktning" },
  { value: "OB", label: "OB - Ombesiktning" },
];

const VERDICT_OPTIONS: SelectOption[] = [
  { value: "G", label: "G - Godkänd" },
  { value: "EG", label: "EG - Ej godkänd" },
];

// Vårdlokaler & skol-/utbildningslokaler → 3 år oavsett ventilationstyp
const CARE_FACILITY_KEYWORDS = [
  // Skol- och utbildningsverksamhet
  "skola", "skolor", "förskola", "forskola", "fritidshem", "fritids",
  "universitet", "högskola", "hogskola", "lärosäte", "larosate",
  "komvux", "vuxenutbildning", "yrkeshögskola", "yrkeshogskola",
  "folkhögskola", "folkhogskola", "kulturskola", "musikskola",
  "naturbruksgymnasi", "sfi", "lägergård", "lagergard", "naturskola",
  "föreläsningssal", "forelasningssal", "undervisningslokal", "studentlaboratori",
  // Vårdlokaler
  "vårdcentral", "vardcentral", "hälsocentral", "halsocentral", "jourcentral",
  "äldreboende", "aldreboende", "säbo", "sabo", "särskilt boende", "sarskilt boende",
  "lss", "gruppbostad", "servicebostad",
  "tandläkar", "tandlakar", "tandvård", "tandvard",
  "specialistläkar", "specialistlakar",
  "korttidsboende", "växelboende", "vaxelboende", "korttidstillsyn",
  "hvb", "behandlingshem",
  "barnmorske", "barnavård", "barnavard", "bvc",
  "psykatri", "psykiatri", "rättspsykiatri", "rattspsykiatri", "avgiftning",
  "dialys", "dagvård", "dagvard", "dagverksamhet",
  "rehab", "fysioterapi",
  "hospice", "palliativ",
  "laboratori", "provtagning",
  "sterilcentral", "blodcentral",
  "akutsjukhus", "lasarett", "sjukhus", "vårdlokal", "vardlokal",
];
function isCareFacility(business?: string) {
  if (!business) return false;
  const b = business.toLowerCase();
  return CARE_FACILITY_KEYWORDS.some((k) => b.includes(k));
}

function parseAuthorizations(auth?: string) {
  if (!auth) return { hasN: false, hasK: false };
  return {
    hasN: /\bN\b/i.test(auth),
    hasK: /\bK\b/i.test(auth),
  };
}

function intervalForVentType(vt?: string, care?: boolean): "3 år" | "6 år" | "" {
  if (care) return "3 år";
  if (vt === "FT" || vt === "FTX") return "3 år";
  if (vt === "S" || vt === "F" || vt === "FX") return "6 år";
  return "";
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
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

const UnitEditor = memo(function UnitEditor({
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
    600,
  );

  const set = useCallback(<K extends keyof Unit,>(k: K, v: Unit[K]) => {
    setForm((f) => (Object.is(f[k], v) ? f : { ...f, [k]: v }));
  }, []);
  const handleGridChange = useCallback(
    (next: string[][]) => setForm((f) => (f.gridCells === next ? f : { ...f, gridCells: next })),
    [],
  );

  // Hämta inspektionen för att veta vald besiktningsmans behörighet
  const inspection = useLiveQuery(() => db.inspections.get(unit.inspectionId), [unit.inspectionId]);
  const { hasN, hasK } = parseAuthorizations(inspection?.inspectorAuthorization);
  const anyAuth = hasN || hasK;
  const authReason = !anyAuth
    ? "Besiktningsmannen saknar behörighet (N eller K krävs)"
    : "Kräver behörighet K — vald besiktningsman har endast N";

  const ventOptions: SelectOption[] = useMemo(() => VENT_TYPE_ORDER.map((v) => {
    let disabled = false;
    let disabledReason: string | undefined;
    if (!anyAuth) {
      disabled = true;
      disabledReason = authReason;
    } else if ((v === "FT" || v === "FTX") && !hasK) {
      disabled = true;
      disabledReason = authReason;
    }
    return { value: v, label: VENT_TYPE_LABELS[v], disabled, disabledReason };
  }), [anyAuth, authReason, hasK]);

  const careFacility = isCareFacility(form.business);

  // Auto-sätt besiktningsintervall utifrån ventilationstyp / vårdlokal.
  // Skriv bara över om fältet är tomt eller är det senast auto-satta värdet.
  const lastAutoInterval = useRef<string>(unit.inspectionInterval ?? "");
  useEffect(() => {
    const target = intervalForVentType(form.ventilationType, careFacility);
    if (!target) return;
    setForm((f) => {
      if (!f.inspectionInterval || f.inspectionInterval === lastAutoInterval.current) {
        lastAutoInterval.current = target;
        return { ...f, inspectionInterval: target };
      }
      return f;
    });
  }, [form.ventilationType, careFacility]);

  // Auto-sätt nästa ord. besiktning utifrån besiktningsdatum + intervall.
  const lastAutoNext = useRef<string>(unit.nextOrdinaryDate ?? "");
  useEffect(() => {
    if (!form.inspectionDate || !form.inspectionInterval) return;
    const years = form.inspectionInterval === "3 år" ? 3 : form.inspectionInterval === "6 år" ? 6 : 0;
    if (!years) return;
    const target = addYears(form.inspectionDate, years);
    if (!target) return;
    setForm((f) => {
      if (!f.nextOrdinaryDate || f.nextOrdinaryDate === lastAutoNext.current) {
        lastAutoNext.current = target;
        return { ...f, nextOrdinaryDate: target };
      }
      return f;
    });
  }, [form.inspectionDate, form.inspectionInterval]);

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

      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-primary mb-3 pb-1 border-b border-primary/20">
          System
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <BufferedField
            label="Systembeteckning *"
            value={form.systemDesignation}
            onValueChange={(v) => set("systemDesignation", v)}
            containerClassName="col-span-2 sm:col-span-2"
          />
          <BufferedField
            label="Aggregat"
            value={form.aggregate ?? ""}
            onValueChange={(v) => set("aggregate", v)}
            containerClassName="col-span-1 sm:col-span-2"
          />
          <BufferedField
            label="Aggregatplacering *"
            value={form.placement ?? ""}
            onValueChange={(v) => set("placement", v)}
            containerClassName="col-span-1 sm:col-span-2"
          />
          <SelectField
            label="Typ av ventilation"
            value={form.ventilationType ?? ""}
            onValueChange={(v) => set("ventilationType", v)}
            options={ventOptions}
            containerClassName="col-span-2 sm:col-span-2"
          />
          <BufferedField
            label="Ombyggnadsår"
            value={form.renovationYear ?? ""}
            onValueChange={(v) => set("renovationYear", v)}
            containerClassName="col-span-1 sm:col-span-2"
          />
          <BufferedField
            label="Drifttider"
            value={form.operatingHours ?? ""}
            onValueChange={(v) => set("operatingHours", v)}
            containerClassName="col-span-1 sm:col-span-2"
          />
          <BufferedField
            label="Betjänad yta"
            value={form.servedArea ?? ""}
            onValueChange={(v) => set("servedArea", v)}
            containerClassName="col-span-2 sm:col-span-2"
          />
          <BufferedField
            label="Verksamhet"
            value={form.business ?? ""}
            onValueChange={(v) => set("business", v)}
            containerClassName="col-span-2 sm:col-span-3"
          />
          <BufferedField
            label="Antal lägenheter"
            value={form.apartmentCount ?? ""}
            onValueChange={(v) => set("apartmentCount", v)}
            containerClassName="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <Section title="Besiktning">
        <SelectField
          label="Typ av besiktning"
          value={form.inspectionType ?? ""}
          onValueChange={(v) => set("inspectionType", v)}
          options={INSPECTION_TYPE_OPTIONS}
        />
        <SelectField
          label="Besiktningsintervall"
          value={form.inspectionInterval ?? ""}
          onValueChange={(v) => set("inspectionInterval", v)}
          options={INSPECTION_INTERVALS}
          allowEmpty={false}
        />
        <BufferedField
          label="Besiktningsdatum"
          type="date"
          value={form.inspectionDate ?? ""}
          onValueChange={(v) => set("inspectionDate", v)}
        />
        <BufferedField
          label="Ombesiktningsdag"
          type="date"
          value={form.inspectionType === "OB" ? (form.reInspectionDate ?? "") : ""}
          onValueChange={(v) => set("reInspectionDate", v)}
          disabled={form.inspectionType !== "OB"}
          title={form.inspectionType !== "OB" ? "Välj 'OB' (ombesiktning) som typ för att aktivera" : undefined}
        />
        <BufferedField
          label="Nästa ord. besiktning"
          type="date"
          value={form.nextOrdinaryDate ?? ""}
          onValueChange={(v) => set("nextOrdinaryDate", v)}
        />
        <BufferedField
          label="Föregående besiktning"
          type="date"
          value={form.previousInspectionDate ?? ""}
          onValueChange={(v) => set("previousInspectionDate", v)}
        />
      </Section>

      <Section title="Anmärkningar">
        <div className="sm:col-span-2 lg:col-span-3">
          <RemarksGrid
            value={form.gridCells}
            onChange={handleGridChange}
          />
        </div>
      </Section>

      <Section title="Bedömning">
        <SelectField
          label="Aggregatstatus"
          value={form.status ?? ""}
          onValueChange={(v) => set("status", v as Unit["status"])}
          options={STATUS_OPTIONS}
          allowCustom
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
          options={VERDICT_OPTIONS}
        />
      </Section>
    </Card>
  );
}, (prev, next) => prev.unit.id === next.unit.id);

const GRID_ROWS = 30;
const COL_LETTERS = ["H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
const COL_WIDTHS = [29, 71, 64, 64, 26, 23, 12, 15, 13, 31, 20, 25, 27];
const ROW_NUM_WIDTH = 32;
const ROW_HEIGHT = 17;
const NAV_COLS = COL_WIDTHS.map((_, i) => i);
const GRID_ROW_INDEXES = Array.from({ length: GRID_ROWS }, (_, r) => r);

function navIndex(c: number) {
  return c;
}
function nextNavCol(c: number, dir: 1 | -1) {
  return Math.max(0, Math.min(COL_WIDTHS.length - 1, c + dir));
}
function cellWidth(c: number) {
  return COL_WIDTHS[c];
}


type Cell = { r: number; c: number };

const sameCell = (a: Cell, b: Cell) => a.r === b.r && a.c === b.c;
const clampCell = (r: number, c: number): Cell => ({
  r: Math.max(0, Math.min(GRID_ROWS - 1, r)),
  c: Math.max(0, Math.min(COL_WIDTHS.length - 1, c)),
});

const GridColumnHeader = memo(function GridColumnHeader({ label, active }: { label: string; active: boolean }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 text-center font-semibold",
        active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
      )}
      style={{ border: "1px solid black", height: ROW_HEIGHT }}
    >
      {label}
    </th>
  );
});

const GridRowHeader = memo(function GridRowHeader({ row, active }: { row: number; active: boolean }) {
  return (
    <th
      className={cn(
        "sticky left-0 z-10 text-right pr-1 font-semibold",
        active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
      )}
      style={{ border: "1px solid black", height: ROW_HEIGHT }}
    >
      {row + 21}
    </th>
  );
});

const GridCellEditor = memo(function GridCellEditor({
  initialValue,
  selectOnFocus,
  column,
  onCommit,
  onCancel,
  onMoveAfterCommit,
}: {
  initialValue: string;
  selectOnFocus: boolean;
  column: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onMoveAfterCommit: (dr: number, dc: -1 | 0 | 1) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (selectOnFocus) {
      el.select();
    } else {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  }, [selectOnFocus]);

  const commit = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCommit(draft);
  }, [draft, onCommit]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          onMoveAfterCommit(1, 0);
        } else if (e.key === "Tab") {
          e.preventDefault();
          commit();
          onMoveAfterCommit(0, e.shiftKey ? -1 : 1);
        } else if (e.key === "Escape") {
          e.preventDefault();
          closedRef.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      className="absolute top-0 left-0 h-full px-1 text-xs leading-none bg-background text-foreground z-30 focus:outline-none"
      style={{
        minWidth: "100%",
        width: `max(100%, ${Math.max(cellWidth(column), draft.length * 7 + 16)}px)`,
        border: "2px solid hsl(var(--primary))",
        height: ROW_HEIGHT,
      }}
    />
  );
});

const GridCell = memo(function GridCell({
  row,
  column,
  value,
  maxWidth,
  active,
  editing,
  editInitial,
  activeRef,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onCommitCell,
  onMoveAfterCommit,
}: {
  row: number;
  column: number;
  value: string;
  maxWidth: number;
  active: boolean;
  editing: boolean;
  editInitial: string | null;
  activeRef: React.Ref<HTMLTableCellElement> | undefined;
  onSelect: (r: number, c: number) => void;
  onStartEdit: (r: number, c: number) => void;
  onCancelEdit: () => void;
  onCommitCell: (r: number, c: number, v: string) => void;
  onMoveAfterCommit: (dr: number, dc: -1 | 0 | 1) => void;
}) {
  const hideBottom = row % 2 === 0;
  const hideTop = row % 2 === 1;
  const hideLeft = column >= 2 && column <= 11;
  const hideRight = column >= 1 && column <= 10;

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!active || !editing) onSelect(row, column);
  }, [active, column, editing, onSelect, row]);
  const handleStartEdit = useCallback(() => onStartEdit(row, column), [column, onStartEdit, row]);
  const handleCommit = useCallback((next: string) => onCommitCell(row, column, next), [column, onCommitCell, row]);

  return (
    <td
      ref={activeRef}
      onMouseDown={handleSelect}
      onDoubleClick={handleStartEdit}
      className="p-0 relative"
      style={{
        borderLeft: hideLeft ? "none" : "1px solid black",
        borderRight: hideRight ? "none" : "1px solid black",
        borderTop: hideTop ? "none" : "1px solid black",
        borderBottom: hideBottom ? "none" : "1px solid black",
        height: ROW_HEIGHT,
        overflow: "visible",
        boxShadow: active && !editing ? "inset 0 0 0 2px hsl(var(--primary))" : undefined,
        background: "hsl(var(--background))",
      }}
    >
      {active && editing ? (
        <GridCellEditor
          initialValue={editInitial ?? value}
          selectOnFocus={editInitial === null}
          column={column}
          onCommit={handleCommit}
          onCancel={onCancelEdit}
          onMoveAfterCommit={onMoveAfterCommit}
        />
      ) : (
        <div
          aria-hidden
          className="absolute top-0 left-0 px-1 text-xs leading-none whitespace-nowrap pointer-events-none text-foreground overflow-hidden"
          style={{ height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, maxWidth, zIndex: 1 }}
        >
          {value}
        </div>
      )}
    </td>
  );
});

const RemarksGrid = memo(function RemarksGrid({
  value,
  onChange,
}: {
  value: string[][] | undefined;
  onChange: (next: string[][]) => void;
}) {
  const [active, setActive] = useState<Cell>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [editInitial, setEditInitial] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTdRef = useRef<HTMLTableCellElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const getCell = useCallback((r: number, c: number) => valueRef.current?.[r]?.[c] ?? "", []);

  useEffect(() => {
    if (value !== undefined) return;
    onChange([[], ["", "Märkeffekt:"], [], ["", "Luftmängd:"]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeCells = useCallback((updates: Array<{ r: number; c: number; v: string }>) => {
    const next: string[][] = (valueRef.current ?? []).map((row) => [...(row ?? [])]);
    let changed = false;
    for (const { r, c, v } of updates) {
      if (r < 0 || r >= GRID_ROWS || c < 0 || c >= COL_WIDTHS.length) continue;
      while (next.length <= r) next.push([]);
      const row = [...(next[r] ?? [])];
      while (row.length <= c) row.push("");
      if ((row[c] ?? "") === v) continue;
      row[c] = v;
      next[r] = row;
      changed = true;
    }
    if (changed) onChange(next);
  }, [onChange]);

  const setCell = useCallback((r: number, c: number, v: string) => writeCells([{ r, c, v }]), [writeCells]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditInitial(null);
  }, []);

  const selectCell = useCallback((r: number, c: number) => {
    const next = clampCell(r, c);
    setActive((current) => (sameCell(current, next) ? current : next));
    setEditing(false);
    setEditInitial(null);
    containerRef.current?.focus();
  }, []);

  const startEditCell = useCallback((r: number, c: number) => {
    setActive(clampCell(r, c));
    setEditInitial(null);
    setEditing(true);
  }, []);

  const commitCell = useCallback((r: number, c: number, v: string) => {
    setCell(r, c, v);
    setEditing(false);
    setEditInitial(null);
  }, [setCell]);

  const moveTo = useCallback((r: number, c: number) => {
    const next = clampCell(r, c);
    setActive((current) => (sameCell(current, next) ? current : next));
    setEditing(false);
    setEditInitial(null);
  }, []);

  const move = useCallback((dr: number, dc: -1 | 0 | 1) => {
    setActive((current) => {
      const nc = dc === 0 ? current.c : nextNavCol(current.c, dc);
      const next = clampCell(current.r + dr, nc);
      return sameCell(current, next) ? current : next;
    });
    setEditing(false);
    setEditInitial(null);
  }, []);

  const startEdit = useCallback((initial?: string) => {
    setEditInitial(initial ?? null);
    setEditing(true);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing) return;
    const meta = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        move(-1, 0);
        return;
      case "ArrowDown":
        e.preventDefault();
        move(1, 0);
        return;
      case "ArrowLeft":
        e.preventDefault();
        move(0, -1);
        return;
      case "ArrowRight":
        e.preventDefault();
        move(0, 1);
        return;
      case "Tab":
        e.preventDefault();
        move(0, e.shiftKey ? -1 : 1);
        return;
      case "Enter":
      case "F2":
        e.preventDefault();
        startEdit();
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        setCell(active.r, active.c, "");
        return;
      case "Home":
        e.preventDefault();
        moveTo(meta ? 0 : active.r, NAV_COLS[0]);
        return;
      case "End":
        e.preventDefault();
        moveTo(meta ? GRID_ROWS - 1 : active.r, NAV_COLS[NAV_COLS.length - 1]);
        return;
      case "PageUp":
        e.preventDefault();
        moveTo(active.r - 10, active.c);
        return;
      case "PageDown":
        e.preventDefault();
        moveTo(active.r + 10, active.c);
        return;
    }
    if (!meta && !e.altKey && e.key.length === 1) {
      e.preventDefault();
      startEdit(e.key);
    }
  }, [active.c, active.r, editing, move, moveTo, setCell, startEdit]);

  const onCopy = useCallback((e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", getCell(active.r, active.c));
  }, [active.c, active.r, editing, getCell]);

  const onCut = useCallback((e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", getCell(active.r, active.c));
    setCell(active.r, active.c, "");
  }, [active.c, active.r, editing, getCell, setCell]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    if (editing) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    if (text.includes("\t") || text.includes("\n")) {
      const matrix = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
      const updates: Array<{ r: number; c: number; v: string }> = [];
      matrix.forEach((row, dr) => {
        row.forEach((v, dc) => updates.push({ r: active.r + dr, c: active.c + dc, v }));
      });
      writeCells(updates);
    } else {
      setCell(active.r, active.c, text);
    }
  }, [active.c, active.r, editing, setCell, writeCells]);

  useEffect(() => {
    activeTdRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const overflowWidth = useMemo(() => {
    const nCols = COL_WIDTHS.length;
    const grid: number[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = new Array<number>(nCols);
      let trailing = 0;
      for (let c = nCols - 1; c >= 0; c--) {
        const v = value?.[r]?.[c] ?? "";
        row[c] = COL_WIDTHS[c] + trailing;
        if (v === "") trailing += COL_WIDTHS[c];
        else trailing = 0;
      }
      grid.push(row);
    }
    return grid;
  }, [value]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onCopy={onCopy}
      onCut={onCut}
      onPaste={onPaste}
      className="outline-none rounded border border-transparent focus:border-primary/40"
    >
      <table className="text-xs select-none" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: ROW_NUM_WIDTH }} />
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ height: ROW_HEIGHT }}>
            <th className="sticky left-0 top-0 z-20 bg-muted" style={{ border: "1px solid black", height: ROW_HEIGHT }} />
            {COL_LETTERS.map((label, column) => (
              <GridColumnHeader key={label} label={label} active={active.c === column} />
            ))}
          </tr>
        </thead>
        <tbody>
          {GRID_ROW_INDEXES.map((row) => (
            <tr key={row} style={{ height: ROW_HEIGHT }}>
              <GridRowHeader row={row} active={active.r === row} />
              {NAV_COLS.map((column) => {
                const isActive = active.r === row && active.c === column;
                return (
                  <GridCell
                    key={column}
                    row={row}
                    column={column}
                    value={value?.[row]?.[column] ?? ""}
                    maxWidth={overflowWidth[row][column]}
                    active={isActive}
                    editing={isActive && editing}
                    editInitial={isActive ? editInitial : null}
                    activeRef={isActive ? activeTdRef : undefined}
                    onSelect={selectCell}
                    onStartEdit={startEditCell}
                    onCancelEdit={cancelEdit}
                    onCommitCell={commitCell}
                    onMoveAfterCommit={move}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});



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
