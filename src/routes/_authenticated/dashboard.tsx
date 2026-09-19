import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Plug,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auditQuery, keysQuery, providersQuery, usageQuery } from "@/lib/queries";
import { effectiveStatus } from "@/lib/vault-constants";
import { StatusBadge } from "@/components/vault/StatusBadge";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { EmptyState } from "@/components/vault/EmptyState";
import { KeyDrawer } from "@/components/vault/KeyDrawer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · KeyVault" },
      { name: "description", content: "Overview of your stored credentials, providers and usage." },
      { property: "og:title", content: "Dashboard · KeyVault" },
      {
        property: "og:description",
        content: "Overview of your stored credentials, providers and usage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function relative(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Dashboard() {
  const keys = useQuery(keysQuery);
  const providers = useQuery(providersQuery);
  const audit = useQuery(auditQuery);
  const usage = useQuery(usageQuery);
  const [drawer, setDrawer] = useState(false);

  const rows = keys.data ?? [];
  const providerById = useMemo(
    () => new Map((providers.data ?? []).map((p) => [p.id, p])),
    [providers.data],
  );

  const stats = useMemo(() => {
    const active = rows.filter((r) => effectiveStatus(r) === "active").length;
    const attention = rows.filter((r) =>
      ["expiring", "expired"].includes(effectiveStatus(r)),
    ).length;
    const usedProviders = new Set(rows.map((r) => r.provider_id)).size;
    const calls24h = (usage.data ?? []).filter(
      (u) => Date.now() - new Date(u.created_at as string).getTime() < 86_400_000,
    ).length;
    return { total: rows.length, active, attention, usedProviders, calls24h };
  }, [rows, usage.data]);

  const byProvider = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.provider_id, (map.get(r.provider_id) ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({ provider: providerById.get(id), count }));
  }, [rows, providerById]);

  const attentionRows = rows
    .filter((r) => ["expiring", "expired", "disabled"].includes(effectiveStatus(r)))
    .slice(0, 5);

  const loading = keys.isLoading || providers.isLoading;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Everything stored in your vault, at a glance.
          </p>
        </div>
        <Button onClick={() => setDrawer(true)}>
          <Plus className="size-4" /> Add credential
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Credentials", value: stats.total, icon: KeyRound },
          { label: "Active", value: stats.active, icon: ShieldCheck },
          { label: "Providers in use", value: stats.usedProviders, icon: Plug },
          { label: "API calls (24h)", value: stats.calls24h, icon: ActivityIcon },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <card.icon className="size-4 text-muted-foreground" />
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {stats.attention > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 text-warning-foreground" />
          <div className="text-sm">
            <p className="font-medium">
              {stats.attention} credential{stats.attention > 1 ? "s" : ""} need attention
            </p>
            <p className="text-muted-foreground">Expired or expiring within 14 days.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent credentials</h2>
            <Link to="/vault" className="text-xs text-muted-foreground hover:text-foreground">
              View vault <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={KeyRound}
                title="No credentials yet"
                description="Add your first API key to start organizing your vault."
              >
                <Button size="sm" onClick={() => setDrawer(true)}>
                  <Plus className="size-4" /> Add credential
                </Button>
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.slice(0, 6).map((row) => {
                const provider = providerById.get(row.provider_id);
                return (
                  <li key={row.id}>
                    <Link
                      to="/vault/$id"
                      params={{ id: row.id }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60"
                    >
                      <ProviderIcon
                        size="sm"
                        name={provider?.name ?? "?"}
                        slug={provider?.slug ?? "?"}
                        iconUrl={provider?.icon_url}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {provider?.name ?? "Unknown"} · {row.environment}
                          {row.actor ? ` · ${row.actor}` : ""}
                        </p>
                      </div>
                      <StatusBadge row={row} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Providers</h2>
            </div>
            {byProvider.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">No provider in use yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {byProvider.map(({ provider, count }) => (
                  <li key={provider?.id ?? count} className="flex items-center gap-2.5 px-4 py-2.5">
                    <ProviderIcon
                      size="sm"
                      name={provider?.name ?? "?"}
                      slug={provider?.slug ?? "?"}
                      iconUrl={provider?.icon_url}
                    />
                    <span className="flex-1 truncate text-sm">{provider?.name ?? "Unknown"}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Needs attention</h2>
            </div>
            {attentionRows.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">Nothing to review.</p>
            ) : (
              <ul className="divide-y divide-border">
                {attentionRows.map((row) => (
                  <li key={row.id} className="flex items-center gap-2 px-4 py-2.5">
                    <Link
                      to="/vault/$id"
                      params={{ id: row.id }}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {row.name}
                    </Link>
                    <StatusBadge row={row} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link to="/activity" className="text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="inline size-3" />
          </Link>
        </div>
        {(audit.data ?? []).length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(audit.data ?? []).slice(0, 6).map((entry) => (
              <li key={entry.id as string} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {entry.action as string}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {(entry.entity_name as string) ?? (entry.entity_type as string)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relative(entry.created_at as string)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <KeyDrawer open={drawer} onOpenChange={setDrawer} />
    </div>
  );
}
