import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setSyncContext, db } from "@/lib/db";

interface AuthState {
  session: Session | null;
  user: User | null;
  companyId: string | null;
  companyName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  session: null,
  user: null,
  companyId: null,
  companyName: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore last known companyId from localStorage so offline launches still work.
  useEffect(() => {
    const cached = localStorage.getItem("ovk.companyId");
    const cachedName = localStorage.getItem("ovk.companyName");
    if (cached) {
      setCompanyId(cached);
      setSyncContext({ companyId: cached });
    }
    if (cachedName) setCompanyName(cachedName);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSyncContext({ userId: s?.user?.id });
      if (s?.user) {
        // Fetch company membership in background.
        setTimeout(() => loadCompany(s.user.id), 0);
      } else {
        setCompanyId(null);
        setCompanyName(null);
        localStorage.removeItem("ovk.companyId");
        localStorage.removeItem("ovk.companyName");
        setSyncContext({ companyId: undefined });
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSyncContext({ userId: data.session?.user?.id });
      if (data.session?.user) loadCompany(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadCompany(userId: string) {
    try {
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id, companies(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.company_id) {
        setCompanyId(data.company_id);
        localStorage.setItem("ovk.companyId", data.company_id);
        const name = (data.companies as any)?.name ?? null;
        if (name) {
          setCompanyName(name);
          localStorage.setItem("ovk.companyName", name);
        }
        setSyncContext({ companyId: data.company_id, userId });
        // Stamp any pre-existing local rows that have no companyId yet.
        await tagLocalRowsWithCompany(data.company_id);
      }
    } catch {
      // offline — fall back to cached id
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        user: session?.user ?? null,
        companyId,
        companyName,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

async function tagLocalRowsWithCompany(companyId: string) {
  const tables = [
    "inspections",
    "units",
    "propertyOwners",
    "operationsManagers",
    "inspectors",
    "buildingNorms",
    "excelTemplate",
  ] as const;
  for (const t of tables) {
    const rows = await (db as any)[t].toArray();
    for (const r of rows) {
      if (!r.companyId) {
        await (db as any)[t].update(r.id, { companyId });
      }
    }
  }
}
