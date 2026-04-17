import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InstallPage() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <AppShell title="Installera app">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <Smartphone className="mx-auto h-12 w-12 text-primary mb-3" />
          <h1 className="text-3xl font-bold">Installera OVK på surfplattan</h1>
          <p className="text-muted-foreground mt-2">
            Få en ikon på hemskärmen och kör appen i helskärm – precis som en vanlig app.
          </p>
        </div>

        {deferred && !installed && (
          <Card className="p-6">
            <Button
              size="lg"
              className="touch-button w-full h-14"
              onClick={async () => {
                await deferred.prompt();
                setDeferred(null);
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Installera nu
            </Button>
          </Card>
        )}

        {installed && (
          <Card className="p-6 text-center bg-success/10 border-success/30">
            <p className="font-semibold text-success">✓ Appen är installerad</p>
          </Card>
        )}

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg">Android (Chrome)</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Tryck på menyn (⋮) uppe till höger.</li>
            <li>Välj <strong>"Installera app"</strong> eller <strong>"Lägg till på startskärmen"</strong>.</li>
            <li>Bekräfta. Appen läggs på hemskärmen.</li>
          </ol>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg">iPad (Safari)</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Tryck på Dela-knappen (⬆️).</li>
            <li>Välj <strong>"Lägg till på hemskärmen"</strong>.</li>
            <li>Bekräfta namnet och tryck "Lägg till".</li>
          </ol>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          OBS: Appen måste vara <strong>publicerad</strong> (inte preview) för att installeras. All data sparas
          lokalt på enheten via IndexedDB.
        </p>
      </div>
    </AppShell>
  );
}
