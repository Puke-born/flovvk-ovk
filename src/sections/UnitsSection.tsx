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
  VENT_TYPES,
  INSPECTION_TYPES,
  INSPECTION_INTERVALS,
  type Unit,
} from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
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
  const handleGridChange = useCallback(
    (next: string[][]) => setForm((f) => ({ ...f, gridCells: next })),
    [],
  );

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
const COL_LETTERS = ["H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
const COL_WIDTHS = [29, 71, 64, 64, 26, 23, 12, 15, 13, 31, 20, 25, 27];
const ROW_NUM_WIDTH = 32;
const ROW_HEIGHT = 17;
const NAV_COLS = COL_WIDTHS.map((_, i) => i);

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

function RemarksGrid({
  value,
  onChange,
}: {
  value: string[][] | undefined;
  onChange: (next: string[][]) => void;
}) {
  const [active, setActive] = useState<Cell>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTdRef = useRef<HTMLTableCellElement>(null);

  const getCell = (r: number, c: number) => value?.[r]?.[c] ?? "";

  // Prefill defaults bara om gridCells är helt tomt (nytt aggregat utan data).
  useEffect(() => {
    if (value !== undefined) return;
    onChange([[], ["", "Märkeffekt:"], [], ["", "Luftmängd:"]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeCells = (updates: Array<{ r: number; c: number; v: string }>) => {
    const next: string[][] = (value ?? []).map((row) => [...(row ?? [])]);
    for (const { r, c, v } of updates) {
      if (r < 0 || r >= GRID_ROWS) continue;
      while (next.length <= r) next.push([]);
      const row = [...(next[r] ?? [])];
      while (row.length <= c) row.push("");
      row[c] = v;
      next[r] = row;
    }
    onChange(next);
  };
  const setCell = (r: number, c: number, v: string) => writeCells([{ r, c, v }]);


  const commitDraft = () => {
    setCell(active.r, active.c, draft);
    setEditing(false);
  };
  const cancelEdit = () => setEditing(false);

  const moveTo = (r: number, c: number) => {
    setActive({
      r: Math.max(0, Math.min(GRID_ROWS - 1, r)),
      c: NAV_COLS.includes(c) ? c : NAV_COLS[navIndex(c)],
    });
    setEditing(false);
  };
  const move = (dr: number, dc: -1 | 0 | 1) => {
    const nc = dc === 0 ? active.c : nextNavCol(active.c, dc);
    moveTo(active.r + dr, nc);
  };

  const startEdit = (initial?: string) => {
    setDraft(initial !== undefined ? initial : getCell(active.r, active.c));
    setEditing(true);
  };

  const refocusContainer = () => {
    // Defer so React finishes unmounting the input first.
    setTimeout(() => containerRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitDraft();
        move(1, 0);
        refocusContainer();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
        refocusContainer();
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitDraft();
        move(0, e.shiftKey ? -1 : 1);
        refocusContainer();
      }
      return;
    }
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
  };

  const onCopy = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", getCell(active.r, active.c));
  };
  const onCut = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", getCell(active.r, active.c));
    setCell(active.r, active.c, "");
  };
  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    if (text.includes("\t") || text.includes("\n")) {
      const matrix = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
      const updates: Array<{ r: number; c: number; v: string }> = [];
      matrix.forEach((row, dr) => {
        row.forEach((v, dc) => {
          const c = active.c + dc;
          if (c >= COL_WIDTHS.length) return;
          updates.push({ r: active.r + dr, c, v });
        });
      });
      writeCells(updates);
    } else {
      setCell(active.r, active.c, text);
    }
  };


  // Autoscroll active cell into view
  useEffect(() => {
    activeTdRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  // Focus + select on edit start
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const renderCell = (r: number, c: number) => {
    const isActive = active.r === r && active.c === c;
    const val = getCell(r, c);


    // Excel-style overflow: extend overlay width into subsequent empty cells.
    let maxW = cellWidth(c);
    for (let nc = c + 1; nc < COL_WIDTHS.length; nc++) {
      if (getCell(r, nc) === "") maxW += cellWidth(nc);
      else break;
    }

    // Pair rows visually: 21-22, 23-24, ... (no border between pair members)
    const hideBottom = r % 2 === 0;
    const hideTop = r % 2 === 1;
    // Remove internal borders between I (1) and S (11) — they act as one wide area.
    const hideLeft = c >= 2 && c <= 11;
    const hideRight = c >= 1 && c <= 10;

    return (
      <td
        key={c}
        ref={isActive ? activeTdRef : undefined}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!(isActive && editing)) {
            setActive({ r, c });
            setEditing(false);
            containerRef.current?.focus();
          }
        }}
        onDoubleClick={() => {
          setActive({ r, c });
          setDraft(getCell(r, c));
          setEditing(true);
        }}
        className="p-0 relative"
        style={{
          borderLeft: hideLeft ? "none" : "1px solid black",
          borderRight: hideRight ? "none" : "1px solid black",
          borderTop: hideTop ? "none" : "1px solid black",
          borderBottom: hideBottom ? "none" : "1px solid black",

          height: ROW_HEIGHT,
          overflow: "visible",
          boxShadow: isActive && !editing ? "inset 0 0 0 2px hsl(var(--primary))" : undefined,
          background: "hsl(var(--background))",
        }}
      >

        {!(isActive && editing) && (
          <div
            aria-hidden
            className="absolute top-0 left-0 px-1 text-xs leading-none whitespace-nowrap pointer-events-none text-foreground overflow-hidden"
            style={{
              height: ROW_HEIGHT,
              lineHeight: `${ROW_HEIGHT}px`,
              maxWidth: maxW,
              zIndex: 1,
            }}
          >
            {val}
          </div>
        )}
        {isActive && editing && (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (editing) {
                setCell(r, c, draft);
                setEditing(false);
              }
            }}
            className="absolute top-0 left-0 h-full px-1 text-xs leading-none bg-background text-foreground z-30 focus:outline-none"
            style={{
              minWidth: "100%",
              width: `max(100%, ${Math.max(cellWidth(c), draft.length * 7 + 16)}px)`,
              border: "2px solid hsl(var(--primary))",
              height: ROW_HEIGHT,
            }}
          />
        )}
      </td>
    );
  };

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
            <th
              className="sticky left-0 top-0 z-20 bg-muted"
              style={{ border: "1px solid black", height: ROW_HEIGHT }}
            />
            {COL_LETTERS.map((l, i) => {
              const highlight = active.c === i;

              return (
                <th
                  key={i}
                  className={cn(
                    "sticky top-0 z-10 text-center font-semibold",
                    highlight ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}
                  style={{ border: "1px solid black", height: ROW_HEIGHT }}
                >
                  {l}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: GRID_ROWS }, (_, r) => (
            <tr key={r} style={{ height: ROW_HEIGHT }}>
              <th
                className={cn(
                  "sticky left-0 z-10 text-right pr-1 font-semibold",
                  active.r === r ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}
                style={{ border: "1px solid black", height: ROW_HEIGHT }}
              >
                {r + 21}
              </th>
              {NAV_COLS.map((c) => renderCell(r, c))}
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
