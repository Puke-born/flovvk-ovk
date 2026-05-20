import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}

export function SignaturePad({ value, onChange, label = "Signatur" }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-8">
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Rensa
        </Button>
      </div>
      <div className="rounded-md border border-input bg-background overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
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
