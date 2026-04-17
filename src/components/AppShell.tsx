import { Link, useLocation } from "react-router-dom";
import { Settings, Home as HomeIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";

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
          <Link to="/" className="flex items-center gap-2 font-bold text-primary text-lg shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              OVK
            </span>
            <span className="hidden sm:inline text-foreground">Besiktning</span>
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
              to="/install"
              className={cn(
                "inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-accent",
                loc.pathname === "/install" && "text-primary",
              )}
              aria-label="Installera app"
            >
              <Download className="h-5 w-5" />
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
