import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Plug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProviderFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers/new")({
  head: () => ({
    meta: [{ title: "Provider Baru · KeyVault" }],
  }),
  component: NewProviderPage,
});

function NewProviderPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("ai");
  const [credentialType, setCredentialType] = useState("api_key");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Form belum lengkap");
      return;
    }

    setSubmitting(true);
    try {
      await createProviderFn({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          category,
          credential_type: credentialType,
          website_url: websiteUrl.trim() || null,
          docs_url: docsUrl.trim() || null,
          description: description.trim() || null,
        },
      });
      toast.success("Provider dibuat!");
      navigate({ to: "/providers" });
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/providers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Provider Baru</h1>
          <p className="text-xs text-muted-foreground">Tambah provider kustom ke katalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="pName">Nama</Label>
          <Input
            id="pName"
            placeholder="Nama"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pSlug">Slug</Label>
          <Input
            id="pSlug"
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pCat">Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="pCat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="cloud">Cloud</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pType">Tipe</Label>
            <Select value={credentialType} onValueChange={setCredentialType}>
              <SelectTrigger id="pType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="token">Token</SelectItem>
                <SelectItem value="bot_token">Bot Token</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pWeb">Website</Label>
          <Input
            id="pWeb"
            type="url"
            placeholder="URL"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pDocs">Dokumentasi</Label>
          <Input
            id="pDocs"
            type="url"
            placeholder="URL"
            value={docsUrl}
            onChange={(e) => setDocsUrl(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pDesc">Deskripsi</Label>
          <Textarea
            id="pDesc"
            placeholder="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button variant="outline" type="button" asChild>
            <Link to="/providers">Batal</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
