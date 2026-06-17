import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CatalogToken } from "@/lib/token-catalog";

const MAX_RENDER = 60;

interface TokenPickerProps {
  tokens: CatalogToken[];
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  testIdPrefix: string;
}

export function TokenPicker({ tokens, value, onChange, placeholder = "Token", testIdPrefix }: TokenPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = tokens.find((t) => t.address.toLowerCase() === value.toLowerCase());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? tokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q),
        )
      : tokens;
    return list.slice(0, MAX_RENDER);
  }, [tokens, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between font-normal"
          data-testid={`select-${testIdPrefix}`}
        >
          <span className="flex items-center gap-1.5 truncate">
            {selected ? (
              <>
                <span className="font-medium">{selected.symbol}</span>
                {selected.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name or address…"
            value={search}
            onValueChange={setSearch}
            data-testid={`input-search-${testIdPrefix}`}
          />
          <CommandList>
            <CommandEmpty>No tokens found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((t) => (
                <CommandItem
                  key={`${t.chainId}-${t.address}`}
                  value={t.address}
                  onSelect={() => {
                    onChange(t.address);
                    setOpen(false);
                    setSearch("");
                  }}
                  data-testid={`option-${testIdPrefix}-${t.symbol}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 truncate">
                    {t.logoURI ? (
                      <img src={t.logoURI} alt="" className="h-5 w-5 rounded-full flex-shrink-0" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-muted flex-shrink-0" />
                    )}
                    <span className="truncate">
                      <span className="font-medium">{t.symbol}</span>
                      <span className="text-muted-foreground"> — {t.name}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {t.verified && (
                      <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                    {t.address.toLowerCase() === value.toLowerCase() && <Check className="h-4 w-4 text-primary" />}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
