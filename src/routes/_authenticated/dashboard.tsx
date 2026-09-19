import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRight,
  FolderTree,
  KeyRound,
  Layers,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { StatusBadge } from "@/components/vault/StatusBadge";
import { getDashboardStatsFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · KeyVault" },
      { name: "description", content: "Overview of credentials, providers, and usage." },
    ],
  }),
  component: DashboardPage,
});

type RecentKey = {
  id: string;
  name: string;
  environment: string;
  status: string;
  usage_count: number;
  last_used_at: string | null;
  secret_hint: string;
  provider_name: string;
  provider_slug: string;
  icon_url: string | null;
  collection_name: string | null;
};

type ProviderItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon_url: string | null;
  key_count: number;
};

type AuditItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
};

function formatAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  } catch {
    return "";
  }
}

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStatsFn);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-dashboard"],
    queryFn: () => fetchStats(),
  });

  const counts = data?.counts ?? { keys: 0, providers: 0, collections: 0, tokens: 0, usage: 0 };
  const recentKeys = (data?.recentKeys ?? []) as RecentKey[];
  const providers = (data?.providers ?? []) as ProviderItem[];
  const recentAudits = (data?.recentAudits ?? []) as AuditItem[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Credentials and infrastructure metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button asChild size="sm">
            <Link to="/vault/new" className="gap-1.5">
              <Plus className="size-3.5" />
              New Key
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Keys</span>
            <KeyRound className="size-4 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-14" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{counts.keys}</span>
              <span className="text-xs text-muted-foreground">stored</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Providers</span>
            <Plug className="size-4 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-14" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{counts.providers}</span>
              <span className="text-xs text-muted-foreground">active</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Collections</span>
            <FolderTree className="size-4 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-14" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{counts.collections}</span>
              <span className="text-xs text-muted-foreground">groups</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">API Requests</span>
            <Activity className="size-4 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-14" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{counts.usage}</span>
              <span className="text-xs text-muted-foreground">proxied</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">Recent Keys</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Link to="/vault">
                View all
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-5 w-48" />
                  </div>
                ))
              ) : recentKeys.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No credentials
                </div>
              ) : (
                recentKeys.map((key) => (
                  <Link
                    key={key.id}
                    to="/vault/$id"
                    params={{ id: key.id }}
                    className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProviderIcon name={key.provider_name} slug={key.provider_slug} className="size-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                            {key.name}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                            {key.secret_hint}
                          </Badge>
                          <StatusBadge row={{ status: key.status, expires_at: null }} />
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{key.provider_name}</span>
                          <span>•</span>
                          <span className="capitalize">{key.environment}</span>
                          {key.collection_name && (
                            <>
                              <span>•</span>
                              <span>{key.collection_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="size-4 text-primary" />
                <h2 className="text-base font-semibold tracking-tight">Active Providers</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Link to="/providers">
                  View all
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : (
                providers.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    to="/providers"
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <ProviderIcon name={p.name} slug={p.slug} className="size-6" />
                      <div>
                        <div className="text-sm font-semibold tracking-tight">{p.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{p.category}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {p.key_count} keys
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">Recent Activity</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Link to="/activity">
                View all
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3.5">
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))
              ) : recentAudits.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No activity
                </div>
              ) : (
                recentAudits.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase">
                        {item.action}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatAgo(item.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-medium text-foreground">
                      {item.entity_name || item.entity_type}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs">
                <Link to="/vault/new">
                  <Plus className="size-3.5 text-primary" />
                  Add Secret Key
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs">
                <Link to="/providers/new">
                  <Plus className="size-3.5 text-primary" />
                  Add Custom Provider
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs">
                <Link to="/api-access/new">
                  <Plus className="size-3.5 text-primary" />
                  Generate API Token
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs">
                <Link to="/vault/collections/new">
                  <Plus className="size-3.5 text-primary" />
                  Create Collection
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
