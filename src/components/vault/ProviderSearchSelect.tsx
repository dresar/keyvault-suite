import { useMemo, useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProviderIcon } from "./ProviderIcon";
import { cn } from "@/lib/utils";

type ProviderOption = {
  id: string;
  name: string;
  slug: string;
  category?: string | undefined;
  icon_url?: string | null | undefined;
};

export function ProviderSearchSelect({
  providers,
  value,
  onChange,
  placeholder = "Pilih",
}: {
  providers: ProviderOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => providers.find((p) => p.id === value),
    [providers, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [providers, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xs transition-colors hover:border-ring/60 focus:outline-none focus:ring-1 focus:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              <ProviderIcon
                name={selected.name}
                slug={selected.slug}
                iconUrl={selected.icon_url ?? null}
                size="sm"
                className="size-6 rounded"
              />
              <span className="font-semibold text-foreground truncate">
                {selected.name}
              </span>
              {selected.category && (
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  {selected.category}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl">
          <div className="relative mb-1.5 px-1 pt-1">
            <Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-ring"
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 px-1 py-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Tidak ada
              </p>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProviderIcon
                        name={item.name}
                        slug={item.slug}
                        iconUrl={item.icon_url ?? null}
                        size="sm"
                        className="size-6 rounded"
                      />
                      <span className="truncate font-medium">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.category && (
                        <Badge variant="outline" className="font-mono text-[9px] uppercase">
                          {item.category}
                        </Badge>
                      )}
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
