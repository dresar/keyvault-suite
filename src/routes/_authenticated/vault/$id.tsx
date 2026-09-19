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
  Lock,
  RefreshCw,
  Save,
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
      { title: "Detail · KeyVault" },
      { name: "description", content: "Credential detail." },
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
      toast.success("Dibuka");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
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
      toast.error("Wajib diisi");
      return;
    }

    setRotating(true);
    try {
      await rotateSecret({
        data: { id, newSecret: rotateSecretInput.trim() },
      });
      toast.success("Dirotasi");
      setRotateSecretInput("");
      setShowRotateForm(false);
      setRevealedSecret(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      qc.invalidateQueries({ queryKey: ["neon-activity"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setRotating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama wajib");
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

      toast.success("Tersimpan");
      refetch();
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Hapus kunci ini?")) return;
    setDeleting(true);
    try {
      await deleteKey({ data: { id } });
      toast.success("Dihapus");
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      navigate({ to: "/vault" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
      setDeleting(false);
    }
  };

  if (isLoading || !data?.key) {
    return (
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/vault"
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
          </Link>
          <ProviderIcon
            name={String(keyData['provider_name'] || "")}
            slug={String(keyData['provider_slug'] || "")}
            iconUrl={keyData['icon_url'] as string | null}
            size="sm"
            className="size-7 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
              {String(keyData['name'] || "")}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                {String(keyData['provider_name'] || "")}
              </span>
              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 shrink-0">
                {String(keyData['secret_hint'] || "")}
              </Badge>
              <StatusBadge row={{ status: String(keyData['status'] || "active"), expires_at: null }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRotateForm((s) => !s)}
            className="h-7 text-[11px] font-medium gap-1 active:scale-[0.98]"
          >
            <RefreshCw className="size-3 text-primary" />
            Rotasi
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-7 text-[11px] font-medium gap-1 active:scale-[0.98]"
          >
            <Trash2 className="size-3" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold tracking-tight">Secret</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReveal}
            disabled={revealing}
            className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground px-2"
          >
            {revealedSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            {revealing ? "Memuat…" : revealedSecret ? "Tutup" : "Buka"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
          <code className="font-mono text-[11px] sm:text-xs font-medium break-all text-foreground min-w-0">
            {revealedSecret ? revealedSecret : "••••••••••••••••••••••••••••••"}
          </code>
          {revealedSecret && (
            <Button
              variant="outline"
              size="sm"
              onClick={copySecret}
              className="shrink-0 h-6 text-[11px] gap-1 px-2"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "OK" : "Salin"}
            </Button>
          )}
        </div>
      </div>

      {showRotateForm && (
        <form onSubmit={handleRotate} className="rounded-xl border border-primary/40 bg-primary/5 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold tracking-tight">Rotasi Secret</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rotate-secret" className="text-[11px] font-medium">Secret baru</Label>
            <Input
              id="rotate-secret"
              type="password"
              placeholder="Secret"
              value={rotateSecretInput}
              onChange={(e) => setRotateSecretInput(e.target.value)}
              required
              className="h-8 font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRotateForm(false)}
              disabled={rotating}
              className="h-7 text-[11px] font-medium"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={rotating}
              className="h-7 text-[11px] font-medium gap-1"
            >
              <RefreshCw className={`size-3 ${rotating ? "animate-spin" : ""}`} />
              {rotating ? "Memproses…" : "Terapkan"}
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={handleUpdate} className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs space-y-3.5">
        <h2 className="text-xs font-semibold tracking-tight border-b border-border/60 pb-2.5">
          Konfigurasi
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="key-name" className="text-[11px] font-medium">Nama</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nama"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Koleksi</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih" />
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="key-actor" className="text-[11px] font-medium">Consumer</Label>
            <Input
              id="key-actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Actor"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="key-tags" className="text-[11px] font-medium">Tags</Label>
            <Input
              id="key-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, prod"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="key-desc" className="text-[11px] font-medium">Deskripsi</Label>
          <Textarea
            id="key-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="key-notes" className="text-[11px] font-medium">Catatan</Label>
          <Textarea
            id="key-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border/60">
          <Button
            type="submit"
            disabled={saving}
            className="h-7 text-[11px] font-medium gap-1 active:scale-[0.98]"
          >
            <Save className="size-3" />
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>

      {versions.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs space-y-2.5">
          <div className="flex items-center gap-1.5">
            <History className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold tracking-tight">Riwayat</h2>
          </div>

          <div className="divide-y divide-border">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 shrink-0">
                    v{v.version}
                  </Badge>
                  <span className="font-mono text-muted-foreground truncate">{v.secret_hint}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1 py-0 h-4 shrink-0 ${
                      v.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {v.status}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {new Date(v.created_at).toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
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
