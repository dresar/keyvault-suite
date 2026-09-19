import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProviderFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers/new")({
  head: () => ({
    meta: [
      { title: "New Provider · KeyVault" },
      { name: "description", content: "Register custom API provider." },
    ],
  }),
  component: NewProviderPage,
});

const PRESETS = [
  { name: "Cohere", slug: "cohere", category: "ai", docs: "https://docs.cohere.com", website: "https://cohere.com" },
  { name: "Together AI", slug: "together-ai", category: "ai", docs: "https://docs.together.ai", website: "https://together.ai" },
  { name: "Perplexity", slug: "perplexity", category: "ai", docs: "https://docs.perplexity.ai", website: "https://perplexity.ai" },
  { name: "Upstash", slug: "upstash", category: "cloud", docs: "https://docs.upstash.com", website: "https://upstash.com" },
  { name: "Hugging Face", slug: "huggingface", category: "ai", docs: "https://huggingface.co/docs", website: "https://huggingface.co" },
];

function NewProviderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createProvider = useServerFn(createProviderFn);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("ai");
  const [credentialType, setCredentialType] = useState("api_key");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setName(p.name);
    setSlug(p.slug);
    setCategory(p.category);
    setDocsUrl(p.docs);
    setWebsiteUrl(p.website);
    toast.success("Template diterapkan");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nama dan slug wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      await createProvider({
        data: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          category,
          credential_type: credentialType,
          website_url: websiteUrl.trim() || null,
          docs_url: docsUrl.trim() || null,
          description: description.trim() || null,
        },
      });

      toast.success("Provider berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      navigate({ to: "/providers" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/providers"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Provider</h1>
          <p className="text-xs text-muted-foreground">Daftarkan provider custom ke dalam katalog vault</p>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Template Cepat</span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => applyPreset(p)}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors active:scale-[0.98]"
            >
              <Sparkles className="size-3 text-primary" />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="provider-name" className="text-xs font-medium">Nama Provider</Label>
          <Input
            id="provider-name"
            placeholder="Perplexity"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-slug" className="text-xs font-medium">Slug Identifikasi</Label>
          <Input
            id="provider-slug"
            placeholder="perplexity"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="h-9 font-mono text-xs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">AI & ML</SelectItem>
                <SelectItem value="coding">Coding & IDE</SelectItem>
                <SelectItem value="cloud">Cloud & Infra</SelectItem>
                <SelectItem value="developer">Developer Tools</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipe Kredensial</Label>
            <Select value={credentialType} onValueChange={setCredentialType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="oauth_token">OAuth Token</SelectItem>
                <SelectItem value="secret_pair">Key & Secret Pair</SelectItem>
                <SelectItem value="connection_string">Connection String</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-desc" className="text-xs font-medium">Deskripsi</Label>
          <Textarea
            id="provider-desc"
            placeholder="Deskripsi singkat provider"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="provider-website" className="text-xs font-medium">Website URL</Label>
            <Input
              id="provider-website"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-docs" className="text-xs font-medium">Dokumentasi URL</Label>
            <Input
              id="provider-docs"
              placeholder="https://docs.example.com"
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/providers" })}
            disabled={submitting}
            className="h-8 text-xs font-medium active:scale-[0.98]"
          >
            Batal
          </Button>
          <Button type="submit" disabled={submitting} className="h-8 text-xs font-medium active:scale-[0.98]">
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
