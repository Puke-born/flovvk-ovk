import { Link, useLocation } from "react-router-dom";
import { Settings, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import flovvkLogo from "@/assets/flovvk-logo.png";

interface AppShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  right?: React.ReactNode;
}

export function AppShell({ children, title, right }: AppShellProps) {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 no-print">
        <div className="flex items-center gap-3 px-4 h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="FLOVVK">
            <img
              src={flovvkLogo}
              alt="FLOVVK – Protokoll & ventilationskontroll"
              className="h-9 sm:h-10 w-auto"
            />
          </Link>
          <div className="flex-1 min-w-0 truncate text-sm sm:text-base font-medium text-muted-foreground">
            {title}
          </div>
          <div className="flex items-center gap-1">
            {right}
            <Link
              to="/"
              className={cn(
                "inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-accent",
                loc.pathname === "/" && "text-primary",
              )}
              aria-label="Hem"
            >
              <HomeIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/settings"
              className={cn(
                "inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-accent",
                loc.pathname === "/settings" && "text-primary",
              )}
              aria-label="Inställningar"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
