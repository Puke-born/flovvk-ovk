import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { type Contact } from "@/lib/db";

interface ContactPickerProps {
  label: string;
  value?: string;
  contacts: Contact[];
  onSelect: (id: string | undefined) => void;
  onAddNew: () => void;
}

export function ContactPicker({ label, value, contacts, onSelect, onAddNew }: ContactPickerProps) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const selected = contacts.find((c) => c.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            className="h-12 justify-between text-base font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.name : "Välj eller sök…"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
          <Command>
            <CommandInput placeholder="Sök…" className="h-11 text-base" />
            <CommandList>
              <CommandEmpty>Ingen träff.</CommandEmpty>
              <CommandGroup>
                {contacts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name + " " + (c.contactPerson ?? "") + " " + (c.email ?? "")}
                    onSelect={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    className="py-3"
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      {c.contactPerson && <span className="text-xs text-muted-foreground">{c.contactPerson}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                  className="py-3 text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Lägg till ny…
                </CommandItem>
                {selected && (
                  <CommandItem
                    onSelect={() => {
                      onSelect(undefined);
                      setOpen(false);
                    }}
                    className="py-3 text-muted-foreground"
                  >
                    Rensa val
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
