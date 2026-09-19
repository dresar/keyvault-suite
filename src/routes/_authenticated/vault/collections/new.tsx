import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCollectionFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/collections/new")({
  head: () => ({
    meta: [
      { title: "New Collection · KeyVault" },
      { name: "description", content: "Group keys into collections." },
    ],
  }),
  component: NewCollectionPage,
});

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

function NewCollectionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createCollection = useServerFn(createCollectionFn);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama koleksi wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      await createCollection({
        data: {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          color,
        },
      });

      toast.success("Koleksi dibuat");
      qc.invalidateQueries({ queryKey: ["neon-keys"] });
      qc.invalidateQueries({ queryKey: ["neon-dashboard"] });
      navigate({ to: "/vault" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/vault"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Koleksi Baru</h1>
          <p className="text-xs text-muted-foreground">Kelompokkan kredensial vault ke dalam kategori atau project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="col-name" className="text-xs font-medium">Nama Koleksi</Label>
          <Input
            id="col-name"
            placeholder="Infrastructure Production"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="col-desc" className="text-xs font-medium">Deskripsi</Label>
          <Textarea
            id="col-desc"
            placeholder="Deskripsi tujuan koleksi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Warna Label</Label>
          <div className="flex flex-wrap items-center gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className="size-7 rounded-full transition-transform active:scale-95 flex items-center justify-center shadow-xs"
              >
                {color === c && <Check className="size-3.5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
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
            {submitting ? "Menyimpan…" : "Simpan Koleksi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
