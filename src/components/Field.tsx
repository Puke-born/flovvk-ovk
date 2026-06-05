import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  containerClassName?: string;
}

export function Field({ label, hint, containerClassName, className, id, ...rest }: FieldProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input id={inputId} className={cn("touch-input", className)} {...rest} />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

type BufferedFieldProps = Omit<FieldProps, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
};

export const BufferedField = React.memo(function BufferedField({
  value,
  onValueChange,
  debounceMs = 300,
  onBlur,
  ...props
}: BufferedFieldProps) {
  const [draft, setDraft] = React.useState(value);
  const draftRef = React.useRef(draft);
  const valueRef = React.useRef(value);
  const onValueChangeRef = React.useRef(onValueChange);

  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  React.useEffect(() => {
    valueRef.current = value;
    setDraft((current) => (current === value ? current : value));
  }, [value]);

  const flush = React.useCallback(() => {
    const next = draftRef.current;
    if (next !== valueRef.current) {
      valueRef.current = next;
      onValueChangeRef.current(next);
    }
  }, []);

  React.useEffect(() => {
    draftRef.current = draft;
    if (draft === valueRef.current) return;
    const timeout = window.setTimeout(flush, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, draft, flush]);

  React.useEffect(() => () => flush(), [flush]);

  return (
    <Field
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        flush();
        onBlur?.(e);
      }}
    />
  );
});

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  containerClassName?: string;
}

export function TextAreaField({ label, containerClassName, className, id, ...rest }: TextAreaFieldProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea id={inputId} className={cn("min-h-[96px] text-base", className)} {...rest} />
    </div>
  );
}
