import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateToken, jsonResponse, requirePermission } from "@/lib/api-auth.server";
import { logUsage } from "@/lib/audit.server";

export const Route = createFileRoute("/api/public/v1/collections")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const started = Date.now();
        const auth = await authenticateToken(request);
        if ("error" in auth) return auth.error;
        const denied = requirePermission(auth.token, "collections.read");
        if (denied) return denied;

        const { data } = await supabaseAdmin
          .from("collections")
          .select("id, name, created_at")
          .eq("user_id", auth.token.user_id)
          .order("name");

        const allowed = auth.token.allowed_collections;
        const result = (data ?? []).filter(
          (c) => allowed.length === 0 || allowed.includes(c.name),
        );

        await logUsage({
          userId: auth.token.user_id,
          tokenId: auth.token.id,
          tokenName: auth.token.name,
          endpoint: "/api/v1/collections",
          statusCode: 200,
          latencyMs: Date.now() - started,
        });
        return jsonResponse({ success: true, data: result, meta: { count: result.length } });
      },
    },
  },
});
