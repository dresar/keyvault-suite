import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  authenticateToken,
  jsonResponse,
  requirePermission,
} from "@/lib/api-auth.server";
import { logUsage } from "@/lib/audit.server";

export const Route = createFileRoute("/api/public/v1/providers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const started = Date.now();
        const auth = await authenticateToken(request);
        if ("error" in auth) return auth.error;
        const denied = requirePermission(auth.token, "providers.read");
        if (denied) return denied;

        const { data: providers } = await supabaseAdmin
          .from("providers")
          .select("id, slug, name, category, credential_type, website_url, docs_url, user_id")
          .or(`user_id.is.null,user_id.eq.${auth.token.user_id}`)
          .eq("is_active", true);

        const { data: keys } = await supabaseAdmin
          .from("api_keys")
          .select("provider_id, status")
          .eq("user_id", auth.token.user_id)
          .is("deleted_at", null);

        const counts = new Map<string, number>();
        for (const k of keys ?? [])
          if (k.status === "active")
            counts.set(k.provider_id, (counts.get(k.provider_id) ?? 0) + 1);

        const allowed = auth.token.allowed_providers;
        const result = (providers ?? [])
          .filter((p) => allowed.length === 0 || allowed.includes(p.slug))
          .map((p) => ({
            slug: p.slug,
            name: p.name,
            category: p.category,
            credential_type: p.credential_type,
            website_url: p.website_url,
            docs_url: p.docs_url,
            custom: p.user_id !== null,
            active_credentials: counts.get(p.id) ?? 0,
          }));

        await logUsage({
          userId: auth.token.user_id,
          tokenId: auth.token.id,
          tokenName: auth.token.name,
          endpoint: "/api/v1/providers",
          statusCode: 200,
          latencyMs: Date.now() - started,
        });

        return jsonResponse({ success: true, data: result, meta: { count: result.length } });
      },
    },
  },
});
