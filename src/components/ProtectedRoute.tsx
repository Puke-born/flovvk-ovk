import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Laddar…
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}
