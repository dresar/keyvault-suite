import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret, encryptSecret, secretHint } from "./crypto.server";
import { logAudit } from "./audit.server";
import { testCredential, testingSupported } from "./provider-adapters.server";

const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .nullable()
  .optional();

const keyInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  provider_id: z.string().uuid("Provider is required"),
  secret: z.string().trim().min(1, "Secret is required"),
  credential_type: z.string().trim().min(1).default("api_key"),
  actor: z.string().trim().max(60).nullable().optional(),
  environment: z.string().trim().min(1).default("development"),
  collection_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).default([]),
  status: z.enum(["active", "disabled", "revoked"]).default("active"),
  expires_at: isoDate,
  description: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const createKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => keyInput.parse(d))
  .handler(async ({ data, context }) => {
    const ciphertext = await encryptSecret(data.secret);
    const hint = secretHint(data.secret);
    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        provider_id: data.provider_id,
        secret_ciphertext: ciphertext,
        secret_hint: hint,
        credential_type: data.credential_type,
        actor: data.actor ?? null,
        environment: data.environment,
        collection_id: data.collection_id ?? null,
        tags: data.tags,
        status: data.status,
        expires_at: data.expires_at ?? null,
        description: data.description ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("api_key_versions").insert({
      user_id: context.userId,
      key_id: row.id,
      version: 1,
      secret_ciphertext: ciphertext,
      secret_hint: hint,
      status: "active",
    });

    await logAudit({
      userId: context.userId,
      action: "key.create",
      entityType: "api_key",
      entityId: row.id,
      entityName: row.name,
    });
    return { id: row.id };
  });

export const updateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    keyInput.omit({ secret: true }).partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("api_keys").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await logAudit({
      userId: context.userId,
      action: "key.update",
      entityType: "api_key",
      entityId: id,
      entityName: patch.name ?? null,
      metadata: { fields: Object.keys(patch) },
    });
    return { ok: true };
  });

export const revealSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.enum(["reveal", "copy"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("api_keys")
      .select("id, name, secret_ciphertext")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Credential not found");
    const secret = await decryptSecret(row.secret_ciphertext);
    await logAudit({
      userId: context.userId,
      action: data.reason === "copy" ? "key.copy" : "key.reveal",
      entityType: "api_key",
      entityId: row.id,
      entityName: row.name,
    });
    return { secret };
  });

export const rotateSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        secret: z.string().trim().min(1),
        revoke_previous: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("api_keys")
      .select("id, name, version")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Credential not found");

    const ciphertext = await encryptSecret(data.secret);
    const hint = secretHint(data.secret);
    const nextVersion = row.version + 1;

    await context.supabase
      .from("api_key_versions")
      .update({
        status: data.revoke_previous ? "revoked" : "rotated",
        rotated_at: new Date().toISOString(),
        revoked_at: data.revoke_previous ? new Date().toISOString() : null,
      })
      .eq("key_id", row.id)
      .eq("status", "active");

    await context.supabase.from("api_key_versions").insert({
      user_id: context.userId,
      key_id: row.id,
      version: nextVersion,
      secret_ciphertext: ciphertext,
      secret_hint: hint,
      status: "active",
    });

    const { error: updErr } = await context.supabase
      .from("api_keys")
      .update({ secret_ciphertext: ciphertext, secret_hint: hint, version: nextVersion })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    await logAudit({
      userId: context.userId,
      action: "key.rotate",
      entityType: "api_key",
      entityId: row.id,
      entityName: row.name,
      metadata: { version: nextVersion },
    });
    return { version: nextVersion };
  });

export const deleteKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), permanent: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("api_keys")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();

    if (data.permanent) {
      const { error } = await context.supabase.from("api_keys").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("api_keys")
        .update({ status: "revoked", deleted_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    await logAudit({
      userId: context.userId,
      action: data.permanent ? "key.delete" : "key.revoke",
      entityType: "api_key",
      entityId: data.id,
      entityName: row?.name ?? null,
    });
    return { ok: true };
  });

export const bulkKeyAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        action: z.enum(["enable", "disable", "delete", "move_collection", "add_tag", "set_actor"]),
        collection_id: z.string().uuid().nullable().optional(),
        tag: z.string().trim().toLowerCase().max(40).optional(),
        actor: z.string().trim().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let affected = 0;
    if (data.action === "enable" || data.action === "disable") {
      const { error, count } = await context.supabase
        .from("api_keys")
        .update({ status: data.action === "enable" ? "active" : "disabled" }, { count: "exact" })
        .in("id", data.ids);
      if (error) throw new Error(error.message);
      affected = count ?? data.ids.length;
    } else if (data.action === "delete") {
      const { error } = await context.supabase
        .from("api_keys")
        .update({ status: "revoked", deleted_at: new Date().toISOString() })
        .in("id", data.ids);
      if (error) throw new Error(error.message);
      affected = data.ids.length;
    } else if (data.action === "move_collection") {
      const { error } = await context.supabase
        .from("api_keys")
        .update({ collection_id: data.collection_id ?? null })
        .in("id", data.ids);
      if (error) throw new Error(error.message);
      affected = data.ids.length;
    } else if (data.action === "set_actor") {
      const { error } = await context.supabase
        .from("api_keys")
        .update({ actor: data.actor ?? null })
        .in("id", data.ids);
      if (error) throw new Error(error.message);
      affected = data.ids.length;
    } else if (data.action === "add_tag" && data.tag) {
      const { data: rows } = await context.supabase
        .from("api_keys")
        .select("id, tags")
        .in("id", data.ids);
      for (const row of rows ?? []) {
        if (row.tags.includes(data.tag)) continue;
        await context.supabase
          .from("api_keys")
          .update({ tags: [...row.tags, data.tag] })
          .eq("id", row.id);
        affected++;
      }
    }

    await logAudit({
      userId: context.userId,
      action: `key.bulk.${data.action}`,
      entityType: "api_key",
      metadata: { count: affected },
    });
    return { affected };
  });

export const testKeyConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(25) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("api_keys")
      .select("id, name, secret_ciphertext, provider_id")
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    const providerIds = [...new Set((rows ?? []).map((r) => r.provider_id))];
    const { data: providers } = await context.supabase
      .from("providers")
      .select("id, slug")
      .in("id", providerIds);
    const slugById = new Map((providers ?? []).map((p) => [p.id, p.slug]));

    const results: { id: string; name: string; status: string; detail: string }[] = [];
    for (const row of rows ?? []) {
      const slug = slugById.get(row.provider_id) ?? "";
      let outcome = { status: "unsupported", detail: "Testing is not supported for this provider" };
      if (testingSupported(slug)) {
        const secret = await decryptSecret(row.secret_ciphertext);
        outcome = await testCredential(slug, secret);
      }
      await context.supabase
        .from("api_keys")
        .update({ last_test_status: outcome.status, last_test_at: new Date().toISOString() })
        .eq("id", row.id);
      results.push({ id: row.id, name: row.name, ...outcome });
    }

    await logAudit({
      userId: context.userId,
      action: "key.test",
      entityType: "api_key",
      metadata: { count: results.length },
    });
    return { results };
  });

const importRow = z.object({
  name: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  secret: z.string().trim().min(1),
  actor: z.string().trim().optional().nullable(),
  environment: z.string().trim().optional().nullable(),
  collection: z.string().trim().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  status: z.string().trim().optional().nullable(),
  expires_at: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

export const importKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
        dry_run: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: providers } = await context.supabase.from("providers").select("id, slug, name");
    const providerByKey = new Map<string, string>();
    for (const p of providers ?? []) {
      providerByKey.set(p.slug.toLowerCase(), p.id);
      providerByKey.set(p.name.toLowerCase(), p.id);
    }
    const { data: collections } = await context.supabase.from("collections").select("id, name");
    const collectionByName = new Map(
      (collections ?? []).map((c) => [c.name.toLowerCase(), c.id] as const),
    );
    const { data: existing } = await context.supabase
      .from("api_keys")
      .select("name, provider_id")
      .is("deleted_at", null);
    const existingKeys = new Set(
      (existing ?? []).map((e) => `${e.provider_id}:${e.name.toLowerCase()}`),
    );

    const imported: string[] = [];
    const skipped: { row: number; name: string; reason: string }[] = [];
    const failed: { row: number; name: string; reason: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const parsed = importRow.safeParse(data.rows[i]);
      if (!parsed.success) {
        failed.push({
          row: i + 1,
          name: String((data.rows[i] as Record<string, unknown>)["name"] ?? "—"),
          reason: parsed.error.issues[0]?.message ?? "Invalid row",
        });
        continue;
      }
      const row = parsed.data;
      const providerId = providerByKey.get(row.provider.toLowerCase());
      if (!providerId) {
        failed.push({ row: i + 1, name: row.name, reason: `Unknown provider "${row.provider}"` });
        continue;
      }
      if (row.expires_at && Number.isNaN(Date.parse(row.expires_at))) {
        failed.push({ row: i + 1, name: row.name, reason: "Invalid expiration date" });
        continue;
      }
      const dupKey = `${providerId}:${row.name.toLowerCase()}`;
      if (existingKeys.has(dupKey)) {
        skipped.push({ row: i + 1, name: row.name, reason: "Duplicate name for this provider" });
        continue;
      }

      if (data.dry_run) {
        imported.push(row.name);
        existingKeys.add(dupKey);
        continue;
      }

      let collectionId: string | null = null;
      if (row.collection) {
        collectionId = collectionByName.get(row.collection.toLowerCase()) ?? null;
        if (!collectionId) {
          const { data: created } = await context.supabase
            .from("collections")
            .insert({ user_id: context.userId, name: row.collection })
            .select("id")
            .single();
          collectionId = created?.id ?? null;
          if (collectionId) collectionByName.set(row.collection.toLowerCase(), collectionId);
        }
      }

      const tags = Array.isArray(row.tags)
        ? row.tags
        : typeof row.tags === "string" && row.tags.length > 0
          ? row.tags.split(/[,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
          : [];

      const ciphertext = await encryptSecret(row.secret);
      const hint = secretHint(row.secret);
      const { data: inserted, error } = await context.supabase
        .from("api_keys")
        .insert({
          user_id: context.userId,
          name: row.name,
          provider_id: providerId,
          secret_ciphertext: ciphertext,
          secret_hint: hint,
          actor: row.actor ?? null,
          environment: row.environment ?? "development",
          collection_id: collectionId,
          tags,
          status: row.status === "disabled" ? "disabled" : "active",
          expires_at: row.expires_at ?? null,
          description: row.description ?? null,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        failed.push({ row: i + 1, name: row.name, reason: error?.message ?? "Insert failed" });
        continue;
      }
      await context.supabase.from("api_key_versions").insert({
        user_id: context.userId,
        key_id: inserted.id,
        version: 1,
        secret_ciphertext: ciphertext,
        secret_hint: hint,
      });
      existingKeys.add(dupKey);
      imported.push(row.name);
    }

    if (!data.dry_run) {
      await logAudit({
        userId: context.userId,
        action: "vault.import",
        entityType: "api_key",
        metadata: { imported: imported.length, skipped: skipped.length, failed: failed.length },
      });
    }

    return { imported, skipped, failed, dry_run: data.dry_run };
  });

export const exportVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        format: z.enum(["json", "csv"]),
        include_secrets: z.boolean().default(false),
        ids: z.array(z.string().uuid()).optional(),
        password: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.include_secrets) {
      const email = (context.claims as { email?: string }).email;
      if (!data.password || !email)
        throw new Error("Password confirmation required to export secrets");
      const { error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (authError) throw new Error("Password confirmation failed");
    }

    let query = context.supabase
      .from("api_keys")
      .select(
        "id,name,credential_type,actor,environment,status,tags,expires_at,description,notes,usage_count,last_used_at,created_at,secret_ciphertext,secret_hint,provider_id,collection_id",
      )
      .is("deleted_at", null);
    if (data.ids?.length) query = query.in("id", data.ids);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: providers } = await context.supabase.from("providers").select("id, slug");
    const slugById = new Map((providers ?? []).map((p) => [p.id, p.slug] as const));
    const { data: collections } = await context.supabase.from("collections").select("id, name");
    const nameById = new Map((collections ?? []).map((c) => [c.id, c.name] as const));

    const records = [] as Record<string, unknown>[];
    for (const row of rows ?? []) {
      records.push({
        name: row.name,
        provider: slugById.get(row.provider_id) ?? "",
        credential_type: row.credential_type,
        actor: row.actor ?? "",
        environment: row.environment,
        collection: row.collection_id ? (nameById.get(row.collection_id) ?? "") : "",
        tags: row.tags.join("|"),
        status: row.status,
        expires_at: row.expires_at ?? "",
        description: row.description ?? "",
        usage_count: row.usage_count,
        last_used_at: row.last_used_at ?? "",
        created_at: row.created_at,
        secret: data.include_secrets ? await decryptSecret(row.secret_ciphertext) : undefined,
      });
    }

    await logAudit({
      userId: context.userId,
      action: data.include_secrets ? "vault.export.secrets" : "vault.export.metadata",
      entityType: "vault",
      metadata: { format: data.format, count: records.length },
    });

    if (data.format === "json") {
      return {
        filename: `keyvault-export-${new Date().toISOString().slice(0, 10)}.json`,
        mime: "application/json",
        content: JSON.stringify(
          { exported_at: new Date().toISOString(), count: records.length, keys: records },
          null,
          2,
        ),
      };
    }

    const headers = Object.keys(records[0] ?? { name: "", provider: "" }).filter(
      (h) => data.include_secrets || h !== "secret",
    );
    const escape = (v: unknown) => {
      const s = v === undefined || v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...records.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ].join("\n");

    return {
      filename: `keyvault-export-${new Date().toISOString().slice(0, 10)}.csv`,
      mime: "text/csv",
      content: csv,
    };
  });
