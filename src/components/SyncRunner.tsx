import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { startSync, stopSync } from "@/lib/sync/engine";

/** Starts the sync engine when a session + companyId are available. */
export function SyncRunner() {
  const { session, companyId } = useAuth();
  useEffect(() => {
    if (session && companyId) {
      startSync(companyId);
      return () => stopSync();
    }
  }, [session, companyId]);
  return null;
}
