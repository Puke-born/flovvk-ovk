import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, ImageUp } from "lucide-react";

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}

export function SignaturePad({ value, onChange, label = "Signatur" }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = React.useState(!!value);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const setupCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  // Initialize once mounted
  React.useEffect(() => {
    setupCanvas();
    if (value) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasInk(true);
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setHasInk(true);
    const url = canvasRef.current?.toDataURL("image/png");
    onChange(url);
  };

  const clear = () => {
    setupCanvas();
    setHasInk(false);
    onChange(undefined);
  };

  const importImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        setupCanvas();
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(rect.width / img.width, rect.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (rect.width - w) / 2, (rect.height - h) / 2, w, h);

        // Gör nära-vit bakgrund genomskinlig
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] > 230 && px[i + 1] > 230 && px[i + 2] > 230) px[i + 3] = 0;
        }
        ctx.putImageData(data, 0, 0);

        setHasInk(true);
        onChange(canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importImage(f);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="h-8"
          >
            <ImageUp className="h-3.5 w-3.5 mr-1" />
            Importera bild
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-8">
            <Eraser className="h-3.5 w-3.5 mr-1" />
            Rensa
          </Button>
        </div>
      </div>
      <div className="relative rounded-md border border-input bg-background overflow-hidden">
        <div className="pointer-events-none absolute left-4 right-4 top-[58%] z-10 border-t border-dashed border-muted-foreground/50" />
        <canvas
          ref={canvasRef}
          className="relative z-20 block w-full touch-none cursor-crosshair"
          style={{ height: 140 }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
      </div>
      {!hasInk && (
        <span className="text-xs text-muted-foreground">Rita din signatur i rutan ovan.</span>
      )}
    </div>
  );
}
