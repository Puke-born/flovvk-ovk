import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FileSpreadsheet } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { InspectionHeaderForm } from "@/sections/InspectionHeaderForm";
import { UnitsSection } from "@/sections/UnitsSection";
import { IntygView } from "@/sections/IntygView";
import { exportInspectionToExcel } from "@/lib/excelExport";
import { toast } from "sonner";

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inspection = useLiveQuery(() => (id ? db.inspections.get(id) : undefined), [id]);
  const template = useLiveQuery(() => db.excelTemplate.get("template"), []);
  const [tab, setTab] = useState<string>("aggregate");
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  return (
    <AppShell title={title} right={right}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <InspectionHeaderForm inspection={inspection} />

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="h-11 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="intyg" className="text-base h-9">
              Intyg
            </TabsTrigger>
            <TabsTrigger value="aggregate" className="text-base h-9">
              Aggregat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="aggregate" className="mt-4">
            <UnitsSection inspectionId={id} />
          </TabsContent>
          <TabsContent value="intyg" className="mt-4">
            <IntygView inspection={inspection} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
