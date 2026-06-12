import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { subscribeSync, kick, type SyncState } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

export function SyncStatus() {
  const [s, setS] = useState<SyncState>({
    status: "idle",
    pending: 0,
    lastSyncAt: null,
  });
  useEffect(() => subscribeSync(setS), []);

  const label =
    s.status === "syncing"
      ? "Synkar…"
      : s.status === "offline"
      ? s.pending > 0
        ? `Offline · ${s.pending} väntar`
        : "Offline"
      : s.status === "error"
      ? "Synkfel"
      : s.pending > 0
      ? `${s.pending} väntar`
      : "Synkad";

  const Icon =
    s.status === "syncing"
      ? RefreshCw
      : s.status === "offline"
      ? CloudOff
      : s.status === "error"
      ? AlertTriangle
      : Cloud;

  return (
    <button
      onClick={() => kick()}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 h-8 rounded-md hover:bg-accent text-muted-foreground",
        s.status === "error" && "text-destructive",
      )}
      title={s.error || label}
      type="button"
    >
      <Icon className={cn("h-4 w-4", s.status === "syncing" && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
