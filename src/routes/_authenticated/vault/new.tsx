import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getKeysListFn, createKeyFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/new")({
  head: () => ({
    meta: [{ title: "Kunci Baru · KeyVault" }],
  }),
  component: NewKeyPage,
});

function NewKeyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [secret, setSecret] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [collectionId, setCollectionId] = useState("");
  const [actor, setActor] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getKeysListFn({ data: {} })
      .then((res) => {
        const provs = (res.providers || []) as Array<{ id: string; name: string; slug: string }>;
        const cols = (res.collections || []) as Array<{ id: string; name: string }>;
        setProviders(provs);
        setCollections(cols);
        if (provs.length > 0 && provs[0]) {
          setProviderId(provs[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !secret.trim() || !providerId) {
      toast.error("Form belum lengkap");
      return;
    }

    setSubmitting(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await createKeyFn({
        data: {
          name: name.trim(),
          provider_id: providerId,
          secret: secret.trim(),
          environment,
          collection_id: collectionId || null,
          actor: actor.trim() || null,
          tags: parsedTags,
          description: description.trim() || null,
          notes: notes.trim() || null,
        },
      });

      toast.success("Berhasil dibuat!");
      navigate({ to: "/vault/$id", params: { id: res.id } });
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/vault">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kunci Baru</h1>
          <p className="text-xs text-muted-foreground">Simpan kredensial terenkripsi ke vault.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama</Label>
          <Input
            id="name"
            placeholder="Nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="provider">Provider</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Pilih" />
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
            <Label htmlFor="env">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger id="env">
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secret">Secret</Label>
          <Input
            id="secret"
            type="password"
            placeholder="Secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="collection">Koleksi</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger id="collection">
                <SelectValue placeholder="Tanpa koleksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tanpa koleksi</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actor">Actor</Label>
            <Input
              id="actor"
              placeholder="Actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Deskripsi</Label>
          <Textarea
            id="desc"
            placeholder="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Catatan</Label>
          <Textarea
            id="notes"
            placeholder="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" type="button" asChild>
            <Link to="/vault">Batal</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
