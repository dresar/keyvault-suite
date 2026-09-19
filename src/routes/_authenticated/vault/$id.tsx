import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  History,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getKeyDetailFn,
  revealKeySecretFn,
  rotateKeySecretFn,
  updateKeyFn,
  deleteKeyFn,
} from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/$id")({
  head: () => ({
    meta: [{ title: "Detail Kunci · KeyVault" }],
  }),
  component: KeyDetailPage,
});

function KeyDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

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

  function loadDetail() {
    getKeyDetailFn({ data: { id } })
      .then((res) => {
        setData(res);
        const k = (res.key || {}) as Record<string, unknown>;
        setName(typeof k['name'] === "string" ? k['name'] : "");
        setEnvironment(typeof k['environment'] === "string" ? k['environment'] : "production");
        setCollectionId(typeof k['collection_id'] === "string" ? k['collection_id'] : "");
        setActor(typeof k['actor'] === "string" ? k['actor'] : "");
        setTags(Array.isArray(k['tags']) ? (k['tags'] as string[]).join(", ") : "");
        setDescription(typeof k['description'] === "string" ? k['description'] : "");
        setNotes(typeof k['notes'] === "string" ? k['notes'] : "");
        setStatus(typeof k['status'] === "string" ? k['status'] : "active");
      })
      .catch((err) => {
        toast.error(err.message || "Gagal memuat");
        navigate({ to: "/vault" });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function handleReveal() {
    if (revealedSecret) {
      setRevealedSecret(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await revealKeySecretFn({ data: { id } });
      setRevealedSecret(res.secret);
      toast.success("Secret dibuka!");
    } catch (err) {
      toast.error((err as Error).message || "Gagal membuka");
    } finally {
      setRevealing(false);
    }
  }

  async function handleCopy() {
    try {
      let val = revealedSecret;
      if (!val) {
        const res = await revealKeySecretFn({ data: { id } });
        val = res.secret;
        setRevealedSecret(val);
      }
      await navigator.clipboard.writeText(val);
      setCopied(true);
      toast.success("Disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  async function handleRotate(e: React.FormEvent) {
    e.preventDefault();
    if (!rotateSecretInput.trim()) return;
    setRotating(true);
    try {
      await rotateKeySecretFn({
        data: { id, newSecret: rotateSecretInput.trim() },
      });
      toast.success("Kunci dirotasi!");
      setRotateSecretInput("");
      setShowRotateForm(false);
      setRevealedSecret(null);
      loadDetail();
    } catch (err) {
      toast.error((err as Error).message || "Gagal rotasi");
    } finally {
      setRotating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await updateKeyFn({
        data: {
          id,
          name: name.trim(),
          environment,
          collection_id: collectionId || null,
          actor: actor.trim() || null,
          tags: parsedTags,
          description: description.trim() || null,
          notes: notes.trim() || null,
          status,
        },
      });
      toast.success("Tersimpan!");
      loadDetail();
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Hapus kunci ini?")) return;
    setDeleting(true);
    try {
      await deleteKeyFn({ data: { id } });
      toast.success("Dihapus!");
      navigate({ to: "/vault" });
    } catch (err) {
      toast.error((err as Error).message || "Gagal menghapus");
      setDeleting(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const k = data.key;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vault">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{k.name}</h1>
              <Badge variant={k.status === "active" ? "default" : "secondary"}>
                {k.status}
              </Badge>
              <Badge variant="outline">{k.environment}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{k.provider_name} · Versi {k.version}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Hapus
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-sm font-medium">Kredensial</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReveal}
              disabled={revealing}
            >
              {revealedSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {revealedSecret ? "Sembunyikan" : "Buka"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Salin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRotateForm(!showRotateForm)}
            >
              <RefreshCw className="size-3.5" />
              Rotasi
            </Button>
          </div>
        </div>

        <div className="rounded-md bg-muted/60 p-3 font-mono text-sm break-all">
          {revealedSecret ? (
            <span className="text-foreground">{revealedSecret}</span>
          ) : (
            <span className="text-muted-foreground">{k.secret_hint || "••••••••••••••••••••"}</span>
          )}
        </div>

        {showRotateForm && (
          <form onSubmit={handleRotate} className="rounded-md border p-4 space-y-3 bg-background">
            <h2 className="text-sm font-semibold">Rotasi Kunci</h2>
            <div className="space-y-1.5">
              <Label htmlFor="newSecret">Secret</Label>
              <Input
                id="newSecret"
                type="password"
                placeholder="Secret"
                value={rotateSecretInput}
                onChange={(e) => setRotateSecretInput(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowRotateForm(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={rotating}>
                {rotating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Konfirmasi
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold">Pengaturan</h2>

            <div className="space-y-1.5">
              <Label htmlFor="editName">Nama</Label>
              <Input
                id="editName"
                placeholder="Nama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="editEnv">Environment</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger id="editEnv">
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
                <Label htmlFor="editStatus">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="editStatus">
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
                <Label htmlFor="editCol">Koleksi</Label>
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger id="editCol">
                    <SelectValue placeholder="Tanpa koleksi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tanpa koleksi</SelectItem>
                    {data.collections.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editActor">Actor</Label>
                <Input
                  id="editActor"
                  placeholder="Actor"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editTags">Tags</Label>
              <Input
                id="editTags"
                placeholder="Tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editDesc">Deskripsi</Label>
              <Textarea
                id="editDesc"
                placeholder="Deskripsi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editNotes">Catatan</Label>
              <Textarea
                id="editNotes"
                placeholder="Catatan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Simpan
              </Button>
            </div>
          </form>

          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Riwayat</h2>
            </div>
            {data.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada versi.</p>
            ) : (
              <div className="divide-y text-xs">
                {data.versions.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium">Versi {v.version}</p>
                      <p className="font-mono text-muted-foreground">{v.secret_hint || "••••"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={v.status === "active" ? "default" : "secondary"}>
                        {v.status}
                      </Badge>
                      <p className="text-muted-foreground mt-0.5">
                        {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-semibold">Metadata</h2>
            <div className="space-y-2">
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium">{k.provider_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Penggunaan</p>
                <p className="font-medium">{k.usage_count || 0} kali</p>
              </div>
              <div>
                <p className="text-muted-foreground">Terakhir Digunakan</p>
                <p className="font-medium">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Belum pernah"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Dibuat</p>
                <p className="font-medium">{new Date(k.created_at).toLocaleString()}</p>
              </div>
            </div>

            {k.website_url && (
              <div className="pt-2 border-t">
                <a
                  href={k.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Website
                </a>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold">Audit</h2>
            {data.audits.length === 0 ? (
              <p className="text-xs text-muted-foreground">Kosong</p>
            ) : (
              <div className="space-y-2 text-xs">
                {data.audits.map((a: any) => (
                  <div key={a.id} className="border-b pb-2 last:border-0">
                    <p className="font-medium">{a.action}</p>
                    <p className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
