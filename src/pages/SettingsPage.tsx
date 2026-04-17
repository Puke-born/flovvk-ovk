import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Pencil } from "lucide-react";
import { db, type Contact, type Inspector, uid } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { ContactDialog } from "@/components/ContactDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function ContactList({ table }: { table: "propertyOwners" | "operationsManagers" }) {
  const items = useLiveQuery(() => db[table].toArray(), [], []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | undefined>();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {items?.length ?? 0} {items?.length === 1 ? "post" : "poster"}
        </p>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
          className="touch-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Lägg till
        </Button>
      </div>
      <div className="grid gap-2">
        {items?.map((c) => (
          <Card key={c.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                {[c.contactPerson, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => {
                setEditing(c);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await db[table].delete(c.id);
                toast.success("Raderad");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {items && items.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed">Inga poster ännu.</Card>
        )}
      </div>
      <ContactDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        title={editing ? "Redigera" : "Ny post"}
        onSave={async (data) => {
          if (editing) {
            await db[table].update(editing.id, data);
            toast.success("Sparat");
          } else {
            await db[table].add({ id: uid(), ...data });
            toast.success("Tillagd");
          }
        }}
      />
    </div>
  );
}

function InspectorForm() {
  const inspector = useLiveQuery(() => db.inspector.get("inspector"), [], undefined);
  const [form, setForm] = useState<Omit<Inspector, "id">>({
    name: "",
    authorization: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    postalCode: "",
    city: "",
  });

  useEffect(() => {
    if (inspector) {
      setForm({
        name: inspector.name ?? "",
        authorization: inspector.authorization ?? "",
        phone: inspector.phone ?? "",
        email: inspector.email ?? "",
        company: inspector.company ?? "",
        address: inspector.address ?? "",
        postalCode: inspector.postalCode ?? "",
        city: inspector.city ?? "",
      });
    }
  }, [inspector?.name, inspector?.authorization, inspector?.phone, inspector?.email, inspector?.company]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Dessa uppgifter förifylls automatiskt på nya besiktningar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Namn" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <Field label="Behörighet" value={form.authorization ?? ""} onChange={(e) => set("authorization", e.target.value)} />
        <Field label="Företag" value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} />
        <Field label="Telefon" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        <Field label="E-post" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} containerClassName="sm:col-span-2" />
        <Field label="Adress" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} containerClassName="sm:col-span-2" />
        <Field label="Postnr" value={form.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} />
        <Field label="Ort" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
      </div>
      <Button
        size="lg"
        className="touch-button"
        onClick={async () => {
          await db.inspector.put({ id: "inspector", ...form });
          toast.success("Besiktningsman sparad");
        }}
      >
        Spara
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Inställningar">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inställningar</h1>
        <Tabs defaultValue="inspector">
          <TabsList className="h-12 w-full grid grid-cols-3">
            <TabsTrigger value="inspector" className="text-base h-10">Besiktningsman</TabsTrigger>
            <TabsTrigger value="owners" className="text-base h-10">Fastighetsägare</TabsTrigger>
            <TabsTrigger value="ops" className="text-base h-10">Driftansvariga</TabsTrigger>
          </TabsList>
          <TabsContent value="inspector" className="mt-4">
            <Card className="p-4 sm:p-6">
              <InspectorForm />
            </Card>
          </TabsContent>
          <TabsContent value="owners" className="mt-4">
            <Card className="p-4 sm:p-6">
              <ContactList table="propertyOwners" />
            </Card>
          </TabsContent>
          <TabsContent value="ops" className="mt-4">
            <Card className="p-4 sm:p-6">
              <ContactList table="operationsManagers" />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
