import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateApiToken, hashToken } from "./crypto.server";
import { logAudit } from "./audit.server";

export const createApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).nullable().optional(),
        permissions: z.array(z.string()).min(1, "Select at least one permission"),
        allowed_providers: z.array(z.string()).default([]),
        allowed_environments: z.array(z.string()).default([]),
        allowed_collections: z.array(z.string()).default([]),
        rate_limit_per_hour: z.number().int().min(10).max(10000).default(600),
        expires_at: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { token, prefix } = generateApiToken();
    const hash = await hashToken(token);
    const { data: row, error } = await context.supabase
      .from("api_tokens")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        token_hash: hash,
        token_prefix: prefix,
        permissions: data.permissions,
        allowed_providers: data.allowed_providers,
        allowed_environments: data.allowed_environments,
        allowed_collections: data.allowed_collections,
        rate_limit_per_hour: data.rate_limit_per_hour,
        expires_at: data.expires_at ?? null,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      userId: context.userId,
      action: "token.create",
      entityType: "api_token",
      entityId: row.id,
      entityName: row.name,
      metadata: { permissions: data.permissions },
    });

    // Shown once; only the hash is persisted.
    return { id: row.id, token };
  });

export const revokeApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      userId: context.userId,
      action: "token.revoke",
      entityType: "api_token",
      entityId: data.id,
    });
    return { ok: true };
  });
