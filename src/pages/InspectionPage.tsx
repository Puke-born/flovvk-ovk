import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FileSpreadsheet, Plus, Upload } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import {
  db,
  addUnit,
  addLfpSheetsTo,
  deleteUnit,
  duplicateUnit,
  emptyLfpSheet,
  moveLfpSheet,
  nextLfpSheetName,
  reorderUnits,
  type LfpOwner,
  type LfpSheet,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AppShell } from "@/components/AppShell";
import { InspectionHeaderForm } from "@/sections/InspectionHeaderForm";
import { UnitEditor } from "@/sections/UnitsSection";
import { LfpSection } from "@/sections/LfpSection";
import { IntygView } from "@/sections/IntygView";
import { SortableTab, DropRow } from "@/components/SortableTab";
import { exportInspectionToExcel } from "@/lib/excelExport";
import { getSheetNames, importSheets } from "@/lib/lfpImport";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type GridRow } from "@/components/AirflowGrid";

const UNASSIGNED = "none";
const ownerKeyOf = (unitId: string | null) => unitId ?? UNASSIGNED;
const sheetDragId = (unitId: string | null, sheetId: string) =>
  `sheet:${ownerKeyOf(unitId)}:${sheetId}`;

type Selection =
  | { type: "intyg" }
  | { type: "unit"; unitId: string }
  | { type: "sheet"; unitId: string | null; sheetId: string };

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inspection = useLiveQuery(() => (id ? db.inspections.get(id) : undefined), [id]);
  const template = useLiveQuery(() => db.excelTemplate.get("template"), []);
  const units = useLiveQuery(
    () => (id ? db.units.where("inspectionId").equals(id).sortBy("order") : []),
    [id],
    [],
  );
  const [sel, setSel] = useState<Selection>({ type: "intyg" });
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importNames, setImportNames] = useState<string[]>([]);
  const [importPicked, setImportPicked] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<{ buffer: ArrayBuffer; name: string } | null>(null);

  const unassigned = inspection?.unassignedLfp ?? [];
  const activeUnitId = sel.type === "intyg" ? null : sel.unitId;
  const activeUnit = units?.find((u) => u.id === activeUnitId) ?? null;
  const lfpSheets = activeUnit?.lfpSheets ?? [];

  const activeSheet: LfpSheet | null =
    sel.type === "sheet"
      ? (sel.unitId === null ? unassigned : lfpSheets).find((s) => s.id === sel.sheetId) ?? null
      : null;

  const sheetOwner: LfpOwner | null = useMemo(() => {
    if (sel.type !== "sheet" || !id) return null;
    return sel.unitId === null
      ? { kind: "inspection", id }
      : { kind: "unit", id: sel.unitId };
  }, [sel, id]);

  // Alla LFP-blad i besiktningen (för helskärmsraden)
  const allLfpTabs = useMemo(
    () => [
      ...(units ?? []).flatMap((u) =>
        (u.lfpSheets ?? []).map((s) => ({ id: s.id, name: s.name, unitId: u.id as string | null })),
      ),
      ...unassigned.map((s) => ({ id: s.id, name: s.name, unitId: null as string | null })),
    ],
    [units, unassigned],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // Rensa val som inte längre finns
  useEffect(() => {
    if (sel.type === "intyg" || !units) return;
    if (sel.unitId !== null && !units.some((u) => u.id === sel.unitId)) {
      setSel({ type: "intyg" });
      return;
    }
    if (sel.type === "sheet") {
      const list = sel.unitId === null ? unassigned : lfpSheets;
      if (!list.some((s) => s.id === sel.sheetId)) {
        setSel(sel.unitId ? { type: "unit", unitId: sel.unitId } : { type: "intyg" });
      }
    }
  }, [units, sel, unassigned, lfpSheets]);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      await exportInspectionToExcel(id);
      toast.success("Excel-fil exporterad");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Export misslyckades");
    } finally {
      setExporting(false);
    }
  };

  const handleAddUnit = async () => {
    if (!id) return;
    const newId = await addUnit(id);
    setSel({ type: "unit", unitId: newId });
  };

  const handleAddLfp = async () => {
    if (!activeUnit) return;
    const sheet = emptyLfpSheet(nextLfpSheetName(activeUnit.systemDesignation, lfpSheets));
    await addLfpSheetsTo({ kind: "unit", id: activeUnit.id }, [sheet]);
    setSel({ type: "sheet", unitId: activeUnit.id, sheetId: sheet.id });
  };

  const onPickFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      pendingFile.current = { buffer, name: file.name };
      const names = await getSheetNames(buffer.slice(0), file.name);
      setImportNames(names);
      setImportPicked(names.slice(0, 1));
      setImportOpen(true);
    } catch {
      toast.error("Kunde inte läsa filen");
    }
  }, []);

  const runImport = useCallback(async () => {
    const file = pendingFile.current;
    if (!file || importPicked.length === 0 || !id) return;
    setImporting(true);
    try {
      const imported = await importSheets(file.buffer.slice(0), importPicked, file.name);
      const created: LfpSheet[] = [];
      const taken = new Set(unassigned.map((s) => s.name));
      for (const imp of imported) {
        const importedCells: Record<string, string[]> = {};
        imp.rows.forEach((row: GridRow, i: number) => {
          const keys = Object.keys(row).filter((k) => (row[k] ?? "") !== "");
          if (keys.length) importedCells[String(i)] = keys;
        });
        let name = imp.name?.trim() || "LFP";
        let n = 2;
        while (taken.has(name)) name = `${imp.name?.trim() || "LFP"} (${n++})`;
        taken.add(name);
        created.push(
          emptyLfpSheet(name, { rows: imp.rows, notes: imp.notes, importedCells }),
        );
      }
      await addLfpSheetsTo({ kind: "inspection", id }, created);
      if (created[0]) setSel({ type: "sheet", unitId: null, sheetId: created[0].id });
      setImportOpen(false);
      toast.success(`${created.length} blad importerade – dra dem till ett aggregat`);
    } catch {
      toast.error("Importen misslyckades");
    } finally {
      setImporting(false);
    }
  }, [importPicked, id, unassigned]);

  const listFor = useCallback(
    (unitId: string | null): LfpSheet[] =>
      unitId === null ? unassigned : units?.find((u) => u.id === unitId)?.lfpSheets ?? [],
    [unassigned, units],
  );

  const ownerFor = useCallback(
    (unitId: string | null): LfpOwner =>
      unitId === null ? { kind: "inspection", id: id! } : { kind: "unit", id: unitId },
    [id],
  );

  const onDragStart = (e: DragStartEvent) => {
    const aid = String(e.active.id);
    if (aid.startsWith("unit:")) {
      const u = units?.find((x) => x.id === aid.slice(5));
      setDragLabel(u?.systemDesignation?.trim() || "Aggregat");
    } else if (aid.startsWith("sheet:")) {
      const [, ownerKey, sheetId] = aid.split(":");
      const s = listFor(ownerKey === UNASSIGNED ? null : ownerKey).find((x) => x.id === sheetId);
      setDragLabel(s?.name ?? "LFP");
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setDragLabel(null);
    const { active, over } = e;
    if (!over || !id) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (aid === oid) return;

    // Flytta aggregat
    if (aid.startsWith("unit:")) {
      if (!oid.startsWith("unit:") || !units) return;
      const from = units.findIndex((u) => u.id === aid.slice(5));
      const to = units.findIndex((u) => u.id === oid.slice(5));
      if (from < 0 || to < 0) return;
      await reorderUnits(arrayMove(units, from, to).map((u) => u.id));
      return;
    }

    // Flytta LFP-blad
    if (!aid.startsWith("sheet:")) return;
    const [, fromKey, sheetId] = aid.split(":");
    const fromUnitId = fromKey === UNASSIGNED ? null : fromKey;

    let toUnitId: string | null;
    let toIndex: number;

    if (oid.startsWith("sheet:")) {
      const [, toKey, overSheetId] = oid.split(":");
      toUnitId = toKey === UNASSIGNED ? null : toKey;
      toIndex = Math.max(0, listFor(toUnitId).findIndex((s) => s.id === overSheetId));
    } else if (oid.startsWith("unit:")) {
      toUnitId = oid.slice(5);
      toIndex = listFor(toUnitId).length;
    } else if (oid.startsWith("row:")) {
      const key = oid.slice(4);
      toUnitId = key === UNASSIGNED ? null : key;
      toIndex = listFor(toUnitId).length;
    } else {
      return;
    }

    await moveLfpSheet(ownerFor(fromUnitId), ownerFor(toUnitId), sheetId, toIndex);
    setSel({ type: "sheet", unitId: toUnitId, sheetId });
  };

  useEffect(() => {
    if (!inspection) return;
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 700);
    return () => clearTimeout(t);
  }, [inspection?.updatedAt]);

  if (!id) return null;
  if (inspection === undefined) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">Laddar…</div>
      </AppShell>
    );
  }
  if (inspection === null) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Besiktningen kunde inte hittas.</p>
          <Button onClick={() => navigate("/")}>Tillbaka</Button>
        </div>
      </AppShell>
    );
  }

  const title = (
    <span className="flex items-center gap-2 truncate">
      <button
        onClick={() => navigate("/")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent shrink-0"
        aria-label="Tillbaka"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="truncate">
        {inspection.propertyDesignation || <span className="italic text-muted-foreground">Namnlös besiktning</span>}
      </span>
    </span>
  );

  const right = (
    <div className="flex items-center gap-1 sm:gap-2 mr-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={!template || exporting}
        title={!template ? "Ladda upp en Excel-mall i Inställningar" : "Exportera till Excel"}
      >
        <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">{exporting ? "Exporterar…" : "Excel"}</span>
      </Button>
      <span
        className={`hidden md:inline-flex items-center gap-1 text-xs ml-1 transition-opacity ${
          savedFlash ? "opacity-100 text-success" : "opacity-50 text-muted-foreground"
        }`}
      >
        <Save className="h-3.5 w-3.5" />
        Sparat
      </span>
    </div>
  );

  const tabClass = (active: boolean) =>
    cn(
      "shrink-0 rounded-md border px-3 h-9 text-sm font-medium transition-colors whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background hover:bg-accent border-border text-foreground",
    );

  const showUnitRow = activeUnitId !== null;

  return (
    <AppShell title={title} right={right}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <InspectionHeaderForm inspection={inspection} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragLabel(null)}
        >
          {/* Rad 1: Intyg + aggregat */}
          <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              className={tabClass(sel.type === "intyg")}
              onClick={() => setSel({ type: "intyg" })}
            >
              Intyg
            </button>
            <SortableContext
              items={(units ?? []).map((u) => `unit:${u.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {units?.map((u, i) => (
                <SortableTab
                  key={u.id}
                  id={`unit:${u.id}`}
                  active={activeUnitId === u.id}
                  onClick={() => setSel({ type: "unit", unitId: u.id })}
                >
                  {u.systemDesignation?.trim() || `Aggregat ${i + 1}`}
                </SortableTab>
              ))}
            </SortableContext>
            <button
              type="button"
              className={cn(tabClass(false), "px-2")}
              onClick={handleAddUnit}
              aria-label="Lägg till aggregat"
              title="Lägg till aggregat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onPickFile(f);
              }}
            />
            <button
              type="button"
              className={cn(tabClass(false), "px-2 sm:px-3")}
              onClick={() => fileRef.current?.click()}
              aria-label="Importera LFP"
              title="Importera LFP"
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Importera LFP</span>
            </button>
          </div>

          {/* Rad 2: bladflikar för valt aggregat */}
          {showUnitRow && activeUnit && (
            <DropRow
              id={`row:${activeUnit.id}`}
              className="mt-1 flex items-center gap-1 overflow-x-auto pb-1 pl-2 border-l-2 border-primary/30 min-h-[40px]"
            >
              <SortableContext
                items={lfpSheets.map((s) => sheetDragId(activeUnit.id, s.id))}
                strategy={horizontalListSortingStrategy}
              >
                {lfpSheets.map((s) => (
                  <SortableTab
                    key={s.id}
                    id={sheetDragId(activeUnit.id, s.id)}
                    className="h-8"
                    active={sel.type === "sheet" && sel.sheetId === s.id}
                    onClick={() => setSel({ type: "sheet", unitId: activeUnit.id, sheetId: s.id })}
                  >
                    {s.name}
                  </SortableTab>
                ))}
              </SortableContext>
              <button type="button" className={cn(tabClass(false), "h-8")} onClick={handleAddLfp}>
                <Plus className="h-4 w-4 inline mr-1" />
                LFP
              </button>
            </DropRow>
          )}

          {/* Rad 3: lösa (importerade) LFP-blad */}
          <DropRow
            id={`row:${UNASSIGNED}`}
            className="mt-2 flex items-center gap-1 overflow-x-auto pb-1 min-h-[40px]"
          >
            <span className="shrink-0 text-xs text-muted-foreground pr-1">Lösa LFP-blad:</span>
            <SortableContext
              items={unassigned.map((s) => sheetDragId(null, s.id))}
              strategy={horizontalListSortingStrategy}
            >
              {unassigned.map((s) => (
                <SortableTab
                  key={s.id}
                  id={sheetDragId(null, s.id)}
                  className="h-8"
                  active={sel.type === "sheet" && sel.unitId === null && sel.sheetId === s.id}
                  onClick={() => setSel({ type: "sheet", unitId: null, sheetId: s.id })}
                >
                  {s.name}
                </SortableTab>
              ))}
            </SortableContext>
            {unassigned.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                Importerade blad hamnar här – dra dem till ett aggregat
              </span>
            )}
          </DropRow>

          <DragOverlay>
            {dragLabel ? (
              <div className="rounded-md border border-primary bg-primary text-primary-foreground px-3 h-9 flex items-center text-sm font-medium shadow-lg">
                {dragLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="mt-4">
          {sel.type === "intyg" ? (
            <IntygView inspection={inspection} />
          ) : activeSheet && sheetOwner ? (
            <LfpSection
              key={activeSheet.id}
              owner={sheetOwner}
              systemDesignation={activeUnit?.systemDesignation ?? ""}
              sheets={sel.type === "sheet" && sel.unitId === null ? unassigned : lfpSheets}
              sheet={activeSheet}
              fullscreenTabs={allLfpTabs}
              onSelectTab={(unitId, sheetId) => setSel({ type: "sheet", unitId, sheetId })}
              onSelectSheet={(sheetId) =>
                setSel(
                  sheetId
                    ? { type: "sheet", unitId: activeUnitId, sheetId }
                    : activeUnitId
                      ? { type: "unit", unitId: activeUnitId }
                      : { type: "intyg" },
                )
              }
            />
          ) : activeUnit ? (
            <UnitEditor
              key={activeUnit.id}
              unit={activeUnit}
              onDuplicate={async () => {
                const newId = await duplicateUnit(activeUnit.id);
                if (newId) {
                  setSel({ type: "unit", unitId: newId });
                  toast.success("Aggregat duplicerat");
                }
              }}
              onDelete={async () => {
                await deleteUnit(activeUnit.id);
                setSel({ type: "intyg" });
                toast.success("Aggregat raderat");
              }}
            />
          ) : null}
        </div>

        {units && units.length === 0 && (
          <Card className="mt-4 p-10 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Inga aggregat ännu.</p>
            <Button onClick={handleAddUnit} size="lg" className="touch-button">
              <Plus className="h-5 w-5 mr-2" />
              Lägg till första aggregatet
            </Button>
          </Card>
        )}

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importera luftflödesprotokoll</DialogTitle>
              <DialogDescription>
                Valda blad läggs i raden med lösa LFP-blad. Dra dem sedan till rätt aggregat.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-72 overflow-auto space-y-2">
              {importNames.map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={importPicked.includes(n)}
                    onCheckedChange={(v) =>
                      setImportPicked((prev) => (v ? [...prev, n] : prev.filter((p) => p !== n)))
                    }
                  />
                  {n}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={runImport} disabled={importing || importPicked.length === 0}>
                Importera {importPicked.length > 0 ? `(${importPicked.length})` : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
