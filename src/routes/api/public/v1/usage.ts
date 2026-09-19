import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateToken, jsonResponse, requirePermission } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateToken(request);
        if ("error" in auth) return auth.error;
        const denied = requirePermission(auth.token, "usage.read");
        if (denied) return denied;

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);

        const { data } = await supabaseAdmin
          .from("api_usage_logs")
          .select("endpoint, method, provider_slug, key_name, strategy, status_code, latency_ms, token_name, created_at")
          .eq("user_id", auth.token.user_id)
          .order("created_at", { ascending: false })
          .limit(limit);

        return jsonResponse({ success: true, data: data ?? [], meta: { count: data?.length ?? 0 } });
      },
    },
  },
});
