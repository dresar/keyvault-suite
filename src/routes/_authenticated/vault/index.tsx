import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  FolderPlus,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { StatusBadge } from "@/components/vault/StatusBadge";
import {
  getKeysListFn,
  bulkKeyActionFn,
} from "@/lib/neon-vault.functions";

type VaultSearch = { collection?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/_authenticated/vault/")({
  validateSearch: (search: Record<string, unknown>): VaultSearch => ({
    collection: typeof search['collection'] === "string" ? search['collection'] : undefined,
    q: typeof search['q'] === "string" ? search['q'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vault · KeyVault" },
      { name: "description", content: "Browse and manage API credentials." },
    ],
  }),
  component: VaultPage,
});

type KeyItem = {
  id: string;
  name: string;
  environment: string;
  status: string;
  tags: string[] | null;
  usage_count: number;
  last_used_at: string | null;
  secret_hint: string;
  version: number;
  created_at: string;
  provider_id: string;
  provider_name: string;
  provider_slug: string;
  icon_url: string | null;
  collection_id: string | null;
  collection_name: string | null;
  collection_color: string | null;
};

const PAGE_SIZE = 20;

function VaultPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchKeys = useServerFn(getKeysListFn);
  const runBulk = useServerFn(bulkKeyActionFn);

  const [query, setQuery] = useState(search.q ?? "");
  const [provider, setProvider] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState(search.collection ?? "all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: vaultData, isLoading: loadingKeys, refetch } = useQuery({
    queryKey: ["neon-keys"],
    queryFn: () => fetchKeys(),
  });

  const keysList = (vaultData?.keys ?? []) as KeyItem[];
  const providers = (vaultData?.providers ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  const collections = (vaultData?.collections ?? []) as Array<{
    id: string;
    name: string;
    color: string | null;
  }>;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return keysList.filter((row) => {
      if (provider !== "all" && row.provider_slug !== provider) return false;
      if (environment !== "all" && row.environment !== environment) return false;
      if (collection !== "all" && row.collection_id !== collection) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return [
        row.name,
        row.provider_name || "",
        row.provider_slug || "",
        row.secret_hint || "",
        ...(row.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [keysList, query, provider, environment, collection, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allChecked = current.length > 0 && current.every((r) => selected.includes(r.id));

  const handleBulk = async (action: "enable" | "disable" | "delete") => {
    if (selected.length === 0) return;
    try {
      setBusy(true);
      const res = await runBulk({ data: { ids: selected, action } });
      toast.success(`${res.affected} updated`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-activity"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const hasFilters =
    query || provider !== "all" || environment !== "all" || status !== "all" || collection !== "all";

  const clearFilters = () => {
    setQuery("");
    setProvider("all");
    setEnvironment("all");
    setStatus("all");
    setCollection("all");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} credentials stored in Neon
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/vault/import" className="gap-1.5">
              <Upload className="size-3.5" />
              Import
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/vault/export" className="gap-1.5">
              <Download className="size-3.5" />
              Export
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/vault/collections/new" className="gap-1.5">
              <FolderPlus className="size-3.5" />
              Collection
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/vault/new" className="gap-1.5">
              <Plus className="size-3.5" />
              New Key
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="pl-8 text-sm"
          />
        </div>

        <Select
          value={provider}
          onValueChange={(v) => {
            setProvider(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] text-xs">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.slug}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={environment}
          onValueChange={(v) => {
            setEnvironment(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] text-xs">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Envs</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>

        {collections.length > 0 && (
          <Select
            value={collection}
            onValueChange={(v) => {
              setCollection(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span>{selected.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulk("enable")}
              disabled={busy}
              className="h-8 text-xs"
            >
              Enable
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulk("disable")}
              disabled={busy}
              className="h-8 text-xs"
            >
              Disable
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulk("delete")}
              disabled={busy}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loadingKeys ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
          <KeyRound className="size-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">No credentials</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFilters ? "Try adjusting your search or filters" : "Get started by adding your first secret key"}
          </p>
          <div className="mt-6 flex gap-2">
            {hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/vault/new">Add Key</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {current.map((row) => {
              const isChecked = selected.includes(row.id);
              return (
                <div
                  key={row.id}
                  className={`flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40 ${
                    isChecked ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelected((prev) =>
                          checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                        );
                      }}
                      aria-label={`Select ${row.name}`}
                    />
                    <ProviderIcon name={row.provider_name} slug={row.provider_slug} className="size-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/vault/$id"
                          params={{ id: row.id }}
                          className="truncate text-sm font-semibold tracking-tight text-foreground hover:underline"
                        >
                          {row.name}
                        </Link>
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                          {row.secret_hint}
                        </Badge>
                        <StatusBadge row={{ status: row.status, expires_at: null }} />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{row.provider_name}</span>
                        <span>•</span>
                        <span className="capitalize">{row.environment}</span>
                        {row.collection_name && (
                          <>
                            <span>•</span>
                            <span>{row.collection_name}</span>
                          </>
                        )}
                        {row.usage_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{row.usage_count} calls</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                      <Link to="/vault/$id" params={{ id: row.id }} className="gap-1">
                        <Pencil className="size-3" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 text-xs"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
