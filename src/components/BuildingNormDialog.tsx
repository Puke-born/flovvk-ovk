import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/Field";
import { type BuildingNorm } from "@/lib/db";

interface BuildingNormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<BuildingNorm>;
  title: string;
  onSave: (n: Omit<BuildingNorm, "id">) => void;
}

export function BuildingNormDialog({ open, onOpenChange, initial, title, onSave }: BuildingNormDialogProps) {
  const [form, setForm] = React.useState<Omit<BuildingNorm, "id">>({
    year: "",
    norm: "",
    note: "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        year: initial?.year ?? "",
        norm: initial?.norm ?? "",
        note: initial?.note ?? "",
      });
    }
  }, [open, initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field
            label="Årtal"
            inputMode="numeric"
            value={form.year}
            onChange={(e) => set("year", e.target.value)}
          />
          <Field
            label="Byggnorm"
            value={form.norm}
            onChange={(e) => set("norm", e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <TextAreaField
            label="Anteckning"
            value={form.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
            containerClassName="sm:col-span-3"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="touch-button">
            Avbryt
          </Button>
          <Button
            onClick={() => {
              if (!form.year.trim() || !form.norm.trim()) return;
              onSave(form);
              onOpenChange(false);
            }}
            className="touch-button"
          >
            Spara
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
