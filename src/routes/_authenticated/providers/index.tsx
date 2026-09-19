import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { getProvidersPageFn, deleteProviderFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers/")({
  head: () => ({
    meta: [
      { title: "Providers · KeyVault" },
      { name: "description", content: "Katalog integrasi API & cloud." },
    ],
  }),
  component: ProvidersPage,
});

const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "ai", label: "AI" },
  { id: "coding", label: "Coding" },
  { id: "cloud", label: "Cloud" },
  { id: "developer", label: "Developer" },
  { id: "automation", label: "Automation" },
] as const;

type ProviderItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  credential_type: string;
  website_url: string | null;
  docs_url: string | null;
  description: string | null;
  icon_url: string | null;
  key_count: number;
};

function ProvidersPage() {
  const qc = useQueryClient();
  const fetchProviders = useServerFn(getProvidersPageFn);
  const deleteProvider = useServerFn(deleteProviderFn);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-providers-catalog"],
    queryFn: () => fetchProviders(),
  });

  const providers = (data?.providers ?? []) as ProviderItem[];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (category !== "all" && p.category.toLowerCase() !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [providers, query, category]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus provider ${name}?`)) return;
    try {
      setBusyId(id);
      await deleteProvider({ data: { id } });
      toast.success("Provider dihapus");
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
            <Badge variant="secondary" className="font-mono text-xs font-semibold">
              {providers.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Katalog integrasi dan provider AI & cloud.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5 text-xs font-medium active:scale-[0.98]">
            <Link to="/providers/new">
              <Plus className="size-3.5" />
              Tambah
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari provider"
            className="h-9 pl-8 text-xs font-normal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
                category === c.id
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">Provider tidak ditemukan</p>
          <p className="mt-1 text-xs text-muted-foreground">Coba ubah kata kunci atau kategori pencarian.</p>
          <Button asChild size="sm" className="mt-4 h-8 text-xs">
            <Link to="/providers/new">Tambah Provider</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <Link
                to="/providers/$slug"
                params={{ slug: item.slug }}
                className="space-y-3 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ProviderIcon
                      name={item.name}
                      slug={item.slug}
                      iconUrl={item.icon_url}
                      className="size-9 rounded-lg"
                    />
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {item.name}
                      </h2>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {item.slug}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    {item.category}
                  </Badge>
                </div>

                {item.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </Link>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <Link
                  to="/providers/$slug"
                  params={{ slug: item.slug }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  <span
                    className={`size-2 rounded-full ${
                      item.key_count > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.key_count} {item.key_count === 1 ? "kunci" : "kunci"}
                  </span>
                </Link>

                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Link to="/providers/$slug" params={{ slug: item.slug }}>
                      <KeyRound className="size-3 text-primary" />
                      Connections
                    </Link>
                  </Button>

                  {item.docs_url && (
                    <a
                      href={item.docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Dokumentasi"
                    >
                      <BookOpen className="size-3.5" />
                    </a>
                  )}

                  {item.website_url && (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Website"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={busyId === item.id}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Hapus"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
