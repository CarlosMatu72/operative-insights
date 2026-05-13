import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReferencePrefixes } from "@/hooks/useCatalogs";

interface Props {
  selectedPrefix: string;
  referenceSuffix: string;
  onPrefixChange: (prefix: string, branchId: string) => void;
  onSuffixChange: (suffix: string) => void;
  label?: string;
}

export function PrefixReferenceInput({
  selectedPrefix,
  referenceSuffix,
  onPrefixChange,
  onSuffixChange,
  label = "Referencia *",
}: Props) {
  const { data: prefixes = [] } = useReferencePrefixes();
  const [open, setOpen] = useState(false);
  const fullReference = selectedPrefix ? `${selectedPrefix}${referenceSuffix}` : referenceSuffix;
  const suffixInvalid = referenceSuffix.length > 0 && referenceSuffix.length !== 7;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="h-9 w-[180px] justify-between"
            >
              <span className="truncate">{selectedPrefix || "Prefijo..."}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar prefijo..." />
              <CommandList>
                <CommandEmpty>Sin prefijos configurados</CommandEmpty>
                <CommandGroup>
                  {prefixes.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.prefix} ${p.branches?.nombre ?? ""}`}
                      onSelect={() => {
                        onPrefixChange(p.prefix, p.branch_id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedPrefix === p.prefix ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span className="font-medium">{p.prefix}</span>
                        {p.branches?.nombre && (
                          <span className="text-xs text-muted-foreground">{p.branches.nombre}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Input
          value={referenceSuffix}
          onChange={(e) => onSuffixChange(e.target.value.slice(0, 7))}
          placeholder="7 caracteres"
          maxLength={7}
          className={cn(
            "h-9 flex-1 font-mono",
            suffixInvalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
      </div>
      <div className="flex items-center justify-between">
        {fullReference ? (
          <p className="text-xs text-muted-foreground">
            Referencia: <span className="font-medium text-foreground">{fullReference}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecciona un prefijo y escribe exactamente 7 caracteres
          </p>
        )}
        {referenceSuffix.length > 0 && (
          <span className={cn("text-xs", suffixInvalid ? "text-destructive" : "text-muted-foreground")}>
            {referenceSuffix.length}/7
          </span>
        )}
      </div>
    </div>
  );
}
