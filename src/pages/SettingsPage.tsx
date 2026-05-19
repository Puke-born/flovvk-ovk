import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Pencil } from "lucide-react";
import { db, type Contact, type Inspector, type BuildingNorm, uid } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactDialog } from "@/components/ContactDialog";
import { InspectorDialog } from "@/components/InspectorDialog";
import { BuildingNormDialog } from "@/components/BuildingNormDialog";
import { BuildingNormBulkDialog } from "@/components/BuildingNormBulkDialog";
import { ExcelTemplateManager } from "@/components/ExcelTemplateManager";
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

function InspectorList() {
  const items = useLiveQuery(() => db.inspectors.toArray(), [], []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Inspector | undefined>();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Lägg upp en eller flera besiktningsmän. När du skapar en ny besiktning används den första i listan
        som standard – men du kan välja en annan per besiktning.
      </p>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {items?.length ?? 0} {items?.length === 1 ? "besiktningsman" : "besiktningsmän"}
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
        {items?.map((i) => (
          <Card key={i.id} className="p-3 flex items-center gap-3">
            {i.signature ? (
              <img
                src={i.signature}
                alt="Signatur"
                className="h-12 w-20 object-contain bg-background rounded border"
              />
            ) : (
              <div className="h-12 w-20 rounded border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">
                Ingen signatur
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{i.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                {[i.authorization, i.certificationNumber, i.company].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => {
                setEditing(i);
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
                await db.inspectors.delete(i.id);
                toast.success("Raderad");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {items && items.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed">
            Inga besiktningsmän ännu.
          </Card>
        )}
      </div>
      <InspectorDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        title={editing ? "Redigera besiktningsman" : "Ny besiktningsman"}
        onSave={async (data) => {
          if (editing) {
            await db.inspectors.update(editing.id, data);
            toast.success("Sparat");
          } else {
            await db.inspectors.add({ id: uid(), ...data });
            toast.success("Tillagd");
          }
        }}
      />
    </div>
  );
}

function BuildingNormList() {
  const items = useLiveQuery(
    () => db.buildingNorms.toArray().then((arr) => arr.sort((a, b) => (a.year || "").localeCompare(b.year || ""))),
    [],
    [],
  );
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<BuildingNorm | undefined>();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Lägg upp byggnormer kopplade till årtal som referens när du fyller i fastighetsdata.
      </p>
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {items?.length ?? 0} {items?.length === 1 ? "norm" : "normer"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="touch-button"
          >
            Lägg till lista
          </Button>
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
      </div>
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
        {items?.map((n) => (
          <Card key={n.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {n.year} — {n.norm}
              </div>
              {n.note && <div className="text-sm text-muted-foreground truncate">{n.note}</div>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => {
                setEditing(n);
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
                await db.buildingNorms.delete(n.id);
                toast.success("Raderad");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {items && items.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed">Inga byggnormer ännu.</Card>
        )}
      </div>
      <BuildingNormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        title={editing ? "Redigera byggnorm" : "Ny byggnorm"}
        onSave={async (data) => {
          if (editing) {
            await db.buildingNorms.update(editing.id, data);
            toast.success("Sparat");
          } else {
            await db.buildingNorms.add({ id: uid(), ...data });
            toast.success("Tillagd");
          }
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Inställningar">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inställningar</h1>
        <Tabs defaultValue="inspector">
          <TabsList className="h-11 w-full grid grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="inspector" className="text-base h-9">Besiktningsmän</TabsTrigger>
            <TabsTrigger value="owners" className="text-base h-9">Fastighetsägare</TabsTrigger>
            <TabsTrigger value="ops" className="text-base h-9">Driftansvariga</TabsTrigger>
            <TabsTrigger value="norms" className="text-base h-9">Byggnormer</TabsTrigger>
            <TabsTrigger value="excel" className="text-base h-9">Excel-mall</TabsTrigger>
          </TabsList>
          <TabsContent value="inspector" className="mt-4">
            <Card className="p-4 sm:p-6">
              <InspectorList />
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
          <TabsContent value="norms" className="mt-4">
            <Card className="p-4 sm:p-6">
              <BuildingNormList />
            </Card>
          </TabsContent>
          <TabsContent value="excel" className="mt-4">
            <Card className="p-4 sm:p-6">
              <ExcelTemplateManager />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
