import { useEffect, useRef, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FileSpreadsheet, Plus, Upload } from "lucide-react";
import {
  db,
  addUnit,
  addLfpSheets,
  deleteUnit,
  duplicateUnit,
  emptyLfpSheet,
  nextLfpSheetName,
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
import { exportInspectionToExcel } from "@/lib/excelExport";
import { getSheetNames, importSheets } from "@/lib/lfpImport";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AirflowGrid, { type GridRow } from "@/components/AirflowGrid";

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
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importNames, setImportNames] = useState<string[]>([]);
  const [importPicked, setImportPicked] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<{ buffer: ArrayBuffer; name: string } | null>(null);

  const activeUnit = units?.find((u) => u.id === activeUnitId) ?? null;
  const lfpSheets = activeUnit?.lfpSheets ?? [];
  const activeSheet = lfpSheets.find((s) => s.id === activeSheetId) ?? null;

  // Rensa val som inte längre finns
  useEffect(() => {
    if (activeUnitId && units && !units.some((u) => u.id === activeUnitId)) {
      setActiveUnitId(null);
      setActiveSheetId(null);
    }
  }, [units, activeUnitId]);
  useEffect(() => {
    if (activeSheetId && activeUnit && !lfpSheets.some((s) => s.id === activeSheetId)) {
      setActiveSheetId(null);
    }
  }, [activeSheetId, activeUnit, lfpSheets]);

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
    setActiveUnitId(newId);
    setActiveSheetId(null);
  };

  const handleAddLfp = async () => {
    if (!activeUnit) return;
    const sheet = emptyLfpSheet(nextLfpSheetName(activeUnit.systemDesignation, lfpSheets));
    await addLfpSheets(activeUnit.id, [sheet]);
    setActiveSheetId(sheet.id);
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
    if (!file || importPicked.length === 0 || !activeUnit) return;
    setImporting(true);
    try {
      const imported = await importSheets(file.buffer.slice(0), importPicked, file.name);
      const created: LfpSheet[] = [];
      let pool = [...lfpSheets];
      for (const imp of imported) {
        const importedCells: Record<string, string[]> = {};
        imp.rows.forEach((row: GridRow, i: number) => {
          const keys = Object.keys(row).filter((k) => (row[k] ?? "") !== "");
          if (keys.length) importedCells[String(i)] = keys;
        });
        const s = emptyLfpSheet(nextLfpSheetName(activeUnit.systemDesignation, pool), {
          rows: imp.rows,
          notes: imp.notes,
          importedCells,
        });
        pool = [...pool, s];
        created.push(s);
      }
      await addLfpSheets(activeUnit.id, created);
      if (created[0]) setActiveSheetId(created[0].id);
      setImportOpen(false);
      toast.success(`${created.length} blad importerade`);
    } catch {
      toast.error("Importen misslyckades");
    } finally {
      setImporting(false);
    }
  }, [importPicked, activeUnit, lfpSheets]);

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

  return (
    <AppShell title={title} right={right}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <InspectionHeaderForm inspection={inspection} />

        {/* Rad 1: Intyg + aggregat */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            className={tabClass(!activeUnit)}
            onClick={() => {
              setActiveUnitId(null);
              setActiveSheetId(null);
            }}
          >
            Intyg
          </button>
          {units?.map((u, i) => (
            <button
              key={u.id}
              type="button"
              className={tabClass(activeUnitId === u.id)}
              onClick={() => {
                setActiveUnitId(u.id);
                setActiveSheetId(null);
              }}
            >
              {u.systemDesignation?.trim() || `Aggregat ${i + 1}`}
            </button>
          ))}
          <button
            type="button"
            className={cn(tabClass(false), "px-2")}
            onClick={handleAddUnit}
            aria-label="Lägg till aggregat"
            title="Lägg till aggregat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Rad 2: bladflikar för valt aggregat */}
        {activeUnit && (
          <div className="mt-1 flex items-center gap-1 overflow-x-auto pb-1 pl-2 border-l-2 border-primary/30">
            {lfpSheets.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn(tabClass(activeSheetId === s.id), "h-8")}
                onClick={() => setActiveSheetId(s.id)}
              >
                {s.name}
              </button>
            ))}
            <button
              type="button"
              className={cn(tabClass(false), "h-8")}
              onClick={handleAddLfp}
            >
              <Plus className="h-4 w-4 inline mr-1" />
              LFP
            </button>
          </div>
        )}

        <div className="mt-4">
          {!activeUnit ? (
            <IntygView inspection={inspection} />
          ) : activeSheet ? (
            <LfpSection
              key={activeSheet.id}
              unitId={activeUnit.id}
              systemDesignation={activeUnit.systemDesignation}
              sheets={lfpSheets}
              sheet={activeSheet}
              onSelectSheet={setActiveSheetId}
            />
          ) : (
            <UnitEditor
              key={activeUnit.id}
              unit={activeUnit}
              onDuplicate={async () => {
                const newId = await duplicateUnit(activeUnit.id);
                if (newId) {
                  setActiveUnitId(newId);
                  setActiveSheetId(null);
                  toast.success("Aggregat duplicerat");
                }
              }}
              onDelete={async () => {
                await deleteUnit(activeUnit.id);
                setActiveUnitId(null);
                setActiveSheetId(null);
                toast.success("Aggregat raderat");
              }}
            />
          )}
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
      </div>
    </AppShell>
  );
}
