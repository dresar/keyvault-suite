import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  KeyRound,
  Loader2,
  Pencil,
  Plug,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/vault/EmptyState";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { StatusBadge, TestBadge } from "@/components/vault/StatusBadge";
import { KeyDrawer } from "@/components/vault/KeyDrawer";
import { ImportDrawer } from "@/components/vault/ImportDrawer";
import { ExportDrawer } from "@/components/vault/ExportDrawer";
import { collectionsQuery, keysQuery, providersQuery, type KeyRow } from "@/lib/queries";
import { ENVIRONMENTS, effectiveStatus } from "@/lib/vault-constants";
import { bulkKeyAction } from "@/lib/vault.functions";

type VaultSearch = { action?: string; collection?: string; q?: string };

export const Route = createFileRoute("/_authenticated/vault/")({
  validateSearch: (search: Record<string, unknown>): VaultSearch => ({
    action: typeof search['action'] === "string" ? search['action'] : undefined,
    collection: typeof search['collection'] === "string" ? search['collection'] : undefined,
    q: typeof search['q'] === "string" ? search['q'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vault · KeyVault" },
      { name: "description", content: "Browse, filter and manage every credential you store." },
      { property: "og:title", content: "Vault · KeyVault" },
      {
        property: "og:description",
        content: "Browse, filter and manage every credential you store.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

const PAGE_SIZE = 20;

function VaultPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bulk = useServerFn(bulkKeyAction);

  const keys = useQuery(keysQuery);
  const { data: providers = [] } = useQuery(providersQuery);
  const { data: collections = [] } = useQuery(collectionsQuery);

  const [query, setQuery] = useState(search.q ?? "");
  const [provider, setProvider] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState(search.collection ?? "all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<KeyRow | null>(null);
  const [keyDrawer, setKeyDrawer] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.action === "new") setKeyDrawer(true);
    if (search.action === "import") setImportOpen(true);
    if (search.action === "export") setExportOpen(true);
    if (search.action) navigate({ to: "/vault", search: {}, replace: true });
  }, [search.action, navigate]);

  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (keys.data ?? []).filter((row) => {
      if (provider !== "all" && row.provider_id !== provider) return false;
      if (environment !== "all" && row.environment !== environment) return false;
      if (collection !== "all" && row.collection_id !== collection) return false;
      if (status !== "all" && effectiveStatus(row) !== status) return false;
      if (!q) return true;
      const p = providerById.get(row.provider_id);
      return [row.name, row.actor ?? "", row.description ?? "", p?.name ?? "", ...row.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [keys.data, query, provider, environment, collection, status, providerById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allChecked = current.length > 0 && current.every((r) => selected.includes(r.id));

  async function runBulk(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await bulk({ data: { ids: selected, action, ...extra } as never });
      toast.success(`${res.affected} credential(s) updated`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const hasFilters =
    query || provider !== "all" || environment !== "all" || status !== "all" || collection !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {keys.data?.length ?? 0} credentials
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="size-4" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setKeyDrawer(true);
            }}
          >
            <Plus className="size-4" /> Add credential
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, actor, tag…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={provider} onValueChange={(v) => { setProvider(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={environment} onValueChange={(v) => { setEnvironment(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Environment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {ENVIRONMENTS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["active", "expiring", "expired", "disabled", "revoked"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {collections.length > 0 ? (
          <Select value={collection} onValueChange={(v) => { setCollection(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Collection" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setProvider("all");
              setEnvironment("all");
              setStatus("all");
              setCollection("all");
              setPage(1);
            }}
          >
            <X className="size-4" /> Clear
          </Button>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runBulk("enable")}>
              Enable
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runBulk("disable")}>
              Disable
            </Button>
            <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
              Export
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" /> Revoke
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {keys.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={KeyRound}
              title={hasFilters ? "No matching credentials" : "Your vault is empty"}
              description={
                hasFilters
                  ? "Adjust or clear the filters to see more results."
                  : "Add a credential manually or import an existing set."
              }
            >
              {hasFilters ? null : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setKeyDrawer(true)}>
                    <Plus className="size-4" /> Add credential
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="size-4" /> Import
                  </Button>
                </div>
              )}
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground md:flex">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(v) =>
                  setSelected(
                    v
                      ? [...new Set([...selected, ...current.map((r) => r.id)])]
                      : selected.filter((id) => !current.some((r) => r.id === id)),
                  )
                }
              />
              <span className="flex-1">Credential</span>
              <span className="w-28">Environment</span>
              <span className="w-24">Secret</span>
              <span className="w-24">Test</span>
              <span className="w-24">Status</span>
              <span className="w-16" />
            </div>
            <ul className="divide-y divide-border">
              {current.map((row) => {
                const p = providerById.get(row.provider_id);
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 md:flex-nowrap"
                  >
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={(v) =>
                        setSelected(
                          v ? [...selected, row.id] : selected.filter((id) => id !== row.id),
                        )
                      }
                    />
                    <Link
                      to="/vault/$id"
                      params={{ id: row.id }}
                      className="flex min-w-0 flex-1 items-center gap-2.5"
                    >
                      <ProviderIcon
                        size="sm"
                        name={p?.name ?? "?"}
                        slug={p?.slug ?? "?"}
                        iconUrl={p?.icon_url}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{row.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p?.name ?? "Unknown"}
                          {row.actor ? ` · ${row.actor}` : ""}
                          {row.tags.length ? ` · ${row.tags.join(", ")}` : ""}
                        </span>
                      </span>
                    </Link>
                    <span className="w-28 text-xs capitalize text-muted-foreground">
                      {row.environment}
                    </span>
                    <span className="w-24 truncate font-mono text-xs text-muted-foreground">
                      {row.secret_hint || "••••"}
                    </span>
                    <span className="w-24">
                      <TestBadge status={row.last_test_status} />
                    </span>
                    <span className="w-24">
                      <StatusBadge row={row} />
                    </span>
                    <span className="w-16 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => {
                          setEditing(row);
                          setKeyDrawer(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {providers.length === 0 && !keys.isLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Plug className="size-3.5" /> Provider catalog is loading or unavailable.
        </p>
      ) : null}

      <KeyDrawer
        open={keyDrawer}
        onOpenChange={(v) => {
          setKeyDrawer(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
      <ImportDrawer open={importOpen} onOpenChange={setImportOpen} />
      <ExportDrawer
        open={exportOpen}
        onOpenChange={setExportOpen}
        selectedIds={selected.length ? selected : undefined}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {selected.length} credential(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              They stop being served through the API immediately and are removed from your vault
              list. The action is recorded in your audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => runBulk("delete")}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
