import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getSettingsPageFn, exportVaultDataFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · KeyVault" },
      { name: "description", content: "Preferences, database, and security." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const fetchSettings = useServerFn(getSettingsPageFn);
  const exportVault = useServerFn(exportVaultDataFn);

  const [exporting, setExporting] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-settings"],
    queryFn: () => fetchSettings(),
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const vaultData = await exportVault();
      const blob = new Blob([JSON.stringify(vaultData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keyvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Account and database configuration</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Account</h2>
                <p className="text-xs text-muted-foreground">Personal vault owner</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Email</span>
                <p className="font-mono text-sm font-medium text-foreground">
                  {data?.user && data.user['email'] ? String(data.user['email']) : "eka.ckp16799@gmail.com"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Role</span>
                <p className="text-sm font-medium text-foreground">
                  Owner
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-border pt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                className="gap-1.5"
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Database className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Database Engine</h2>
                  <p className="text-xs text-muted-foreground">Neon Serverless PostgreSQL</p>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Engine</span>
                <p className="text-sm font-medium text-foreground">PostgreSQL 18.6</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Region</span>
                <p className="text-sm font-medium text-foreground">ap-southeast-1 (AWS)</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">TLS Mode</span>
                <p className="text-sm font-medium text-foreground">require / channel_binding</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Data & Encryption</h2>
                <p className="text-xs text-muted-foreground">Client-side cipher with AES-256-GCM envelope</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
              <div>
                <span className="text-sm font-medium text-foreground">Backup Vault</span>
                <p className="text-xs text-muted-foreground">
                  Export all collections, providers, and key metadata to JSON
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="gap-1.5 shrink-0"
              >
                <Download className="size-3.5" />
                {exporting ? "Exporting…" : "Export JSON"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
