import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption =
  | string
  | {
      value: string;
      label?: string;
      disabled?: boolean;
      disabledReason?: string;
    };

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  containerClassName?: string;
  allowEmpty?: boolean;
  allowCustom?: boolean;
}

function normalize(o: SelectOption) {
  return typeof o === "string"
    ? { value: o, label: o, disabled: false, disabledReason: undefined as string | undefined }
    : { value: o.value, label: o.label ?? o.value, disabled: !!o.disabled, disabledReason: o.disabledReason };
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Välj…",
  containerClassName,
  allowEmpty = true,
  allowCustom = false,
}: SelectFieldProps) {
  const id = React.useId();
  const opts = options.map(normalize);
  const knownValues = new Set(opts.map((o) => o.value));
  const isCustomValue = allowCustom && !!value && !knownValues.has(value);
  const [customMode, setCustomMode] = React.useState(isCustomValue);
  React.useEffect(() => {
    if (isCustomValue) setCustomMode(true);
  }, [isCustomValue]);

  if (allowCustom && customMode) {
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              onValueChange("");
              setCustomMode(false);
            }}
          >
            Lista
          </button>
        </div>
        <Input
          id={id}
          className="h-11 text-base"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Skriv egen text…"
          autoFocus={!isCustomValue}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value || "__none__"}
        onValueChange={(v) => {
          if (v === "__custom__") {
            onValueChange("");
            setCustomMode(true);
            return;
          }
          onValueChange(v === "__none__" ? "" : v);
        }}
      >
        <SelectTrigger id={id} className="h-11 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="__none__">
              <span className="text-muted-foreground">— inget valt —</span>
            </SelectItem>
          )}
          {opts.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              className="text-base py-3"
              title={o.disabled ? o.disabledReason : undefined}
            >
              <span className={o.disabled ? "text-muted-foreground" : undefined}>
                {o.label}
                {o.disabled && o.disabledReason ? (
                  <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
                    {o.disabledReason}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
          {allowCustom && (
            <SelectItem value="__custom__" className="text-base py-3">
              <span className="text-muted-foreground">+ Egen text…</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
