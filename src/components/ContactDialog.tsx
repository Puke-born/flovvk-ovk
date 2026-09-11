import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { type Contact } from "@/lib/db";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<Contact>;
  title: string;
  onSave: (c: Omit<Contact, "id">) => void;
}

export function ContactDialog({ open, onOpenChange, initial, title, onSave }: ContactDialogProps) {
  const [form, setForm] = React.useState<Omit<Contact, "id">>({
    name: "",
    contactPerson: "",
    address: "",
    postalCode: "",
    city: "",
    phone: "",
    email: "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        contactPerson: initial?.contactPerson ?? "",
        address: initial?.address ?? "",
        postalCode: initial?.postalCode ?? "",
        city: initial?.city ?? "",
        phone: initial?.phone ?? "",
        email: initial?.email ?? "",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Namn / Företag" value={form.name} onChange={(e) => set("name", e.target.value)} containerClassName="sm:col-span-2" />
          <Field label="Kontaktperson" value={form.contactPerson ?? ""} onChange={(e) => set("contactPerson", e.target.value)} containerClassName="sm:col-span-2" />
          <Field label="Adress" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} containerClassName="sm:col-span-2" />
          <Field label="Postnr" value={form.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} />
          <Field label="Ort" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          <Field label="Telefon" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          <Field label="E-post" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="touch-button">Avbryt</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) return;
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
