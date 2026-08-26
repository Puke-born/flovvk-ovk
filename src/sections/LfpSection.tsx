import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Plus, Upload, Trash2, Copy, Paintbrush } from "lucide-react";
import { toast } from "sonner";
import AirflowGrid, { type GridRow } from "@/components/AirflowGrid";
import NotesGrid from "@/components/NotesGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { emptyLfpSheet, nextLfpSheetName, LFP_ROW_COUNT, type LfpSheet } from "@/lib/db";
import { getSheetNames, importSheets } from "@/lib/lfpImport";
import { cn } from "@/lib/utils";

const COLOR_SWATCHES = [
  { label: "Ingen", value: "" },
  { label: "Gul", value: "#FFF3B0" },
  { label: "Grön", value: "#CDEAC0" },
  { label: "Röd", value: "#F6C6C6" },
  { label: "Blå", value: "#C9DDF5" },
  { label: "Grå", value: "#E2E2E2" },
];

interface Props {
  systemDesignation: string;
  sheets: LfpSheet[];
  onChange: (next: LfpSheet[]) => void;
}

export const LfpSection = memo(function LfpSection({ systemDesignation, sheets, onChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sheets[0]?.id ?? null);
  const [selected, setSelected] = useState<{ row: number; colKey: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importNames, setImportNames] = useState<string[]>([]);
  const [importPicked, setImportPicked] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<{ buffer: ArrayBuffer; name: string } | null>(null);

  const active = sheets.find((s) => s.id === activeId) ?? sheets[0] ?? null;

  const patchActive = useCallback(
    (patch: Partial<LfpSheet>) => {
      if (!active) return;
      onChange(sheets.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
    },
    [active, onChange, sheets],
  );

  const addSheet = useCallback(() => {
    const sheet = emptyLfpSheet(nextLfpSheetName(systemDesignation, sheets));
    onChange([...sheets, sheet]);
    setActiveId(sheet.id);
  }, [onChange, sheets, systemDesignation]);

  const duplicateSheet = useCallback(() => {
    if (!active) return;
    const copy: LfpSheet = {
      ...structuredClone(active),
      id: crypto.randomUUID(),
      name: nextLfpSheetName(systemDesignation, sheets),
    };
    onChange([...sheets, copy]);
    setActiveId(copy.id);
  }, [active, onChange, sheets, systemDesignation]);

  const deleteSheet = useCallback(() => {
    if (!active) return;
    const next = sheets.filter((s) => s.id !== active.id);
    onChange(next);
    setActiveId(next[0]?.id ?? null);
  }, [active, onChange, sheets]);

  const handleCellChange = useCallback(
    (rowIndex: number, colKey: string, value: string) => {
      if (!active) return;
      const rows = active.rows.map((r, i) => (i === rowIndex ? { ...r, [colKey]: value } : r));
      patchActive({ rows });
    },
    [active, patchActive],
  );

  const handleRowReorder = useCallback(
    (from: number, to: number) => {
      if (!active) return;
      const rows = [...active.rows];
      const [moved] = rows.splice(from, 1);
      rows.splice(to, 0, moved);
      patchActive({ rows });
    },
    [active, patchActive],
  );

  const applyColor = useCallback(
    (hex: string) => {
      if (!active || !selected) return;
      const colors: Record<string, Record<string, string>> = { ...(active.cellColors ?? {}) };
      const rowKey = String(selected.row);
      const row = { ...(colors[rowKey] ?? {}) };
      if (hex) row[selected.colKey] = hex;
      else delete row[selected.colKey];
      if (Object.keys(row).length) colors[rowKey] = row;
      else delete colors[rowKey];
      patchActive({ cellColors: colors });
    },
    [active, patchActive, selected],
  );

  const importedSets = useMemo(() => {
    const map = active?.importedCells ?? {};
    return Array.from({ length: LFP_ROW_COUNT }, (_, i) => new Set(map[String(i)] ?? []));
  }, [active]);

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
    if (!file || importPicked.length === 0) return;
    setImporting(true);
    try {
      const imported = await importSheets(file.buffer.slice(0), importPicked, file.name);
      const created: LfpSheet[] = [];
      let pool = [...sheets];
      for (const imp of imported) {
        const importedCells: Record<string, string[]> = {};
        imp.rows.forEach((row: GridRow, i: number) => {
          const keys = Object.keys(row).filter((k) => (row[k] ?? "") !== "");
          if (keys.length) importedCells[String(i)] = keys;
        });
        const sheet = emptyLfpSheet(nextLfpSheetName(systemDesignation, pool), {
          rows: imp.rows,
          notes: imp.notes,
          importedCells,
        });
        pool = [...pool, sheet];
        created.push(sheet);
      }
      onChange([...sheets, ...created]);
      setActiveId(created[0]?.id ?? activeId);
      setImportOpen(false);
      toast.success(`${created.length} blad importerade`);
    } catch {
      toast.error("Importen misslyckades");
    } finally {
      setImporting(false);
    }
  }, [activeId, importPicked, onChange, sheets, systemDesignation]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "rounded-md px-3 py-2 text-sm border transition-colors",
                s.id === active?.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
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
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importera
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Nytt blad
          </Button>
        </div>
      </div>

      {!active ? (
        <p className="text-sm text-muted-foreground">
          Inga luftflödesprotokoll ännu. Skapa ett nytt blad eller importera ett tidigare protokoll.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Bladnamn</Label>
              <Input value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Plan</Label>
              <Input value={active.plan ?? ""} onChange={(e) => patchActive({ plan: e.target.value })} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">System</Label>
              <Input
                value={active.system ?? ""}
                placeholder={systemDesignation}
                onChange={(e) => patchActive({ system: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={duplicateSheet}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={deleteSheet}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Radera blad
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Paintbrush className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {selected ? "Färglägg markerad cell:" : "Markera en cell för att färglägga"}
            </span>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c.label}
                type="button"
                disabled={!selected}
                title={c.label}
                onClick={() => applyColor(c.value)}
                className="h-6 w-6 rounded border border-border disabled:opacity-40"
                style={{ background: c.value || "transparent" }}
              />
            ))}
          </div>

          <AirflowGrid
            rows={active.rows}
            importedCells={importedSets}
            cellColors={active.cellColors}
            onCellChange={handleCellChange}
            onCellSelect={(row, colKey) => setSelected({ row, colKey })}
            onRowReorder={handleRowReorder}
          />

          <NotesGrid notes={active.notes} onNotesCommit={(notes) => patchActive({ notes })} />
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importera luftflödesprotokoll</DialogTitle>
            <DialogDescription>Välj vilka blad som ska läggas till på aggregatet.</DialogDescription>
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
  );
});
