import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Upload, FileSpreadsheet, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { scanTemplate, TEMPLATE_AGGREGATE_SHEET_NAME } from "@/lib/excelExport";
import { AVAILABLE_PLACEHOLDERS } from "@/lib/excelPlaceholders";

interface ScanResult {
  sheetNames: string[];
  placeholders: string[];
  hasAggregateSheet: boolean;
}

export function ExcelTemplateManager() {
  const tpl = useLiveQuery(() => db.excelTemplate.get("template"), []);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rescan = async (buf: ArrayBuffer) => {
    setScanning(true);
    try {
      const res = await scanTemplate(buf);
      setScan(res);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte läsa mallen");
      setScan(null);
    } finally {
      setScanning(false);
    }
  };

  // Auto-scan when template changes
  if (tpl && !scan && !scanning) {
    rescan(tpl.data);
  }

  const onFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Filen måste vara en .xlsx");
      return;
    }
    const buf = await file.arrayBuffer();
    await db.excelTemplate.put({
      id: "template",
      fileName: file.name,
      uploadedAt: Date.now(),
      data: buf,
    });
    setScan(null);
    await rescan(buf);
    toast.success("Mall uppladdad");
  };

  const onDelete = async () => {
    await db.excelTemplate.delete("template");
    setScan(null);
    toast.success("Mall raderad");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ladda upp din Excel-mall (.xlsx). Använd platshållare som <code className="text-xs bg-muted px-1 rounded">{`{{propertyDesignation}}`}</code> i
        cellerna där datan ska hamna. Skapa en flik med exakt namnet{" "}
        <strong>{TEMPLATE_AGGREGATE_SHEET_NAME}</strong> — den dupliceras till en flik per
        aggregat vid export. På den fliken används <code className="text-xs bg-muted px-1 rounded">{`{{unit.*}}`}</code>-platshållare.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      {tpl ? (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{tpl.fileName}</div>
              <div className="text-xs text-muted-foreground">
                Uppladdad {new Date(tpl.uploadedAt).toLocaleString("sv-SE")}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              Byt
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {scan && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {scan.hasAggregateSheet ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>
                      Hittade fliken <strong>{TEMPLATE_AGGREGATE_SHEET_NAME}</strong> — dupliceras per aggregat.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>
                      Saknar flik med namnet <strong>{TEMPLATE_AGGREGATE_SHEET_NAME}</strong>. Aggregat
                      kommer inte att exporteras.
                    </span>
                  </>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Flikar i mallen ({scan.sheetNames.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {scan.sheetNames.map((n) => (
                    <Badge
                      key={n}
                      variant={n === TEMPLATE_AGGREGATE_SHEET_NAME ? "default" : "secondary"}
                    >
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Funna platshållare ({scan.placeholders.length})
                </div>
                {scan.placeholders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Inga <code className="text-xs">{`{{...}}`}</code>-platshållare hittade i mallen.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-40 overflow-auto">
                    {scan.placeholders.map((p) => {
                      const known = isKnownPlaceholder(p);
                      return (
                        <Badge
                          key={p}
                          variant={known ? "secondary" : "outline"}
                          className={!known ? "border-destructive text-destructive" : ""}
                          title={known ? "" : "Okänd platshållare — kontrollera stavning"}
                        >
                          {`{{${p}}}`}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card
          className="p-8 border-dashed text-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium">Ladda upp Excel-mall</p>
          <p className="text-xs text-muted-foreground mt-1">Klicka för att välja en .xlsx-fil</p>
        </Card>
      )}

      <div className="space-y-3">
        <div className="text-sm font-semibold">Tillgängliga platshållare</div>
        <p className="text-xs text-muted-foreground">
          Kopiera och klistra in dessa i cellerna i din mall. Skriv exakt såhär, inklusive de
          dubbla klammerparenteserna.
        </p>
        {Object.entries(AVAILABLE_PLACEHOLDERS).map(([group, keys]) => (
          <Card key={group} className="p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {group}
            </div>
            <div className="flex flex-wrap gap-1">
              {keys.map((k) => (
                <code
                  key={k}
                  className="text-xs bg-muted px-2 py-1 rounded font-mono"
                  onClick={(e) => {
                    const text = `{{${k.split(" ")[0]}}}`;
                    navigator.clipboard?.writeText(text);
                    toast.success(`Kopierat: ${text}`);
                    e.preventDefault();
                  }}
                  style={{ cursor: "copy" }}
                >
                  {`{{${k.split(" ")[0]}}}`}
                  {k.includes(" ") && (
                    <span className="text-muted-foreground ml-1 font-sans">
                      {k.slice(k.indexOf(" "))}
                    </span>
                  )}
                </code>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function isKnownPlaceholder(key: string): boolean {
  const all = new Set<string>();
  Object.values(AVAILABLE_PLACEHOLDERS).forEach((list) =>
    list.forEach((k) => all.add(k.split(" ")[0])),
  );
  if (all.has(key)) return true;
  if (key.startsWith("unit.custom.")) return true;
  return false;
}
