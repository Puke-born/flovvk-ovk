import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type BuildingNorm } from "@/lib/db";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (rows: Omit<BuildingNorm, "id">[]) => void;
}

function parseList(text: string): Omit<BuildingNorm, "id">[] {
  const rows: Omit<BuildingNorm, "id">[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Skip a likely header row
    if (/^årtal\b/i.test(line) && /byggnorm/i.test(line)) continue;
    // Split on tab or first run of whitespace
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    const year = m[1].trim();
    const norm = m[2].trim();
    if (!year || !norm) continue;
    rows.push({ year, norm });
  }
  return rows;
}

export function BuildingNormBulkDialog({ open, onOpenChange, onImport }: Props) {
  const [text, setText] = React.useState("");
  const preview = React.useMemo(() => parseList(text), [text]);

  React.useEffect(() => {
    if (open) setText("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Lägg till lista med byggnormer</DialogTitle>
          <DialogDescription>
            Klistra in en lista. En rad per byggnorm — årtal först, sedan namnet (separerade med
            mellanslag eller tab). Du kan klistra in direkt från Excel.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="font-mono text-sm"
          placeholder={"1946\tBABS 1946\n1950\tBABS 1950\n1968\tSBN 67\n..."}
        />
        <p className="text-xs text-muted-foreground">
          {preview.length} {preview.length === 1 ? "rad" : "rader"} hittade
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="touch-button">
            Avbryt
          </Button>
          <Button
            disabled={preview.length === 0}
            onClick={() => {
              onImport(preview);
              onOpenChange(false);
            }}
            className="touch-button"
          >
            Importera {preview.length > 0 ? `(${preview.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
