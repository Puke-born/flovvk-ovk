import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  containerClassName?: string;
  allowEmpty?: boolean;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Välj…",
  containerClassName,
  allowEmpty = true,
}: SelectFieldProps) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value || "__none__"} onValueChange={(v) => onValueChange(v === "__none__" ? "" : v)}>
        <SelectTrigger id={id} className="h-12 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="__none__">
              <span className="text-muted-foreground">— inget valt —</span>
            </SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-base py-3">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
