import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, Copy, Paintbrush, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import AirflowGrid from "@/components/AirflowGrid";
import NotesGrid from "@/components/NotesGrid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addLfpSheets,
  deleteLfpSheet,
  emptyLfpSheet,
  nextLfpSheetName,
  saveLfpSheet,
  uid,
  LFP_ROW_COUNT,
  type LfpSheet,
} from "@/lib/db";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";

const COLOR_SWATCHES = [
  { label: "Ingen", value: "" },
  { label: "Gul", value: "#FFF3B0" },
  { label: "Grön", value: "#CDEAC0" },
  { label: "Röd", value: "#F6C6C6" },
  { label: "Blå", value: "#C9DDF5" },
  { label: "Grå", value: "#E2E2E2" },
];

interface Props {
  unitId: string;
  systemDesignation: string;
  /** Alla blad på aggregatet (för namngivning) */
  sheets: LfpSheet[];
  /** Bladet som visas */
  sheet: LfpSheet;
  onSelectSheet: (sheetId: string | null) => void;
}

export const LfpSection = memo(function LfpSection({
  unitId,
  systemDesignation,
  sheets,
  sheet,
  onSelectSheet,
}: Props) {
  const [draft, setDraft] = useState<LfpSheet>(sheet);
  const [selected, setSelected] = useState<{ row: number; colKey: string } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setDraft(sheet);
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id]);

  useDebouncedEffect(
    () => {
      void saveLfpSheet(unitId, draft);
    },
    [draft],
    500,
  );

  const patch = useCallback((p: Partial<LfpSheet>) => setDraft((d) => ({ ...d, ...p })), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const duplicateSheet = useCallback(async () => {
    const copy: LfpSheet = {
      ...structuredClone(draft),
      id: uid(),
      name: nextLfpSheetName(systemDesignation, sheets),
    };
    await addLfpSheets(unitId, [copy]);
    onSelectSheet(copy.id);
  }, [draft, onSelectSheet, sheets, systemDesignation, unitId]);

  const removeSheet = useCallback(async () => {
    await deleteLfpSheet(unitId, draft.id);
    onSelectSheet(null);
  }, [draft.id, onSelectSheet, unitId]);

  const handleCellChange = useCallback((rowIndex: number, colKey: string, value: string) => {
    setDraft((d) => ({
      ...d,
      rows: d.rows.map((r, i) => (i === rowIndex ? { ...r, [colKey]: value } : r)),
    }));
  }, []);

  const handleRowReorder = useCallback((from: number, to: number) => {
    setDraft((d) => {
      const rows = [...d.rows];
      const [moved] = rows.splice(from, 1);
      rows.splice(to, 0, moved);
      return { ...d, rows };
    });
  }, []);

  const applyColor = useCallback(
    (hex: string) => {
      if (!selected) return;
      setDraft((d) => {
        const colors: Record<string, Record<string, string>> = { ...(d.cellColors ?? {}) };
        const rowKey = String(selected.row);
        const row = { ...(colors[rowKey] ?? {}) };
        if (hex) row[selected.colKey] = hex;
        else delete row[selected.colKey];
        if (Object.keys(row).length) colors[rowKey] = row;
        else delete colors[rowKey];
        return { ...d, cellColors: colors };
      });
    },
    [selected],
  );

  const importedSets = useMemo(() => {
    const map = draft.importedCells ?? {};
    return Array.from({ length: LFP_ROW_COUNT }, (_, i) => new Set(map[String(i)] ?? []));
  }, [draft]);


  return (
    <Card
      className={
        fullscreen
          ? "fixed inset-0 z-50 rounded-none overflow-auto p-3 space-y-3 bg-background"
          : "p-4 sm:p-6 space-y-3"
      }
    >
      {fullscreen && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sticky top-0 bg-background z-10">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSheet(s.id)}
              className={
                "shrink-0 rounded-md border px-3 h-10 text-sm font-medium whitespace-nowrap " +
                (s.id === sheet.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border text-foreground")
              }
            >
              {s.name}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 h-10"
            onClick={() => setFullscreen(false)}
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Avsluta helskärm
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Bladnamn</Label>
          <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="col-span-1">
          <Label className="text-xs">Plan</Label>
          <Input value={draft.plan ?? ""} onChange={(e) => patch({ plan: e.target.value })} />
        </div>
        <div className="col-span-1">
          <Label className="text-xs">System</Label>
          <Input
            value={draft.system ?? ""}
            placeholder={systemDesignation}
            onChange={(e) => patch({ system: e.target.value })}
          />
        </div>
        <div className="col-span-2 flex items-end gap-2 flex-wrap">
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
          <Button type="button" variant="outline" size="sm" onClick={duplicateSheet}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={removeSheet}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Radera blad
          </Button>
          {!fullscreen && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Helskärm
            </Button>
          )}
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
        rows={draft.rows}
        importedCells={importedSets}
        cellColors={draft.cellColors}
        onCellChange={handleCellChange}
        onCellSelect={(row, colKey) => setSelected({ row, colKey })}
        onRowReorder={handleRowReorder}
      />

      <NotesGrid notes={draft.notes} onNotesCommit={(notes) => patch({ notes })} />

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
    </Card>
  );
});
