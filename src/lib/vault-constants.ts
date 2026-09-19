export const ENVIRONMENTS = ["development", "staging", "production", "testing"] as const;

export const CREDENTIAL_TYPES = [
  { value: "api_key", label: "API Key" },
  { value: "bearer_token", label: "Bearer Token" },
  { value: "access_token", label: "Access Token" },
  { value: "bot_token", label: "Bot Token" },
  { value: "oauth", label: "OAuth Credential" },
  { value: "secret", label: "Secret" },
  { value: "custom", label: "Custom" },
] as const;

export const KEY_STATUSES = ["active", "disabled", "revoked"] as const;

export const STRATEGIES = ["random", "round_robin", "least_used", "first_available"] as const;

export const TOKEN_PERMISSIONS = [
  "keys.read",
  "keys.list",
  "keys.random",
  "keys.reveal",
  "collections.read",
  "providers.read",
  "usage.read",
  "audit.read",
] as const;

export const DEFAULT_ACTORS = [
  "ai-worker",
  "github-bot",
  "backend",
  "automation",
  "personal",
  "development",
  "production",
  "scraper",
  "discord-bot",
  "telegram-bot",
];

export const DEFAULT_COLLECTIONS = [
  "AI Services",
  "Coding",
  "GitHub",
  "Cloud",
  "Automation",
  "Production",
  "Development",
];

export type EffectiveStatus = "active" | "expiring" | "expired" | "disabled" | "revoked";

export function effectiveStatus(row: {
  status: string;
  expires_at: string | null;
}): EffectiveStatus {
  if (row.status === "revoked") return "revoked";
  if (row.status === "disabled") return "disabled";
  if (row.expires_at) {
    const ts = new Date(row.expires_at).getTime();
    const now = Date.now();
    if (ts < now) return "expired";
    if (ts - now < 14 * 24 * 3600 * 1000) return "expiring";
  }
  return "active";
}

export function maskSecret(hint: string | null | undefined): string {
  if (!hint) return "••••••••••••";
  return `${hint.split("…")[0] ?? ""}••••••••${hint.includes("…") ? hint.split("…")[1] : ""}`;
}
