import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashToken } from "./crypto.server";

export type TokenContext = {
  id: string;
  user_id: string;
  name: string;
  permissions: string[];
  allowed_providers: string[];
  allowed_environments: string[];
  allowed_collections: string[];
  rate_limit_per_hour: number;
};

export type ApiError = { code: string; message: string; status: number };

export function jsonResponse(
  body: {
    success: boolean;
    data?: unknown;
    meta?: Record<string, unknown>;
    error?: { code: string; message: string } | null;
  },
  status = 200,
): Response {
  return new Response(JSON.stringify({ meta: {}, error: null, ...body }, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function apiError(code: string, message: string, status: number): Response {
  return jsonResponse({ success: false, data: null, error: { code, message } }, status);
}

export async function authenticateToken(
  request: Request,
): Promise<{ token: TokenContext } | { error: Response }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return {
      error: apiError("UNAUTHENTICATED", "Missing Bearer access token", 401),
    };
  }
  const raw = header.slice(7).trim();
  if (!raw) return { error: apiError("UNAUTHENTICATED", "Empty access token", 401) };

  const hash = await hashToken(raw);
  const { data, error } = await supabaseAdmin
    .from("api_tokens")
    .select(
      "id,user_id,name,permissions,allowed_providers,allowed_environments,allowed_collections,rate_limit_per_hour,revoked_at,expires_at",
    )
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !data) return { error: apiError("INVALID_TOKEN", "Access token not found", 401) };
  if (data.revoked_at) return { error: apiError("TOKEN_REVOKED", "Access token revoked", 401) };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now())
    return { error: apiError("TOKEN_EXPIRED", "Access token expired", 401) };

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from("api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("token_id", data.id)
    .gte("created_at", since);

  if ((count ?? 0) >= data.rate_limit_per_hour)
    return {
      error: apiError("RATE_LIMITED", "Hourly rate limit exceeded for this token", 429),
    };

  await supabaseAdmin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { token: data as TokenContext };
}

export function requirePermission(token: TokenContext, permission: string): Response | null {
  if (!token.permissions.includes(permission))
    return apiError("FORBIDDEN", `Token is missing permission: ${permission}`, 403);
  return null;
}

export function checkScope(
  token: TokenContext,
  scope: { provider?: string | null; environment?: string | null; collection?: string | null },
): Response | null {
  if (
    token.allowed_providers.length > 0 &&
    scope.provider &&
    !token.allowed_providers.includes(scope.provider)
  )
    return apiError("FORBIDDEN", `Token cannot access provider: ${scope.provider}`, 403);
  if (
    token.allowed_environments.length > 0 &&
    scope.environment &&
    !token.allowed_environments.includes(scope.environment)
  )
    return apiError("FORBIDDEN", `Token cannot access environment: ${scope.environment}`, 403);
  if (
    token.allowed_collections.length > 0 &&
    scope.collection &&
    !token.allowed_collections.includes(scope.collection)
  )
    return apiError("FORBIDDEN", `Token cannot access collection: ${scope.collection}`, 403);
  return null;
}
