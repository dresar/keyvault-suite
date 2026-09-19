import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  ExternalLink,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import {
  getProviderDetailBySlugFn,
  toggleKeyActiveFn,
  deleteKeyFn,
} from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.toUpperCase()} · KeyVault` },
      { name: "description", content: `Koneksi API ${params.slug}.` },
    ],
  }),
  component: ProviderDetailPage,
});

type KeyItem = {
  id: string;
  name: string;
  environment: string;
  status: string;
  tags: string[];
  usage_count: number;
  last_used_at: string | null;
  secret_hint: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  collection_id: string | null;
  collection_name: string | null;
  collection_color: string | null;
};

function ProviderDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(getProviderDetailBySlugFn);
  const toggleKey = useServerFn(toggleKeyActiveFn);
  const deleteKey = useServerFn(deleteKeyFn);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["neon-provider-detail", slug],
    queryFn: () => fetchDetail({ data: { slug } }),
  });

  const provider = data?.provider;
  const rawKeys = (data?.keys ?? []) as KeyItem[];

  const [envFilter, setEnvFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredKeys = useMemo(() => {
    return rawKeys.filter((k) => {
      if (envFilter !== "all" && k.environment !== envFilter) return false;
      return true;
    });
  }, [rawKeys, envFilter]);

  const totalPages = Math.ceil(filteredKeys.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const pagedKeys = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredKeys.slice(start, start + pageSize);
  }, [filteredKeys, safePage, pageSize]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyHint = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Disalin");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await toggleKey({ data: { id, status: nextStatus } });
      qc.invalidateQueries({ queryKey: ["neon-provider-detail", slug] });
      toast.success(nextStatus === "active" ? "Diaktifkan" : "Dinonaktifkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus ${name}?`)) return;
    try {
      await deleteKey({ data: { id } });
      toast.success("Dihapus");
      qc.invalidateQueries({ queryKey: ["neon-provider-detail", slug] });
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  };

  const getKeyPortalUrl = () => {
    if (slug === "gemini" || slug === "google-gemini") {
      return "https://aistudio.google.com/app/apikey";
    }
    if (slug === "openai" || slug === "openai-codex") {
      return "https://platform.openai.com/api-keys";
    }
    if (slug === "claude" || slug === "claude-code" || slug === "anthropic") {
      return "https://console.anthropic.com/settings/keys";
    }
    if (slug === "deepseek") {
      return "https://platform.deepseek.com/api_keys";
    }
    if (slug === "groq") {
      return "https://console.groq.com/keys";
    }
    if (slug === "cloudflare") {
      return "https://dash.cloudflare.com/profile/api-tokens";
    }
    return provider?.docs_url || provider?.website_url || "https://google.com";
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-base font-semibold">Belum ada data</p>
        <Button asChild size="sm" className="mt-4">
          <Link to="/providers">Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="shrink-0 space-y-3">
        <div>
          <Link
            to="/providers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-all"
          >
            <ArrowLeft className="size-3.5" />
            Kembali
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon
              name={provider.name}
              slug={provider.slug}
              iconUrl={provider.icon_url}
              size="lg"
              className="size-11 sm:size-13 rounded-xl shadow-xs shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {provider.name}
                </h1>
                <a
                  href={getKeyPortalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  <ExternalLink className="size-3" />
                  Portal
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rawKeys.length} koneksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Button asChild size="sm" className="h-8 text-xs gap-1.5 font-semibold active:scale-[0.98]">
              <Link to="/vault/new" search={{ provider: provider.id }}>
                <Plus className="size-3.5" />
                Tambah
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 border-b border-border/70 bg-card">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Koneksi
            </h2>
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4.5">
              {filteredKeys.length}
            </Badge>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-md border border-border/80 bg-muted/30 p-0.5 text-xs w-full sm:w-auto">
            {["all", "production", "staging", "development"].map((env) => (
              <button
                key={env}
                onClick={() => {
                  setEnvFilter(env);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors shrink-0 ${
                  envFilter === env
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {env === "all" ? "Semua" : env}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
          {rawKeys.length === 0 ? (
            <div className="p-8 text-center">
              <KeyRound className="mx-auto size-7 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">Belum ada data</p>
              <Button asChild size="sm" className="mt-3.5 h-8 text-xs font-semibold">
                <Link to="/vault/new" search={{ provider: provider.id }}>
                  <Plus className="size-3.5 mr-1" />
                  Tambah
                </Link>
              </Button>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Belum ada data
            </div>
          ) : (
            pagedKeys.map((item) => {
              const expanded = Boolean(expandedIds[item.id]);
              const isActive = item.status === "active";
              const isCopied = copiedId === item.id;

              return (
                <div key={item.id} className="transition-colors hover:bg-muted/15">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 sm:px-4 py-3">
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-1 mt-0.5 sm:mt-0 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label="Detail"
                      >
                        {expanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>

                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground mt-0.5 sm:mt-0">
                        <KeyRound className="size-3.5" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold tracking-tight text-foreground truncate max-w-[180px] sm:max-w-xs">
                            {item.name}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[10px] font-medium ${
                              isActive
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                              }`}
                            />
                            {isActive ? "active" : "disabled"}
                          </span>

                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono uppercase py-0 h-4.5 ${
                              item.environment === "production"
                                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : item.environment === "staging"
                                  ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                                  : "border-sky-500/30 text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            {item.environment}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <button
                            type="button"
                            onClick={() => handleCopyHint(item.id, item.secret_hint || "")}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            title="Salin"
                          >
                            <span>{item.secret_hint || "sk-••••••••"}</span>
                            {isCopied ? (
                              <Check className="size-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-2.5" />
                            )}
                          </button>
                          <span>•</span>
                          <span className="font-sans">{item.usage_count.toLocaleString()} calls</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 pl-9 sm:pl-0 pt-1 sm:pt-0 border-t border-border/40 sm:border-t-0">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Link to="/vault/$id" params={{ id: item.id }}>
                          <Pencil className="size-3" />
                          Edit
                        </Link>
                      </Button>

                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Hapus"
                      >
                        <Trash2 className="size-3" />
                      </button>

                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggleStatus(item.id, item.status)}
                        aria-label={item.name}
                      />
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-6 sm:px-12 py-2.5 bg-muted/10 border-t border-border/40 grid gap-2 grid-cols-1 sm:grid-cols-3 text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">ID: </span>
                        <span className="font-mono text-[11px]">{item.id.slice(0, 13)}...</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Diperbarui: </span>
                        <span>
                          {new Date(item.updated_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Dibuat: </span>
                        <span>
                          {new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              {filteredKeys.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
              {Math.min(safePage * pageSize, filteredKeys.length)} dari {filteredKeys.length}
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-6 rounded border border-border bg-background px-1 text-[11px] outline-none"
            >
              <option value={5}>5 / hal</option>
              <option value={10}>10 / hal</option>
              <option value={20}>20 / hal</option>
            </select>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            <span className="px-2 font-mono text-[11px]">
              {safePage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-7 px-2 text-xs"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
