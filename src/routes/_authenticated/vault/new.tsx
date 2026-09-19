import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  Sparkles,
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
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { getKeysListFn, createKeyFn } from "@/lib/neon-vault.functions";

type VaultNewSearch = { provider?: string | undefined };

export const Route = createFileRoute("/_authenticated/vault/new")({
  validateSearch: (search: Record<string, unknown>): VaultNewSearch => ({
    provider: typeof search['provider'] === "string" ? search['provider'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New Key · KeyVault" },
      { name: "description", content: "Add encrypted API key to vault." },
    ],
  }),
  component: NewKeyPage,
});

const ENVIRONMENTS = [
  { id: "production", label: "Production" },
  { id: "staging", label: "Staging" },
  { id: "development", label: "Development" },
] as const;

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
  const [showSecret, setShowSecret] = useState(false);

  const [providers, setProviders] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);

  const [name, setName] = useState("");
  const [providerId, setProviderId] = useState(search.provider ?? "");
  const [secret, setSecret] = useState("");
  const [environment, setEnvironment] = useState<"production" | "staging" | "development">("production");
  const [collectionId, setCollectionId] = useState("");
  const [actor, setActor] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchKeysList({ data: {} })
      .then((res) => {
        const provs = (res.providers || []) as Array<{ id: string; name: string; slug: string }>;
        const cols = (res.collections || []) as Array<{ id: string; name: string }>;
        setProviders(provs);
        setCollections(cols);

        if (!providerId && provs.length > 0 && provs[0]) {
          setProviderId(provs[0].id);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal memuat provider"))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateSecret = () => {
    const random = generateRandomKey();
    setSecret(random);
    setShowSecret(true);
    toast.success("Kunci acak dibuat");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama kunci wajib diisi");
      return;
    }
    if (!secret.trim()) {
      toast.error("Nilai secret wajib diisi");
      return;
    }
    if (!providerId) {
      toast.error("Pilih provider");
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
          provider_id: providerId,
          secret: secret.trim(),
          environment,
          collection_id: collectionId ? collectionId : null,
          actor: actor.trim() ? actor.trim() : null,
          tags: parsedTags,
          description: description.trim() ? description.trim() : null,
        },
      });

      toast.success("Kunci tersimpan");
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-providers-catalog"] });
      navigate({ to: "/vault/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProvider = providers.find((p) => p.id === providerId);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/vault"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kunci Baru</h1>
          <p className="text-xs text-muted-foreground">Simpan kredensial terenkripsi AES-256-GCM ke Neon</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Provider</Label>
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Pilih provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key-name" className="text-xs font-medium">Nama Kunci</Label>
          <Input
            id="key-name"
            placeholder="Production API Key"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="key-secret" className="text-xs font-medium">Nilai Secret</Label>
            <button
              type="button"
              onClick={handleGenerateSecret}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <Sparkles className="size-3" />
              Generate
            </button>
          </div>
          <div className="relative">
            <Input
              id="key-secret"
              type={showSecret ? "text" : "password"}
              placeholder="sk-proj-..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="h-9 pr-9 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Environment</Label>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/80 bg-muted/40 p-1">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setEnvironment(env.id)}
                className={`rounded-md py-1.5 text-xs font-medium transition-all active:scale-[0.98] ${
                  environment === env.id
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {env.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {collections.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Koleksi (Opsional)</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tanpa koleksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa koleksi</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="key-actor" className="text-xs font-medium">Consumer / Actor (Opsional)</Label>
            <Input
              id="key-actor"
              placeholder="claude-code"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key-tags" className="text-xs font-medium">Tags (pisahkan koma)</Label>
          <Input
            id="key-tags"
            placeholder="ai, production, vision"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key-desc" className="text-xs font-medium">Deskripsi</Label>
          <Textarea
            id="key-desc"
            placeholder="Catatan penggunaan kunci"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/vault" })}
            disabled={submitting}
            className="h-8 text-xs font-medium active:scale-[0.98]"
          >
            Batal
          </Button>
          <Button type="submit" disabled={submitting} className="h-8 text-xs font-medium active:scale-[0.98]">
            {submitting ? "Menyimpan…" : "Simpan Kunci"}
          </Button>
        </div>
      </form>
    </div>
  );
}
