import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret } from "./crypto.server";

export type Strategy = "random" | "round_robin" | "least_used" | "first_available";

export type ResolveInput = {
  userId: string;
  provider?: string | null;
  actor?: string | null;
  environment?: string | null;
  collection?: string | null;
  tag?: string | null;
  strategy?: Strategy;
  includeSecret: boolean;
};

export type ResolvedCredential = {
  id: string;
  name: string;
  provider: string;
  actor: string | null;
  environment: string;
  credential_type: string;
  collection: string | null;
  tags: string[];
  secret_hint: string;
  secret?: string;
  strategy: Strategy;
};

export class SelectionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type KeyRow = {
  id: string;
  name: string;
  actor: string | null;
  environment: string;
  credential_type: string;
  tags: string[];
  status: string;
  expires_at: string | null;
  usage_count: number;
  secret_ciphertext: string;
  secret_hint: string;
  provider_id: string;
  collection_id: string | null;
  created_at: string;
};

export async function resolveCredential(input: ResolveInput): Promise<ResolvedCredential> {
  const strategy: Strategy = input.strategy ?? "random";

  let providerId: string | null = null;
  let providerSlug = input.provider ?? null;
  if (input.provider) {
    const { data: provider } = await supabaseAdmin
      .from("providers")
      .select("id, slug")
      .eq("slug", input.provider)
      .or(`user_id.is.null,user_id.eq.${input.userId}`)
      .limit(1)
      .maybeSingle();
    if (!provider) throw new SelectionError("PROVIDER_NOT_FOUND", "Unknown provider");
    providerId = provider.id;
    providerSlug = provider.slug;
  }

  let collectionId: string | null = null;
  if (input.collection) {
    const { data: collection } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("user_id", input.userId)
      .ilike("name", input.collection)
      .limit(1)
      .maybeSingle();
    if (!collection) throw new SelectionError("COLLECTION_NOT_FOUND", "Unknown collection");
    collectionId = collection.id;
  }

  let query = supabaseAdmin
    .from("api_keys")
    .select(
      "id,name,actor,environment,credential_type,tags,status,expires_at,usage_count,secret_ciphertext,secret_hint,provider_id,collection_id,created_at",
    )
    .eq("user_id", input.userId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (providerId) query = query.eq("provider_id", providerId);
  if (input.actor) query = query.eq("actor", input.actor);
  if (input.environment) query = query.eq("environment", input.environment);
  if (collectionId) query = query.eq("collection_id", collectionId);
  if (input.tag) query = query.contains("tags", [input.tag]);

  const { data, error } = await query;
  if (error) throw new SelectionError("QUERY_FAILED", error.message);

  const now = Date.now();
  const candidates = ((data ?? []) as KeyRow[]).filter(
    (k) => !k.expires_at || new Date(k.expires_at).getTime() > now,
  );

  if (candidates.length === 0)
    throw new SelectionError(
      "NO_AVAILABLE_CREDENTIAL",
      "No active credential matches the requested filters",
    );

  let chosen: KeyRow;
  switch (strategy) {
    case "least_used":
      chosen = [...candidates].sort((a, b) => a.usage_count - b.usage_count)[0]!;
      break;
    case "first_available":
      chosen = [...candidates].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
      break;
    case "round_robin": {
      const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
      const cursor = await nextCursor(input.userId, providerId, sorted.length);
      chosen = sorted[cursor % sorted.length]!;
      break;
    }
    case "random":
    default:
      chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
  }

  await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), usage_count: chosen.usage_count + 1 })
    .eq("id", chosen.id);

  let collectionName: string | null = null;
  if (chosen.collection_id) {
    const { data: c } = await supabaseAdmin
      .from("collections")
      .select("name")
      .eq("id", chosen.collection_id)
      .maybeSingle();
    collectionName = c?.name ?? null;
  }
  if (!providerSlug) {
    const { data: p } = await supabaseAdmin
      .from("providers")
      .select("slug")
      .eq("id", chosen.provider_id)
      .maybeSingle();
    providerSlug = p?.slug ?? null;
  }

  return {
    id: chosen.id,
    name: chosen.name,
    provider: providerSlug ?? "unknown",
    actor: chosen.actor,
    environment: chosen.environment,
    credential_type: chosen.credential_type,
    collection: collectionName,
    tags: chosen.tags,
    secret_hint: chosen.secret_hint,
    strategy,
    ...(input.includeSecret ? { secret: await decryptSecret(chosen.secret_ciphertext) } : {}),
  };
}

/**
 * Advances a persisted round-robin cursor. Concurrent requests read-modify-write
 * against the stored pool row, so each caller lands on a different slot.
 */
async function nextCursor(
  userId: string,
  providerId: string | null,
  poolSize: number,
): Promise<number> {
  if (!providerId) return Math.floor(Math.random() * poolSize);
  const { data: pool } = await supabaseAdmin
    .from("key_pools")
    .select("id, rr_cursor")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (!pool) {
    const { data: created } = await supabaseAdmin
      .from("key_pools")
      .insert({ user_id: userId, provider_id: providerId, strategy: "round_robin", rr_cursor: 1 })
      .select("rr_cursor")
      .single();
    return (created?.rr_cursor ?? 1) - 1;
  }

  const next = (pool.rr_cursor + 1) % Math.max(poolSize, 1);
  await supabaseAdmin.from("key_pools").update({ rr_cursor: next }).eq("id", pool.id);
  return pool.rr_cursor;
}
