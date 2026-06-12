import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { X, Users, FileSpreadsheet, BookOpen, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";

const KEY = "ovk.onboardingDismissed";

export function OnboardingCard() {
  const { user, companyName } = useAuth();
  const inspectors = useLiveQuery(() => db.inspectors.count(), [], 0);
  const template = useLiveQuery(() => db.excelTemplate.get("template"), [], undefined);
  const norms = useLiveQuery(() => db.buildingNorms.count(), [], 0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    const key = `${KEY}:${user.id}`;
    setDismissed(localStorage.getItem(key) === "1");
  }, [user]);

  if (dismissed || !user) return null;
  const needsInspector = (inspectors ?? 0) === 0;
  const needsTemplate = !template;
  const needsNorms = (norms ?? 0) === 0;
  if (!needsInspector && !needsTemplate && !needsNorms) return null;

  const onDismiss = () => {
    if (user) localStorage.setItem(`${KEY}:${user.id}`, "1");
    setDismissed(true);
  };

  return (
    <Card className="p-4 sm:p-5 bg-primary/5 border-primary/30 relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="font-semibold text-base sm:text-lg pr-8">
        Välkommen{companyName ? ` till ${companyName}` : ""}!
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        Innan första besiktningen — lägg upp följande i Inställningar. Allt delas inom företaget.
      </p>
      <div className="grid sm:grid-cols-3 gap-2">
        {needsInspector && (
          <SetupChip to="/settings" icon={Users} label="Lägg till besiktningsman" />
        )}
        {needsTemplate && (
          <SetupChip to="/settings" icon={FileSpreadsheet} label="Ladda upp Excel-mall" />
        )}
        {needsNorms && (
          <SetupChip to="/settings" icon={BookOpen} label="Lägg till byggnormer" />
        )}
        <SetupChip to="/settings" icon={Building2} label="Fastighetsägare & drift" />
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dölj detta
        </Button>
      </div>
    </Card>
  );
}

function SetupChip({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 p-3 rounded-md border bg-card hover:bg-accent transition-colors"
    >
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm">{label}</span>
    </Link>
  );
}
