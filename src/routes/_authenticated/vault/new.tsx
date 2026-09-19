import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Folder,
  KeyRound,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { ProviderSearchSelect } from "@/components/vault/ProviderSearchSelect";
import { getKeysListFn, createKeyFn } from "@/lib/neon-vault.functions";

type VaultNewSearch = { provider?: string | undefined };

export const Route = createFileRoute("/_authenticated/vault/new")({
  validateSearch: (search: Record<string, unknown>): VaultNewSearch => ({
    provider: typeof search["provider"] === "string" ? search["provider"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tambah Kunci API Baru · KeyVault" },
      { name: "description", content: "Simpan kredensial terenkripsi AES-256-GCM ke Neon." },
    ],
  }),
  component: NewKeyPage,
});

type ProviderItem = {
  id: string;
  name: string;
  slug: string;
  category?: string | undefined;
  icon_url?: string | null | undefined;
  website_url?: string | null | undefined;
  docs_url?: string | null | undefined;
  custom_fields?: Array<{
    id: string;
    label: string;
    type: "text" | "password" | "url";
    required: boolean;
    placeholder?: string | undefined;
  }> | undefined;
};

const DEFAULT_SCHEMAS: Record<string, Array<{ id: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }>> = {
  supabase: [
    { id: "project_url", label: "Project URL (Endpoint)", type: "url", required: true, placeholder: "https://xyzcompany.supabase.co" },
    { id: "anon_key", label: "Anon Public API Key", type: "password", required: true, placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9••••" },
    { id: "service_role_key", label: "Service Role Secret Key", type: "password", required: true, placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9••••" },
    { id: "database_url", label: "Direct Postgres URI (Opsional)", type: "password", required: false, placeholder: "postgresql://postgres:••••@db.xyz.supabase.co:5432/postgres" },
  ],
  imagekit: [
    { id: "public_key", label: "Public Key", type: "text", required: true, placeholder: "public_••••••••" },
    { id: "private_key", label: "Private Key", type: "password", required: true, placeholder: "private_••••••••" },
    { id: "url_endpoint", label: "URL Endpoint", type: "url", required: true, placeholder: "https://ik.imagekit.io/your_id" },
  ],
  neon: [
    { id: "database_url", label: "DATABASE_URL (Postgres Connection String)", type: "password", required: true, placeholder: "postgresql://neondb_owner:••••@ep-••••.aws.neon.tech/neondb?sslmode=require" },
    { id: "api_key", label: "Neon Cloud Management API Key", type: "password", required: false, placeholder: "••••••••" },
    { id: "project_id", label: "Project ID", type: "text", required: false, placeholder: "proud-water-123456" },
  ],
  aws: [
    { id: "access_key_id", label: "AWS Access Key ID", type: "text", required: true, placeholder: "AKIA••••••••" },
    { id: "secret_access_key", label: "AWS Secret Access Key", type: "password", required: true, placeholder: "••••••••" },
    { id: "region", label: "Default Region", type: "text", required: true, placeholder: "us-east-1" },
    { id: "s3_bucket", label: "Default S3 Bucket (Opsional)", type: "text", required: false, placeholder: "my-production-bucket" },
  ],
  cloudflare: [
    { id: "api_token", label: "Cloudflare API Token", type: "password", required: true, placeholder: "••••••••" },
    { id: "account_id", label: "Cloudflare Account ID", type: "text", required: true, placeholder: "d8c9••••••••" },
    { id: "zone_id", label: "Zone ID (Opsional)", type: "text", required: false, placeholder: "b1a2••••••••" },
  ],
  stripe: [
    { id: "publishable_key", label: "Publishable Key", type: "text", required: true, placeholder: "pk_live_••••••••" },
    { id: "secret_key", label: "Secret Key", type: "password", required: true, placeholder: "sk_live_••••••••" },
    { id: "webhook_secret", label: "Webhook Signing Secret", type: "password", required: false, placeholder: "whsec_••••••••" },
  ],
  upstash: [
    { id: "redis_rest_url", label: "UPSTASH_REDIS_REST_URL", type: "url", required: true, placeholder: "https://rapid-fox-12345.upstash.io" },
    { id: "redis_rest_token", label: "UPSTASH_REDIS_REST_TOKEN", type: "password", required: true, placeholder: "AX-2••••••••" },
  ],
  resend: [
    { id: "api_key", label: "Resend API Key", type: "password", required: true, placeholder: "re_••••••••" },
    { id: "from_domain", label: "Verified Sending Domain", type: "text", required: false, placeholder: "mail.mycompany.com" },
  ],
  gemini: [
    { id: "api_key", label: "Google AI Studio API Key", type: "password", required: true, placeholder: "AIzaSy••••••••" },
    { id: "project_id", label: "Google Cloud Project ID (Opsional)", type: "text", required: false, placeholder: "my-gcp-project-123" },
  ],
  openai: [
    { id: "api_key", label: "OpenAI API Key", type: "password", required: true, placeholder: "sk-proj-••••••••" },
    { id: "organization_id", label: "Organization ID (Opsional)", type: "text", required: false, placeholder: "org-••••••••" },
    { id: "project_id", label: "Project ID (Opsional)", type: "text", required: false, placeholder: "proj_••••••••" },
  ],
  claude: [
    { id: "api_key", label: "Anthropic Claude API Key", type: "password", required: true, placeholder: "sk-ant-api03-••••••••" },
    { id: "workspace_id", label: "Workspace ID (Opsional)", type: "text", required: false, placeholder: "wrk_••••••••" },
  ],
  deepseek: [
    { id: "api_key", label: "DeepSeek API Key", type: "password", required: true, placeholder: "sk-••••••••" },
  ],
  groq: [
    { id: "api_key", label: "Groq Cloud API Key", type: "password", required: true, placeholder: "gsk_••••••••" },
  ],
  midjourney: [
    { id: "api_key", label: "Midjourney API / Proxy Token", type: "password", required: true, placeholder: "mj_••••••••" },
  ],
  stability: [
    { id: "api_key", label: "Stability AI API Key", type: "password", required: true, placeholder: "sk-••••••••" },
  ],
  suno: [
    { id: "api_key", label: "Suno AI API Token", type: "password", required: true, placeholder: "suno_••••••••" },
  ],
  udio: [
    { id: "api_key", label: "Udio API Token", type: "password", required: true, placeholder: "udio_••••••••" },
  ],
  "xiaomi-mimo": [
    { id: "api_key", label: "Xiaomi MiMo API Key", type: "password", required: true, placeholder: "mimo_••••••••" },
  ],
  cursor: [
    { id: "api_key", label: "Cursor AI Access Token", type: "password", required: true, placeholder: "cur_••••••••" },
  ],
  cline: [
    { id: "api_key", label: "Cline API Key / OpenRouter Token", type: "password", required: true, placeholder: "sk-or-••••••••" },
  ],
  "claude-code": [
    { id: "api_key", label: "Claude Code CLI / Anthropic Auth Token", type: "password", required: true, placeholder: "sk-ant-••••••••" },
  ],
  "github-copilot": [
    { id: "personal_access_token", label: "GitHub Personal Access Token (copilot scope)", type: "password", required: true, placeholder: "ghp_••••••••" },
  ],
  antigravity: [
    { id: "api_key", label: "Google Antigravity Auth / API Key", type: "password", required: true, placeholder: "agy_••••••••" },
  ],
  mem0: [
    { id: "api_key", label: "Mem0 Platform API Key", type: "password", required: true, placeholder: "m0-••••••••" },
  ],
};

function generateRandomKey(prefix = "sk-live-") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix;
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function NewKeyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchKeysList = useServerFn(getKeysListFn);
  const createKey = useServerFn(createKeyFn);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);

  const [providerId, setProviderId] = useState(search.provider ?? "");
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"production" | "staging" | "development">("production");
  const [collectionId, setCollectionId] = useState("");
  const [actor, setActor] = useState("");
  const [tags, setTags] = useState("api, production");
  const [description, setDescription] = useState("");

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchKeysList({ data: {} })
      .then((res) => {
        const provs = (res.providers || []) as ProviderItem[];
        const cols = (res.collections || []) as Array<{ id: string; name: string }>;
        setProviders(provs);
        setCollections(cols);

        let initialMatch: ProviderItem | undefined = undefined;
        if (search.provider) {
          const q = search.provider.trim().toLowerCase();
          initialMatch = provs.find((p) => p.id === search.provider || p.slug.toLowerCase() === q);
        }
        if (initialMatch) {
          setProviderId(initialMatch.id);
        } else if (provs.length > 0 && provs[0]) {
          setProviderId(provs[0].id);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal memuat provider"))
      .finally(() => setLoading(false));
  }, [search.provider]);

  useEffect(() => {
    if (search.provider && providers.length > 0) {
      const q = search.provider.trim().toLowerCase();
      const match = providers.find((p) => p.id === search.provider || p.slug.toLowerCase() === q);
      if (match && match.id !== providerId) {
        setProviderId(match.id);
      }
    }
  }, [search.provider, providers]);

  const selectedProvider = useMemo(() => {
    if (!providers.length) return undefined;
    const match = providers.find(
      (p) => p.id === providerId || (search.provider && (p.id === search.provider || p.slug.toLowerCase() === search.provider.toLowerCase()))
    );
    return match || providers[0];
  }, [providers, providerId, search.provider]);

  const activeFields = useMemo(() => {
    if (!selectedProvider) {
      return [{ id: "api_key", label: "API Key", type: "password" as const, required: true, placeholder: "sk-••••••••" }];
    }

    if (
      Array.isArray(selectedProvider.custom_fields) &&
      selectedProvider.custom_fields.length > 0
    ) {
      return selectedProvider.custom_fields;
    }

    const s = selectedProvider.slug.toLowerCase();
    if (DEFAULT_SCHEMAS[s]) {
      return DEFAULT_SCHEMAS[s];
    }

    return [
      {
        id: "api_key",
        label: `${selectedProvider.name} API Key / Secret`,
        type: "password" as const,
        required: true,
        placeholder: "Masukkan kredensial...",
      },
    ];
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedProvider) {
      setName(`${selectedProvider.name} Primary Key`);
      setFieldValues({});
    }
  }, [selectedProvider?.id]);

  const handleSelectProvider = (newId: string) => {
    setProviderId(newId);
    const p = providers.find((x) => x.id === newId);
    if (p) {
      navigate({
        to: "/vault/new",
        search: { provider: p.slug },
        replace: true,
      });
    }
  };

  const handleFieldChange = (id: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleGenerateSecret = (fieldId: string) => {
    const random = generateRandomKey();
    handleFieldChange(fieldId, random);
    setShowValues((prev) => ({ ...prev, [fieldId]: true }));
    toast.success("Kunci acak dibuat");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) {
      toast.error("Pilih provider");
      return;
    }
    if (!name.trim()) {
      toast.error("Nama kunci wajib diisi");
      return;
    }

    for (const f of activeFields) {
      if (f.required && !fieldValues[f.id]?.trim()) {
        toast.error(`Bidang "${f.label}" wajib diisi`);
        return;
      }
    }

    const primarySecret =
      fieldValues["api_key"] ||
      fieldValues["service_role_key"] ||
      fieldValues["private_key"] ||
      fieldValues["secret_access_key"] ||
      fieldValues["database_url"] ||
      fieldValues["secret_key"] ||
      Object.values(fieldValues).find((v) => v.trim() !== "") ||
      "";

    if (!primarySecret.trim()) {
      toast.error("Harap isi setidaknya satu nilai kredensial");
      return;
    }

    setSubmitting(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await createKey({
        data: {
          name: name.trim(),
          provider_id: selectedProvider.id,
          secret: primarySecret.trim(),
          environment,
          collection_id: collectionId ? collectionId : null,
          actor: actor.trim() ? actor.trim() : null,
          tags: parsedTags,
          description: description.trim() ? description.trim() : null,
          metadata: {
            custom_fields: fieldValues,
            provider_slug: selectedProvider.slug,
          },
        },
      });

      toast.success(`Koneksi ${selectedProvider.name} tersimpan`);
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      qc.invalidateQueries({ queryKey: ["neon-provider-detail", selectedProvider.slug] });
      navigate({ to: "/providers/$slug", params: { slug: selectedProvider.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kunci");
    } finally {
      setSubmitting(false);
    }
  };

  const getKeyPortalUrl = () => {
    if (!selectedProvider) return null;
    const s = selectedProvider.slug.toLowerCase();
    if (s === "gemini" || s === "google-gemini") return "https://aistudio.google.com/app/apikey";
    if (s === "supabase") return "https://supabase.com/dashboard/project/_/settings/api";
    if (s === "neon") return "https://console.neon.tech/app/projects";
    if (s === "openai") return "https://platform.openai.com/api-keys";
    if (s === "claude" || s === "anthropic") return "https://console.anthropic.com/settings/keys";
    if (s === "imagekit") return "https://imagekit.io/dashboard/developer/api-keys";
    if (s === "resend") return "https://resend.com/api-keys";
    if (s === "stripe") return "https://dashboard.stripe.com/apikeys";
    if (s === "upstash") return "https://console.upstash.com";
    return selectedProvider.docs_url || selectedProvider.website_url || null;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedProvider ? (
            <Link
              to="/providers/$slug"
              params={{ slug: selectedProvider.slug }}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : (
            <Link
              to="/providers"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Tambah Kunci Koneksi API
            </h1>
            <p className="text-xs text-muted-foreground">
              Simpan kredensial terenkripsi AES-256-GCM ke Neon Lakebase Postgres.
            </p>
          </div>
        </div>

        {selectedProvider && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-xs">
            <ProviderIcon
              name={selectedProvider.name}
              slug={selectedProvider.slug}
              iconUrl={selectedProvider.icon_url}
              size="sm"
              className="size-6 rounded"
            />
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                {selectedProvider.name}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                {selectedProvider.slug}
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Pilih Provider
              </h2>
            </div>

            {getKeyPortalUrl() && (
              <a
                href={getKeyPortalUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Dapatkan API Key {selectedProvider?.name}
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Provider API & Cloud</Label>
            <ProviderSearchSelect
              providers={providers}
              value={providerId}
              onChange={handleSelectProvider}
              placeholder="Pilih atau cari provider..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="key-name" className="text-xs font-medium">
                Nama Koneksi Kunci <span className="text-destructive">*</span>
              </Label>
              <Input
                id="key-name"
                placeholder="Misal: Production API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Environment</Label>
              <Select
                value={environment}
                onValueChange={(val: "production" | "staging" | "development") => setEnvironment(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production" className="text-xs">
                    Production (Live)
                  </SelectItem>
                  <SelectItem value="staging" className="text-xs">
                    Staging (Testing)
                  </SelectItem>
                  <SelectItem value="development" className="text-xs">
                    Development (Local)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Isian Kredensial ({selectedProvider?.name || "Provider"})
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Formulir ini otomatis menyesuaikan format kredensial resmi {selectedProvider?.name}.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              AES-256-GCM
            </Badge>
          </div>

          <div className="space-y-3.5 pt-1">
            {activeFields.map((field) => {
              const isPassword = field.type === "password";
              const visible = Boolean(showValues[field.id]);
              const val = fieldValues[field.id] || "";

              return (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`field-${field.id}`} className="text-xs font-medium">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {field.id}
                      </span>
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => handleGenerateSecret(field.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <Sparkles className="size-3" />
                          Acak
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      id={`field-${field.id}`}
                      type={isPassword && !visible ? "password" : field.type === "url" ? "url" : "text"}
                      value={val}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}...`}
                      className="h-9 text-xs pr-9 font-mono bg-background"
                      required={field.required}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowValues((prev) => ({ ...prev, [field.id]: !prev[field.id] }))}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        aria-label="Toggle visibilitas"
                      >
                        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Tag className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Pengelompokan & Metadata
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Koleksi (Opsional)</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tanpa Koleksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">
                    Tanpa Koleksi
                  </SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key-tags" className="text-xs font-medium">
                Tags (Pisahkan dengan koma)
              </Label>
              <Input
                id="key-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="production, auth, api"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="key-desc" className="text-xs font-medium">
              Catatan / Deskripsi
            </Label>
            <Textarea
              id="key-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan penggunaan kredensial ini untuk tim atau service..."
              rows={2}
              className="resize-none text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {selectedProvider ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-medium"
            >
              <Link to="/providers/$slug" params={{ slug: selectedProvider.slug }}>
                Batal
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-medium"
            >
              <Link to="/providers">
                Batal
              </Link>
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 px-5 text-xs font-semibold active:scale-[0.98]"
          >
            {submitting ? "Menyimpan..." : "Simpan Kunci Koneksi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
