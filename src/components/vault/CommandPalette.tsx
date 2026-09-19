import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Download, KeyRound, Plug, Plus, Terminal, Upload } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { collectionsQuery, keysQuery, providersQuery } from "@/lib/queries";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: keys = [] } = useQuery({ ...keysQuery, enabled: open });
  const { data: providers = [] } = useQuery({ ...providersQuery, enabled: open });
  const { data: collections = [] } = useQuery({ ...collectionsQuery, enabled: open });

  function go(to: string, search?: Record<string, string>) {
    onOpenChange(false);
    navigate({ to, search: search as never });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search credentials, providers, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="add key credential" onSelect={() => go("/vault", { action: "new" })}>
            <Plus className="size-4" /> Add credential
          </CommandItem>
          <CommandItem value="import" onSelect={() => go("/vault", { action: "import" })}>
            <Upload className="size-4" /> Import credentials
          </CommandItem>
          <CommandItem value="export" onSelect={() => go("/vault", { action: "export" })}>
            <Download className="size-4" /> Export vault
          </CommandItem>
          <CommandItem value="create api token" onSelect={() => go("/api-access")}>
            <Terminal className="size-4" /> Create API token
          </CommandItem>
        </CommandGroup>

        {keys.length > 0 ? (
          <CommandGroup heading="Credentials">
            {keys.slice(0, 30).map((k) => (
              <CommandItem
                key={k.id}
                value={`${k.name} ${k.actor ?? ""} ${k.tags.join(" ")}`}
                onSelect={() => go(`/vault/${k.id}`)}
              >
                <KeyRound className="size-4" /> {k.name}
                <span className="ml-auto text-xs text-muted-foreground">{k.environment}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Providers">
          {providers.slice(0, 30).map((p) => (
            <CommandItem
              key={p.id}
              value={`provider ${p.name} ${p.slug}`}
              onSelect={() => go(`/providers/${p.slug}`)}
            >
              <Plug className="size-4" /> {p.name}
            </CommandItem>
          ))}
        </CommandGroup>

        {collections.length > 0 ? (
          <CommandGroup heading="Collections">
            {collections.map((c) => (
              <CommandItem
                key={c.id}
                value={`collection ${c.name}`}
                onSelect={() => go("/vault", { collection: c.id })}
              >
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
