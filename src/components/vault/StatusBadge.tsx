import { cn } from "@/lib/utils";
import { effectiveStatus, type EffectiveStatus } from "@/lib/vault-constants";

const styles: Record<EffectiveStatus, string> = {
  active: "bg-success/12 text-success border-success/25",
  expiring: "bg-warning/15 text-warning-foreground border-warning/40",
  expired: "bg-destructive/10 text-destructive border-destructive/25",
  disabled: "bg-muted text-muted-foreground border-border",
  revoked: "bg-destructive/10 text-destructive border-destructive/25",
};

const labels: Record<EffectiveStatus, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  disabled: "Disabled",
  revoked: "Revoked",
};

export function StatusBadge({
  row,
  className,
}: {
  row: { status: string; expires_at: string | null };
  className?: string;
}) {
  const status = effectiveStatus(row);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

export function TestBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    status === "connected"
      ? "text-success"
      : status === "unsupported"
        ? "text-muted-foreground"
        : status === "rate_limited" || status === "timeout"
          ? "text-warning-foreground"
          : "text-destructive";
  return <span className={cn("text-xs capitalize", tone)}>{status.replace("_", " ")}</span>;
}
