import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Filter,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivityPageFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity · KeyVault" },
      { name: "description", content: "Audit events and API usage telemetry." },
    ],
  }),
  component: ActivityPage,
});

type AuditItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type UsageItem = {
  id: string;
  token_name: string | null;
  endpoint: string;
  method: string;
  provider_slug: string | null;
  status_code: number;
  latency_ms: number | null;
  created_at: string;
};

function ActivityPage() {
  const fetchActivity = useServerFn(getActivityPageFn);
  const [tab, setTab] = useState<"all" | "audits" | "traffic">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-activity"],
    queryFn: () => fetchActivity(),
  });

  const audits = (data?.audits ?? []) as AuditItem[];
  const usage = (data?.usage ?? []) as UsageItem[];

  const filteredAudits = audits.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      (a.entity_name && a.entity_name.toLowerCase().includes(q)) ||
      a.entity_type.toLowerCase().includes(q)
    );
  });

  const filteredUsage = usage.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.endpoint.toLowerCase().includes(q) ||
      (u.provider_slug && u.provider_slug.toLowerCase().includes(q)) ||
      (u.token_name && u.token_name.toLowerCase().includes(q)) ||
      u.method.toLowerCase().includes(q)
    );
  });

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Audit events and API telemetry</p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-border bg-muted/40 p-1">
          <button
            onClick={() => setTab("all")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTab("audits")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === "audits" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Audits ({audits.length})
          </button>
          <button
            onClick={() => setTab("traffic")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === "traffic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Traffic ({usage.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(tab === "all" || tab === "audits") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight">Audit Logs</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {filteredAudits.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No records
                    </div>
                  ) : (
                    filteredAudits.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                            {item.action}
                          </Badge>
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {item.entity_name || item.entity_type}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.entity_type})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>{formatTime(item.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {(tab === "all" || tab === "traffic") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight">API Traffic</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {filteredUsage.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No traffic
                    </div>
                  ) : (
                    filteredUsage.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-muted/30">
                        <div className="flex items-center gap-2.5">
                          <Badge
                            className={`font-mono text-[10px] ${
                              item.status_code < 300
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            }`}
                            variant="outline"
                          >
                            {item.status_code}
                          </Badge>
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {item.method}
                          </span>
                          <span className="font-mono text-xs font-medium text-foreground">
                            {item.endpoint}
                          </span>
                          {item.provider_slug && (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.provider_slug}
                            </Badge>
                          )}
                          {item.token_name && (
                            <span className="text-xs text-muted-foreground">
                              via {item.token_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {item.latency_ms != null && (
                            <span>{item.latency_ms}ms</span>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{formatTime(item.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
