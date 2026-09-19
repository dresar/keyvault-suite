import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * One-time administrator seeding. Credentials come from server environment
 * secrets only and are never present in the client bundle. Requires the
 * VAULT_SETUP_TOKEN header so the endpoint cannot be triggered publicly.
 */
export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const setupToken = process.env["VAULT_SETUP_TOKEN"];
        const provided = request.headers.get("x-setup-token");
        if (!setupToken || provided !== setupToken) {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }

        const email = process.env["ADMIN_SEED_EMAIL"];
        const password = process.env["ADMIN_SEED_PASSWORD"];
        if (!email || !password) {
          return new Response(
            JSON.stringify({ success: false, error: "Seed environment not configured" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: "Administrator" },
        });

        if (error && !/already/i.test(error.message)) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, created: Boolean(created?.user), existed: Boolean(error) }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
