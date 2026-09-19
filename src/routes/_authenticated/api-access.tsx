import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Ban,
  Clock,
  Key,
  Plus,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApiAccessPageFn,
  revokeApiTokenFn,
  deleteApiTokenFn,
} from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/api-access")({
  head: () => ({
    meta: [
      { title: "API Access · KeyVault" },
      { name: "description", content: "Manage programmatic bearer tokens." },
    ],
  }),
  component: ApiAccessPage,
});

type ApiTokenItem = {
  id: string;
  name: string;
  description: string | null;
  token_prefix: string;
  permissions: string[];
  allowed_environments: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

type UsageLogItem = {
  id: string;
  token_name: string | null;
  endpoint: string;
  method: string;
  provider_slug: string | null;
  status_code: number;
  latency_ms: number | null;
  created_at: string;
};

function ApiAccessPage() {
  const qc = useQueryClient();
  const fetchAccess = useServerFn(getApiAccessPageFn);
  const revokeToken = useServerFn(revokeApiTokenFn);
  const deleteToken = useServerFn(deleteApiTokenFn);

  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-api-access"],
    queryFn: () => fetchAccess(),
  });

  const tokens = (data?.tokens ?? []) as ApiTokenItem[];
  const recentUsage = (data?.recentUsage ?? []) as UsageLogItem[];

  const handleRevoke = async (id: string, name: string) => {
    if (!window.confirm(`Cabut akses token ${name}?`)) return;
    setBusyId(id);
    try {
      await revokeToken({ data: { id } });
      toast.success("Token dicabut");
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencabut token");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus permanen token ${name}?`)) return;
    setBusyId(id);
    try {
      await deleteToken({ data: { id } });
      toast.success("Token dihapus");
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">API Access</h1>
            <Badge variant="secondary" className="font-mono text-xs font-semibold">
              {tokens.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bearer token untuk integrasi programmatic agen dan sistem eksternal.
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
            <Link to="/api-access/new">
              <Plus className="size-3.5" />
              Token Baru
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Daftar API Token</h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">Belum ada API Token</p>
            <p className="mt-1 text-xs text-muted-foreground">Buat token bearer pertama Anda untuk mengakses vault via REST API.</p>
            <Button asChild size="sm" className="mt-4 h-8 text-xs">
              <Link to="/api-access/new">Buat Token</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tokens.map((t) => {
              const isRevoked = Boolean(t.revoked_at);
              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all ${
                    isRevoked
                      ? "border-destructive/30 bg-card/60 opacity-80"
                      : "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold tracking-tight text-foreground">{t.name}</h3>
                          {isRevoked ? (
                            <Badge variant="destructive" className="font-mono text-[9px] uppercase">
                              Dicabut
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[9px]">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          {t.token_prefix}••••••••
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevoke(t.id, t.name)}
                            disabled={busyId === t.id}
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            aria-label="Cabut token"
                          >
                            <Ban className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={busyId === t.id}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Hapus token"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {t.description && (
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {(t.permissions || []).map((perm) => (
                        <Badge key={perm} variant="secondary" className="font-mono text-[10px]">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Limit: {t.rate_limit_per_hour} req/jam</span>
                    <span>
                      {new Date(t.created_at).toLocaleDateString("id-ID", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Riwayat Penggunaan API</h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentUsage.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Belum ada log traffic request
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentUsage.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Badge
                      className={`font-mono text-[10px] ${
                        log.status_code < 300
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      }`}
                      variant="outline"
                    >
                      {log.status_code}
                    </Badge>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {log.method}
                    </span>
                    <span className="font-mono text-xs font-medium text-foreground">
                      {log.endpoint}
                    </span>
                    {log.provider_slug && (
                      <Badge variant="secondary" className="text-[10px]">
                        {log.provider_slug}
                      </Badge>
                    )}
                    {log.token_name && (
                      <span className="text-xs text-muted-foreground">
                        via {log.token_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {log.latency_ms != null && <span>{log.latency_ms}ms</span>}
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
