import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Plug, ExternalLink, BookOpen, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { getProvidersPageFn, deleteProviderFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers")({
  head: () => ({
    meta: [{ title: "Providers · KeyVault" }],
  }),
  component: ProvidersPage,
});

const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "coding", label: "Coding" },
  { id: "ai", label: "AI" },
  { id: "cloud", label: "Cloud" },
  { id: "developer", label: "Developer" },
  { id: "automation", label: "Automation" },
];

function ProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  function loadProviders() {
    getProvidersPageFn({ data: { q: query, category } })
      .then((res) => setProviders(res.providers || []))
      .catch((err) => toast.error(err.message || "Gagal memuat"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProviders();
  }, [category]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadProviders();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus provider ${name}?`)) return;
    try {
      await deleteProviderFn({ data: { id } });
      toast.success("Dihapus!");
      loadProviders();
    } catch (err) {
      toast.error((err as Error).message || "Gagal menghapus");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="text-xs text-muted-foreground">Katalog integrasi dan provider AI & cloud.</p>
        </div>

        <Button asChild>
          <Link to="/providers/new">
            <Plus className="size-4" />
            Tambah
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : providers.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Plug className="size-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">Belum ada data</p>
          <Button size="sm" className="mt-4" asChild>
            <Link to="/providers/new">
              <Plus className="size-4" />
              Tambah
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border bg-card p-4 shadow-sm flex flex-col justify-between space-y-4 transition-colors hover:border-primary/50"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <ProviderIcon slug={p.slug} name={p.name} iconUrl={p.icon_url} size="md" />
                    <div>
                      <h2 className="text-sm font-semibold leading-none">{p.name}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{p.slug}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {p.category}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{p.key_count || 0} kunci</span>

                <div className="flex items-center gap-1">
                  {p.website_url && (
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <a href={p.website_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  {p.docs_url && (
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <a href={p.docs_url} target="_blank" rel="noreferrer">
                        <BookOpen className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  {p.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
