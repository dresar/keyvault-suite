import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateToken, checkScope, jsonResponse, requirePermission } from "@/lib/api-auth.server";
import { logUsage } from "@/lib/audit.server";

export const Route = createFileRoute("/api/public/v1/keys/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const started = Date.now();
        const auth = await authenticateToken(request);
        if ("error" in auth) return auth.error;
        const denied = requirePermission(auth.token, "keys.list");
        if (denied) return denied;

        const url = new URL(request.url);
        const provider = url.searchParams.get("provider");
        const actor = url.searchParams.get("actor");
        const environment = url.searchParams.get("environment");
        const collection = url.searchParams.get("collection");
        const tag = url.searchParams.get("tag");
        const status = url.searchParams.get("status");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);

        const scopeDenied = checkScope(auth.token, { provider, environment, collection });
        if (scopeDenied) return scopeDenied;

        const { data: providers } = await supabaseAdmin
          .from("providers")
          .select("id, slug")
          .or(`user_id.is.null,user_id.eq.${auth.token.user_id}`);
        const slugById = new Map((providers ?? []).map((p) => [p.id, p.slug] as const));
        const idBySlug = new Map((providers ?? []).map((p) => [p.slug, p.id] as const));

        const { data: collections } = await supabaseAdmin
          .from("collections")
          .select("id, name")
          .eq("user_id", auth.token.user_id);
        const collectionById = new Map((collections ?? []).map((c) => [c.id, c.name] as const));

        let query = supabaseAdmin
          .from("api_keys")
          .select(
            "id,name,actor,environment,status,tags,secret_hint,credential_type,expires_at,usage_count,last_used_at,created_at,provider_id,collection_id",
          )
          .eq("user_id", auth.token.user_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (provider) {
          const pid = idBySlug.get(provider);
          if (!pid)
            return jsonResponse(
              { success: false, data: null, error: { code: "PROVIDER_NOT_FOUND", message: "Unknown provider" } },
              404,
            );
          query = query.eq("provider_id", pid);
        }
        if (actor) query = query.eq("actor", actor);
        if (environment) query = query.eq("environment", environment);
        if (status) query = query.eq("status", status);
        if (tag) query = query.contains("tags", [tag]);
        if (collection) {
          const match = (collections ?? []).find(
            (c) => c.name.toLowerCase() === collection.toLowerCase(),
          );
          if (!match)
            return jsonResponse(
              { success: false, data: null, error: { code: "COLLECTION_NOT_FOUND", message: "Unknown collection" } },
              404,
            );
          query = query.eq("collection_id", match.id);
        }

        const { data, error } = await query;
        if (error)
          return jsonResponse(
            { success: false, data: null, error: { code: "QUERY_FAILED", message: error.message } },
            500,
          );

        const allowed = auth.token.allowed_providers;
        // Metadata only — secrets are never returned by list endpoints.
        const result = (data ?? [])
          .map((k) => ({
            id: k.id,
            name: k.name,
            provider: slugById.get(k.provider_id) ?? "unknown",
            actor: k.actor,
            environment: k.environment,
            collection: k.collection_id ? (collectionById.get(k.collection_id) ?? null) : null,
            credential_type: k.credential_type,
            status: k.status,
            tags: k.tags,
            masked_secret: `${k.secret_hint || "••••"}`,
            expires_at: k.expires_at,
            usage_count: k.usage_count,
            last_used_at: k.last_used_at,
            created_at: k.created_at,
          }))
          .filter((k) => allowed.length === 0 || allowed.includes(k.provider));

        await logUsage({
          userId: auth.token.user_id,
          tokenId: auth.token.id,
          tokenName: auth.token.name,
          endpoint: "/api/v1/keys",
          providerSlug: provider,
          statusCode: 200,
          latencyMs: Date.now() - started,
        });

        return jsonResponse({ success: true, data: result, meta: { count: result.length } });
      },
    },
  },
});
