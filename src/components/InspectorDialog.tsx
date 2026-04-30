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
import { SignaturePad } from "@/components/SignaturePad";
import { type Inspector } from "@/lib/db";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<Inspector>;
  title: string;
  onSave: (i: Omit<Inspector, "id">) => void;
}

export function InspectorDialog({ open, onOpenChange, initial, title, onSave }: Props) {
  const [form, setForm] = React.useState<Omit<Inspector, "id">>({
    name: "",
    authorization: "",
    certificationNumber: "",
    signature: undefined,
    company: "",
    orgNumber: "",
    phone: "",
    email: "",
    address: "",
    postalCode: "",
    city: "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        authorization: initial?.authorization ?? "",
        certificationNumber: initial?.certificationNumber ?? "",
        signature: initial?.signature,
        company: initial?.company ?? "",
        orgNumber: initial?.orgNumber ?? "",
        phone: initial?.phone ?? "",
        email: initial?.email ?? "",
        address: initial?.address ?? "",
        postalCode: initial?.postalCode ?? "",
        city: initial?.city ?? "",
      });
    }
  }, [open, initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Namn *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Field
            label="Behörighet"
            value={form.authorization ?? ""}
            onChange={(e) => set("authorization", e.target.value)}
          />
          <Field
            label="Certifieringsnummer"
            value={form.certificationNumber ?? ""}
            onChange={(e) => set("certificationNumber", e.target.value)}
          />
          <Field
            label="Företag"
            value={form.company ?? ""}
            onChange={(e) => set("company", e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Field
            label="Telefon"
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Field
            label="E-post"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
          <Field
            label="Adress"
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Field
            label="Postnr"
            value={form.postalCode ?? ""}
            onChange={(e) => set("postalCode", e.target.value)}
          />
          <Field
            label="Ort"
            value={form.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
          />
          <div className="sm:col-span-2">
            <SignaturePad
              value={form.signature}
              onChange={(v) => set("signature", v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="touch-button">
            Avbryt
          </Button>
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
