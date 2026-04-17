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
