import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FileText, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { importKeysBatchFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/import")({
  head: () => ({
    meta: [
      { title: "Import · KeyVault" },
      { name: "description", content: "Bulk import keys into vault." },
    ],
  }),
  component: ImportPage,
});

const SAMPLE_JSON = `[
  {
    "name": "Production OpenAI",
    "provider_slug": "openai",
    "secret": "sk-proj-prod1234567890",
    "environment": "production"
  },
  {
    "name": "Staging Anthropic",
    "provider_slug": "anthropic",
    "secret": "sk-ant-api03-staging1234",
    "environment": "staging"
  }
]`;

function ImportPage() {
  const navigate = useNavigate();
  const importBatch = useServerFn(importKeysBatchFn);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Content required");
      return;
    }

    try {
      setBusy(true);
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        toast.error("Invalid JSON");
        return;
      }

      if (!Array.isArray(parsed)) {
        toast.error("JSON array required");
        return;
      }

      const rawList = parsed as Array<Record<string, unknown>>;
      const keys = rawList.map((item) => ({
        name: String(item['name'] || "").trim(),
        provider_slug: String(item['provider_slug'] || "openai").trim(),
        secret: String(item['secret'] || "").trim(),
        environment: item['environment'] ? String(item['environment']) : "development",
        description: item['description'] ? String(item['description']) : null,
      }));

      const res = await importBatch({ data: { keys } });
      toast.success(`Imported ${res.imported} keys`);
      navigate({ to: "/vault" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/vault"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Keys</h1>
          <p className="text-sm text-muted-foreground">Batch upload credentials via JSON</p>
        </div>
      </div>

      <form onSubmit={handleImport} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="import-content">JSON Payload</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setContent(SAMPLE_JSON)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Insert Template
            </Button>
          </div>
          <Textarea
            id="import-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            placeholder={SAMPLE_JSON}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/vault" })}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy} className="gap-1.5">
            <Upload className="size-4" />
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </form>
    </div>
  );
}
