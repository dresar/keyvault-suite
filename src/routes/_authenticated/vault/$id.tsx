import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { StatusBadge } from "@/components/vault/StatusBadge";
import {
  getKeyDetailFn,
  revealKeySecretFn,
  rotateKeySecretFn,
  updateKeyFn,
  deleteKeyFn,
} from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/$id")({
  head: () => ({
    meta: [
      { title: "Detail Kunci · KeyVault" },
      { name: "description", content: "Manage and rotate credential." },
    ],
  }),
  component: KeyDetailPage,
});

function KeyDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(getKeyDetailFn);
  const revealSecret = useServerFn(revealKeySecretFn);
  const rotateSecret = useServerFn(rotateKeySecretFn);
  const updateKey = useServerFn(updateKeyFn);
  const deleteKey = useServerFn(deleteKeyFn);

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const [rotateSecretInput, setRotateSecretInput] = useState("");
  const [rotating, setRotating] = useState(false);
  const [showRotateForm, setShowRotateForm] = useState(false);

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [collectionId, setCollectionId] = useState("");
  const [actor, setActor] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["neon-key-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  useEffect(() => {
    if (data && data.key) {
      const k = data.key as Record<string, unknown>;
      setName(typeof k['name'] === "string" ? k['name'] : "");
      setEnvironment(typeof k['environment'] === "string" ? k['environment'] : "production");
      setCollectionId(typeof k['collection_id'] === "string" ? k['collection_id'] : "");
      setActor(typeof k['actor'] === "string" ? k['actor'] : "");
      setTags(Array.isArray(k['tags']) ? (k['tags'] as string[]).join(", ") : "");
      setDescription(typeof k['description'] === "string" ? k['description'] : "");
      setNotes(typeof k['notes'] === "string" ? k['notes'] : "");
      setStatus(typeof k['status'] === "string" ? k['status'] : "active");
    }
  }, [data]);

  const handleReveal = async () => {
    if (revealedSecret) {
      setRevealedSecret(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await revealSecret({ data: { id } });
      setRevealedSecret(res.secret);
      toast.success("Secret dibuka");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka secret");
    } finally {
      setRevealing(false);
    }
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopied(true);
    toast.success("Tersalin");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotateSecretInput.trim()) {
      toast.error("Secret baru wajib diisi");
      return;
    }

    setRotating(true);
    try {
      await rotateSecret({
        data: { id, newSecret: rotateSecretInput.trim() },
      });
      toast.success("Secret berhasil dirotasi");
      setRotateSecretInput("");
      setShowRotateForm(false);
      setRevealedSecret(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-activity"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal rotasi");
    } finally {
      setRotating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await updateKey({
        data: {
          id,
          name: name.trim(),
          environment,
          collection_id: collectionId ? collectionId : null,
          actor: actor.trim() ? actor.trim() : null,
          tags: parsedTags,
          description: description.trim() ? description.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
          status,
        },
      });

      toast.success("Perubahan tersimpan");
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Hapus kunci ini dari vault?")) return;
    setDeleting(true);
    try {
      await deleteKey({ data: { id } });
      toast.success("Kunci dihapus");
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      navigate({ to: "/vault" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
      setDeleting(false);
    }
  };

  if (isLoading || !data?.key) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  const keyData = data.key as Record<string, unknown>;
  const versions = (data.versions ?? []) as Array<{
    id: string;
    version: number;
    secret_hint: string;
    status: string;
    created_at: string;
  }>;
  const collections = (data.collections ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/vault"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            <ProviderIcon
              name={String(keyData['provider_name'] || "")}
              slug={String(keyData['provider_slug'] || "")}
              iconUrl={keyData['icon_url'] as string | null}
              className="size-8"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {String(keyData['name'] || "")}
                </h1>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {String(keyData['secret_hint'] || "")}
                </Badge>
                <StatusBadge row={{ status: String(keyData['status'] || "active"), expires_at: null }} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {String(keyData['provider_name'] || "")} • Versi {Number(keyData['version'] || 1)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRotateForm((s) => !s)}
            className="h-8 text-xs font-medium gap-1.5 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5 text-primary" />
            Rotasi Secret
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 text-xs font-medium gap-1.5 active:scale-[0.98]"
          >
            <Trash2 className="size-3.5" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Kredensial Rahasia</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReveal}
            disabled={revealing}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            {revealedSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {revealing ? "Membuka…" : revealedSecret ? "Sembunyikan" : "Buka Secret"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <code className="font-mono text-xs sm:text-sm font-medium break-all text-foreground">
            {revealedSecret ? revealedSecret : "••••••••••••••••••••••••••••••••••••••••"}
          </code>
          {revealedSecret && (
            <Button
              variant="outline"
              size="sm"
              onClick={copySecret}
              className="shrink-0 h-7 text-xs gap-1.5"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          )}
        </div>
      </div>

      {showRotateForm && (
        <form onSubmit={handleRotate} className="rounded-xl border border-primary/40 bg-primary/5 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Rotasi Nilai Secret</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Memasukkan secret baru akan menyimpan versi baru ke vault dan menonaktifkan secret sebelumnya secara aman.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="rotate-secret" className="text-xs font-medium">Nilai Secret Baru</Label>
            <Input
              id="rotate-secret"
              type="password"
              placeholder="sk-proj-new-secret..."
              value={rotateSecretInput}
              onChange={(e) => setRotateSecretInput(e.target.value)}
              required
              className="h-9 font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRotateForm(false)}
              disabled={rotating}
              className="h-8 text-xs font-medium"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={rotating}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <RefreshCw className={`size-3 ${rotating ? "animate-spin" : ""}`} />
              {rotating ? "Memproses…" : "Terapkan Rotasi"}
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={handleUpdate} className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold tracking-tight border-b border-border/60 pb-3">
          Informasi & Konfigurasi Kunci
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="key-name" className="text-xs font-medium">Nama Kunci</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status Kunci</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Koleksi</Label>
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="key-actor" className="text-xs font-medium">Consumer / Actor</Label>
            <Input
              id="key-actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="claude-code-cli"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="key-tags" className="text-xs font-medium">Tags (koma)</Label>
            <Input
              id="key-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, prod"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key-desc" className="text-xs font-medium">Deskripsi</Label>
          <Textarea
            id="key-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key-notes" className="text-xs font-medium">Catatan Teknis</Label>
          <Textarea
            id="key-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button
            type="submit"
            disabled={saving}
            className="h-8 text-xs font-medium gap-1.5 active:scale-[0.98]"
          >
            <Save className="size-3.5" />
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        </div>
      </form>

      {versions.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Riwayat Versi Kunci</h2>
          </div>

          <div className="divide-y divide-border">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    v{v.version}
                  </Badge>
                  <span className="font-mono text-muted-foreground">{v.secret_hint}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      v.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {v.status}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(v.created_at).toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
