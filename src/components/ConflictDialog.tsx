import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  subscribeConflicts,
  resolveConflict,
  type ConflictItem,
} from "@/lib/sync/engine";

const ENTITY_LABEL: Record<string, string> = {
  inspection: "Besiktning",
  unit: "Aggregat",
  propertyOwner: "Fastighetsägare",
  operationsManager: "Driftansvarig",
  inspector: "Besiktningsman",
  buildingNorm: "Byggnorm",
  excelTemplate: "Excel-mall",
};

export function ConflictDialog() {
  const [items, setItems] = useState<ConflictItem[]>([]);
  useEffect(() => subscribeConflicts(setItems), []);
  const current = items[0];
  const open = !!current;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konflikt vid synkning</AlertDialogTitle>
          <AlertDialogDescription>
            En kollega har sparat ändringar i{" "}
            <strong>{current ? ENTITY_LABEL[current.entity] ?? current.entity : ""}</strong>{" "}
            efter dina lokala ändringar. Vill du behålla dina ändringar eller använda
            kollegans version?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => current && resolveConflict(current, "local")}
          >
            Behåll mina
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => current && resolveConflict(current, "server")}
          >
            Använd kollegans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
