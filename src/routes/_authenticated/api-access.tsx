import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Terminal, Key, ShieldAlert, Trash2, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiAccessPageFn, revokeApiTokenFn, deleteApiTokenFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/api-access")({
  head: () => ({
    meta: [{ title: "API Access · KeyVault" }],
  }),
  component: ApiAccessPage,
});

function ApiAccessPage() {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<any[]>([]);
  const [recentUsage, setRecentUsage] = useState<any[]>([]);

  function loadTokens() {
    getApiAccessPageFn()
      .then((res) => {
        setTokens(res.tokens || []);
        setRecentUsage(res.recentUsage || []);
      })
      .catch((err) => toast.error(err.message || "Gagal memuat"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTokens();
  }, []);

  async function handleRevoke(id: string) {
    if (!window.confirm("Cabut token ini?")) return;
    try {
      await revokeApiTokenFn({ data: { id } });
      toast.success("Dicabut!");
      loadTokens();
    } catch (err) {
      toast.error((err as Error).message || "Gagal mencabut");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus token ini?")) return;
    try {
      await deleteApiTokenFn({ data: { id } });
      toast.success("Dihapus!");
      loadTokens();
    } catch (err) {
      toast.error((err as Error).message || "Gagal menghapus");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Access</h1>
          <p className="text-xs text-muted-foreground">Kelola bearer token untuk agen dan integrasi luar.</p>
        </div>

        <Button asChild>
          <Link to="/api-access/new">
            <Plus className="size-4" />
            Tambah
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Key className="size-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">Belum ada token</p>
          <Button size="sm" className="mt-4" asChild>
            <Link to="/api-access/new">
              <Plus className="size-4" />
              Tambah
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">{t.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        {t.token_prefix}••••••••••••
                      </p>
                    </div>
                    <Badge variant={t.revoked_at ? "destructive" : "default"}>
                      {t.revoked_at ? "Revoked" : "Active"}
                    </Badge>
                  </div>

                  {t.description && (
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {t.permissions?.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>Maks {t.rate_limit_per_hour}/jam</span>

                  <div className="flex items-center gap-1">
                    {!t.revoked_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => handleRevoke(t.id)}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recentUsage.length > 0 && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold">Panggilan Terakhir</h2>
              <div className="divide-y text-xs">
                {recentUsage.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {u.method}
                      </Badge>
                      <span className="font-mono text-muted-foreground">{u.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{u.latency_ms} ms</span>
                      <Badge variant={u.status_code === 200 ? "default" : "destructive"}>
                        {u.status_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
