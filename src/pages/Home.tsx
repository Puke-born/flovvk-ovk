import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, FileText, ChevronRight } from "lucide-react";
import { db, createInspection, deleteInspection } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/AppShell";
import { formatDateSE } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Home() {
  const navigate = useNavigate();
  const inspections = useLiveQuery(
    async () => {
      const all = await db.inspections.orderBy("updatedAt").reverse().toArray();
      return all.filter((i) => !i.archived);
    },
    [],
    [],
  );
  const allUnits = useLiveQuery(() => db.units.toArray(), [], []);

  const unitCount = (id: string) => (allUnits ?? []).filter((u) => u.inspectionId === id).length;

  const startNew = async () => {
    const id = await createInspection();
    navigate(`/inspection/${id}`);
  };

  return (
    <AppShell title="Besiktningar">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">OVK-besiktningar</h1>
            <p className="text-muted-foreground mt-1">Skapa, fyll i och exportera intyg & protokoll.</p>
          </div>
          <Button onClick={startNew} size="lg" className="touch-button h-14 text-base px-6">
            <Plus className="mr-2 h-5 w-5" /> Ny besiktning
          </Button>
        </div>

        {inspections && inspections.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">Inga pågående besiktningar</h2>
            <p className="text-muted-foreground mt-1 mb-4">Tryck på "Ny besiktning" för att börja.</p>
            <Button onClick={startNew} size="lg" className="touch-button">
              <Plus className="mr-2 h-5 w-5" /> Ny besiktning
            </Button>
          </Card>
        )}

        <div className="grid gap-3">
          {inspections?.map((insp) => (
            <Card key={insp.id} className="overflow-hidden">
              <div className="flex items-stretch">
                <Link
                  to={`/inspection/${insp.id}`}
                  className="flex-1 flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors min-w-0"
                >
                  <div className="h-12 w-12 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {(insp.propertyDesignation || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-base">
                      {insp.propertyDesignation || <span className="text-muted-foreground italic">Namnlös besiktning</span>}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {insp.address || "—"} · {unitCount(insp.id)} aggregat · uppdaterad {formatDateSE(insp.updatedAt)}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-auto w-12 rounded-none border-l text-muted-foreground hover:text-destructive"
                      aria-label="Radera"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Radera besiktning?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Detta tar bort besiktningen och alla aggregat. Kan inte ångras.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="touch-button">Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        className="touch-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          await deleteInspection(insp.id);
                          toast.success("Besiktning raderad");
                        }}
                      >
                        Radera
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
