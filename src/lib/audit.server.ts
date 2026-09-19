import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: Record<string, unknown>;
};

const FORBIDDEN_KEYS = ["secret", "secret_value", "plaintext", "token", "password"];

/** Strips anything that could carry a plaintext credential before persisting. */
function sanitize(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.some((f) => k.toLowerCase().includes(f))) continue;
    out[k] = v;
  }
  return out;
}

export async function logAudit(input: AuditInput): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_name: input.entityName ?? null,
    metadata: sanitize(input.metadata),
  });
  if (error) console.error("[audit] failed to write audit log", error.message);
}

export type UsageInput = {
  userId: string;
  tokenId?: string | null;
  tokenName?: string | null;
  endpoint: string;
  method?: string;
  providerSlug?: string | null;
  keyId?: string | null;
  keyName?: string | null;
  strategy?: string | null;
  statusCode: number;
  latencyMs?: number | null;
};

export async function logUsage(input: UsageInput): Promise<void> {
  const { error } = await supabaseAdmin.from("api_usage_logs").insert({
    user_id: input.userId,
    token_id: input.tokenId ?? null,
    token_name: input.tokenName ?? null,
    endpoint: input.endpoint,
    method: input.method ?? "GET",
    provider_slug: input.providerSlug ?? null,
    key_id: input.keyId ?? null,
    key_name: input.keyName ?? null,
    strategy: input.strategy ?? null,
    status_code: input.statusCode,
    latency_ms: input.latencyMs ?? null,
  });
  if (error) console.error("[usage] failed to write usage log", error.message);
}
