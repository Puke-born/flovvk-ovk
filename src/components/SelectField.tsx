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

export const SelectField = React.memo(function SelectField({
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
  const opts = React.useMemo(() => options.map(normalize), [options]);
  const knownValues = React.useMemo(() => new Set(opts.map((o) => o.value)), [opts]);
  const isCustomValue = allowCustom && !!value && !knownValues.has(value);
  const [customMode, setCustomMode] = React.useState(isCustomValue);
  const [customDraft, setCustomDraft] = React.useState(value);
  const valueRef = React.useRef(value);
  const customDraftRef = React.useRef(customDraft);
  const onValueChangeRef = React.useRef(onValueChange);

  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  React.useEffect(() => {
    if (isCustomValue) setCustomMode(true);
  }, [isCustomValue]);

  React.useEffect(() => {
    valueRef.current = value;
    setCustomDraft((current) => (current === value ? current : value));
  }, [value]);

  const flushCustom = React.useCallback(() => {
    const next = customDraftRef.current;
    if (next !== valueRef.current) {
      valueRef.current = next;
      onValueChangeRef.current(next);
    }
  }, []);

  React.useEffect(() => {
    customDraftRef.current = customDraft;
    if (!allowCustom || !customMode || customDraft === valueRef.current) return;
    const timeout = window.setTimeout(flushCustom, 300);
    return () => window.clearTimeout(timeout);
  }, [allowCustom, customDraft, customMode, flushCustom]);

  React.useEffect(() => () => flushCustom(), [flushCustom]);

  if (allowCustom && customMode) {
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            className="h-11 text-base pr-10"
            value={customDraft}
            onChange={(e) => {
              customDraftRef.current = e.target.value;
              setCustomDraft(e.target.value);
            }}
            onBlur={flushCustom}
            placeholder="Skriv egen text…"
            autoFocus={!isCustomValue}
          />
          <button
            type="button"
            aria-label="Visa lista"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent text-muted-foreground"
            onClick={() => {
              valueRef.current = "";
              customDraftRef.current = "";
              setCustomDraft("");
              onValueChange("");
              setCustomMode(false);
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
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
        <SelectContent className="max-h-none">
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
              className={cn("text-base py-3", o.disabled && "text-muted-foreground")}
              title={o.disabled ? o.disabledReason : undefined}
            >
              {o.label}
              {o.disabled && o.disabledReason ? (
                <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
                  {o.disabledReason}
                </span>
              ) : null}
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
});
