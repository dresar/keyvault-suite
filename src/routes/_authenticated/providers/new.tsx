import { useState, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  ImageIcon,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
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
import { createProviderFn, uploadIconToGitHubFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/providers/new")({
  head: () => ({
    meta: [
      { title: "Daftar Provider Baru · KeyVault" },
      { name: "description", content: "Daftarkan konfigurasi provider API dan skema kredensial." },
    ],
  }),
  component: NewProviderPage,
});

type CredentialFieldDef = {
  id: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string | undefined;
};

const CATEGORIES = [
  { id: "ai", label: "AI & Machine Learning" },
  { id: "coding", label: "Coding & Developer Tool" },
  { id: "cloud", label: "Cloud & Infrastructure" },
  { id: "storage", label: "Storage, CDN & Media" },
  { id: "database", label: "Database & Backend" },
  { id: "auth", label: "Auth & Identity" },
  { id: "payment", label: "Payment & Billing" },
  { id: "communication", label: "Communication & Email" },
  { id: "automation", label: "Automation & Integration" },
] as const;

const CREDENTIAL_PRESETS = [
  {
    id: "api_key",
    label: "Single API Key",
    fields: [
      { id: "api_key", label: "API Key", type: "password", required: true, placeholder: "sk-••••••••" } as CredentialFieldDef,
    ],
  },
  {
    id: "public_private",
    label: "Public & Private Key Pair (e.g. ImageKit)",
    fields: [
      { id: "public_key", label: "Public Key", type: "text", required: true, placeholder: "public_••••••••" } as CredentialFieldDef,
      { id: "private_key", label: "Private Key", type: "password", required: true, placeholder: "private_••••••••" } as CredentialFieldDef,
      { id: "url_endpoint", label: "URL Endpoint", type: "url", required: false, placeholder: "https://ik.imagekit.io/..." } as CredentialFieldDef,
    ],
  },
  {
    id: "access_secret",
    label: "Access Key & Secret (e.g. AWS S3 / R2)",
    fields: [
      { id: "access_key_id", label: "Access Key ID", type: "text", required: true, placeholder: "AKIA••••••••" } as CredentialFieldDef,
      { id: "secret_access_key", label: "Secret Access Key", type: "password", required: true, placeholder: "••••••••" } as CredentialFieldDef,
      { id: "region", label: "Region / Bucket", type: "text", required: false, placeholder: "ap-southeast-1" } as CredentialFieldDef,
    ],
  },
  {
    id: "org_token",
    label: "Token & Organization ID",
    fields: [
      { id: "api_key", label: "API Token", type: "password", required: true, placeholder: "token_••••••••" } as CredentialFieldDef,
      { id: "organization_id", label: "Organization ID", type: "text", required: false, placeholder: "org-••••••••" } as CredentialFieldDef,
    ],
  },
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
  const [iconUrl, setIconUrl] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [description, setDescription] = useState("");

  const [customFields, setCustomFields] = useState<CredentialFieldDef[]>([
    { id: "api_key", label: "API Key", type: "password", required: true, placeholder: "sk-••••••••" },
  ]);

  const [addInitialKey, setAddInitialKey] = useState(false);
  const [initialKeyName, setInitialKeyName] = useState("Primary Key");
  const [initialKeyEnv, setInitialKeyEnv] = useState("production");
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIconServer = useServerFn(uploadIconToGitHubFn);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.name.endsWith(".svg")) {
      toast.error("Format file harus berupa gambar atau SVG");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploadingIcon(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await uploadIconServer({
          data: {
            filename: file.name,
            base64Data,
          },
        });
        setIconUrl(res.cdnUrl);
        toast.success("Icon berhasil di-upload ke GitHub CDN");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal upload icon");
      } finally {
        setUploadingIcon(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Gagal membaca file gambar");
      setUploadingIcon(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setCredentialType(presetId);
    const found = CREDENTIAL_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomFields([...found.fields]);
    }
  };

  const handleAddField = () => {
    const num = customFields.length + 1;
    setCustomFields((prev) => [
      ...prev,
      {
        id: `field_${num}`,
        label: `Bidang ${num}`,
        type: "text",
        required: true,
        placeholder: "Nilai...",
      },
    ]);
  };

  const handleUpdateField = (idx: number, patch: Partial<CredentialFieldDef>) => {
    setCustomFields((prev) => {
      const copy = [...prev];
      const target = copy[idx];
      if (!target) return prev;
      copy[idx] = { ...target, ...patch };
      return copy;
    });
  };

  const handleRemoveField = (idx: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama provider wajib diisi");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug identifikasi wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      let initialKeyPayload: {
        name: string;
        environment: string;
        secret: string;
        metadata?: Record<string, unknown> | undefined;
      } | undefined = undefined;

      if (addInitialKey) {
        const primarySecret =
          initialValues["api_key"] ||
          initialValues["private_key"] ||
          initialValues["secret_access_key"] ||
          Object.values(initialValues)[0] ||
          "";

        if (!primarySecret.trim()) {
          toast.error("Wajib diisi");
          setSubmitting(false);
          return;
        }

        initialKeyPayload = {
          name: initialKeyName.trim() || `${name.trim()} Primary`,
          environment: initialKeyEnv,
          secret: primarySecret.trim(),
          metadata: {
            custom_values: initialValues,
            credential_type: credentialType,
          },
        };
      }

      await createProvider({
        data: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          category,
          credential_type: credentialType,
          website_url: websiteUrl.trim() || null,
          docs_url: docsUrl.trim() || null,
          icon_url: iconUrl.trim() || null,
          test_endpoint: apiEndpoint.trim() || null,
          description: description.trim() || null,
          custom_fields: customFields,
          initial_key: initialKeyPayload,
        },
      });

      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      navigate({
        to: "/providers/$slug",
        params: { slug: slug.trim().toLowerCase() },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/providers"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Daftar Provider Baru
            </h1>
            <p className="text-xs text-muted-foreground">
              Konfigurasi katalog integrasi API & skema kredensial kustom ke Neon.
            </p>
          </div>
        </div>

        {name && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-xs">
            <ProviderIcon
              name={name}
              slug={slug || "custom"}
              iconUrl={iconUrl || null}
              size="sm"
              className="size-6 rounded"
            />
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                {name}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                {slug}
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Layers className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Informasi Utama Provider
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider-name" className="text-xs font-medium">
                Nama Provider <span className="text-destructive">*</span>
              </Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nama"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider-slug" className="text-xs font-medium">
                Slug Identifikasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="provider-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="Slug"
                className="h-9 font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipe Skema Kredensial</Label>
              <Select value={credentialType} onValueChange={handlePresetSelect}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREDENTIAL_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs">
                    Custom Multi-Field Builder
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-desc" className="text-xs font-medium">
              Deskripsi Singkat
            </Label>
            <Textarea
              id="provider-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi"
              rows={2}
              className="resize-none text-xs"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Globe className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Dokumentasi & Endpoint API
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider-website" className="text-xs font-medium">
                Website URL
              </Label>
              <Input
                id="provider-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="URL"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider-docs" className="text-xs font-medium">
                Dokumentasi URL
              </Label>
              <Input
                id="provider-docs"
                type="url"
                value={docsUrl}
                onChange={(e) => setDocsUrl(e.target.value)}
                placeholder="Dokumentasi"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider-endpoint" className="text-xs font-medium">
                Base API URL (Opsional)
              </Label>
              <Input
                id="provider-endpoint"
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="Endpoint"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="provider-icon" className="text-xs font-medium">
                  Custom Icon URL (Opsional)
                </Label>
                {slug && (
                  <button
                    type="button"
                    onClick={() => setIconUrl(`https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`)}
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    Auto Icon ({slug})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="provider-icon"
                    type="url"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="h-9 text-xs pr-8 font-mono"
                  />
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => setIconUrl("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-sm leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingIcon}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                >
                  {uploadingIcon ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5" />
                      <span>Upload GitHub CDN</span>
                    </>
                  )}
                </Button>

                {iconUrl && (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card p-1.5 shadow-xs">
                    <img
                      src={iconUrl}
                      alt="Icon Preview"
                      className="size-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Unggah file icon (.svg, .png, .webp) otomatis ke storage GitHub ekasyarifmaulana10-crypto/PORTOFOLIO-assets dan dialirkan lewat jsDelivr CDN kecepatan tinggi.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Skema Bidang Kredensial (Form Fields)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Sesuaikan nama form kredensial untuk provider ini (misal Public Key, Private Key, Endpoint).
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddField}
              className="h-7 text-xs gap-1 font-medium active:scale-[0.98]"
            >
              <Plus className="size-3" />
              Tambah Bidang
            </Button>
          </div>

          <div className="space-y-2.5">
            {customFields.map((field, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5"
              >
                <div className="w-full sm:w-44 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Label Input
                  </span>
                  <Input
                    value={field.label}
                    onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                    placeholder="Label"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="w-full sm:w-36 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Key / ID
                  </span>
                  <Input
                    value={field.id}
                    onChange={(e) => handleUpdateField(idx, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    placeholder="Kunci"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="w-full sm:w-28 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Tipe Data
                  </span>
                  <Select
                    value={field.type}
                    onValueChange={(val: "text" | "password" | "url") => handleUpdateField(idx, { type: val })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password" className="text-xs">Password</SelectItem>
                      <SelectItem value="text" className="text-xs">Text</SelectItem>
                      <SelectItem value="url" className="text-xs">URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 w-full space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Placeholder
                  </span>
                  <Input
                    value={field.placeholder || ""}
                    onChange={(e) => handleUpdateField(idx, { placeholder: e.target.value })}
                    placeholder="Format"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 sm:self-end sm:mb-0.5 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateField(idx, { required: !field.required })}
                    className={`h-8 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                      field.required
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {field.required ? "Wajib" : "Opsional"}
                  </button>

                  {customFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      className="size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Hapus field"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Kunci Kredensial Awal (Opsional)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Simpan langsung kredensial pertama Anda saat mendaftarkan provider ini.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAddInitialKey((prev) => !prev)}
              className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                addInitialKey
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {addInitialKey ? "Kunci Diaktifkan" : "+ Masukkan Kunci Sekarang"}
            </button>
          </div>

          {addInitialKey && (
            <div className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nama Koneksi Kunci</Label>
                  <Input
                    value={initialKeyName}
                    onChange={(e) => setInitialKeyName(e.target.value)}
                    placeholder="Nama"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Environment</Label>
                  <Select value={initialKeyEnv} onValueChange={setInitialKeyEnv}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production" className="text-xs">Production</SelectItem>
                      <SelectItem value="staging" className="text-xs">Staging</SelectItem>
                      <SelectItem value="development" className="text-xs">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  Isian Kredensial ({name || "Provider"}):
                </p>
                {customFields.map((f) => {
                  const isPassword = f.type === "password";
                  const visible = Boolean(showValues[f.id]);
                  return (
                    <div key={f.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          {f.label} {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {f.id}
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type={isPassword && !visible ? "password" : "text"}
                          value={initialValues[f.id] || ""}
                          onChange={(e) =>
                            setInitialValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                          placeholder={f.placeholder || "Nilai"}
                          className="h-9 text-xs pr-9 font-mono"
                        />
                        {isPassword && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowValues((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                            }
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
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
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-medium"
          >
            <Link to="/providers">Batal</Link>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 px-5 text-xs font-semibold active:scale-[0.98]"
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
