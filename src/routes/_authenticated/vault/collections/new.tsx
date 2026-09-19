import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCollectionFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/collections/new")({
  head: () => ({
    meta: [{ title: "Koleksi Baru · KeyVault" }],
  }),
  component: NewCollectionPage,
});

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function NewCollectionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await createCollectionFn({
        data: {
          name: name.trim(),
          description: description.trim() || null,
          color: color || null,
        },
      });
      toast.success("Koleksi dibuat!");
      navigate({ to: "/vault" });
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
          <Link to="/vault">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Koleksi Baru</h1>
          <p className="text-xs text-muted-foreground">Kelompokkan kunci kredensial Anda.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="colName">Nama</Label>
          <Input
            id="colName"
            placeholder="Nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="colDesc">Deskripsi</Label>
          <Textarea
            id="colDesc"
            placeholder="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Warna</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`size-7 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button variant="outline" type="button" asChild>
            <Link to="/vault">Batal</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
