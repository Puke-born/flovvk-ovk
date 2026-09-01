import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface SortableTabProps {
  id: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

/** Flik som går att dra (och som samtidigt är en släpp-yta). */
export function SortableTab({ id, active, className, onClick, children }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "shrink-0 rounded-md border px-3 h-9 text-sm font-medium transition-colors whitespace-nowrap touch-none select-none",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent border-border text-foreground",
        isDragging && "opacity-50 z-10",
        isOver && !isDragging && "ring-2 ring-primary ring-offset-1",
        className,
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </button>
  );
}

/** Släpp-yta för en hel rad (t.ex. tom rad med lösa blad). */
export function DropRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "bg-accent/60 rounded-md ring-1 ring-primary/40")}
    >
      {children}
    </div>
  );
}
