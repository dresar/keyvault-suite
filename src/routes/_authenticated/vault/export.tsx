import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { exportVaultDataFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/vault/export")({
  head: () => ({
    meta: [
      { title: "Export · KeyVault" },
      { name: "description", content: "Export vault credentials and schema." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const navigate = useNavigate();
  const exportVault = useServerFn(exportVaultDataFn);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      setBusy(true);
      const data = await exportVault();

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `keyvault-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const keys = (data.keys || []) as Array<Record<string, unknown>>;
        const headers = ["name", "environment", "status", "secret_hint", "description", "created_at"];
        const rows = keys.map((k) =>
          headers.map((h) => `"${String(k[h] ?? "").replace(/"/g, '""')}"`).join(",")
        );
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `keyvault-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success("Downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/vault"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export Vault</h1>
          <p className="text-sm text-muted-foreground">Download credential metadata and collections</p>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Label>Format</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                format === "json"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <FileJson className="size-5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-medium">JSON</div>
                <div className="text-xs text-muted-foreground">Full schema & metadata</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                format === "csv"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <FileSpreadsheet className="size-5 shrink-0 text-emerald-500" />
              <div>
                <div className="text-sm font-medium">CSV</div>
                <div className="text-xs text-muted-foreground">Spreadsheet table</div>
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Exported files include credential metadata, environments, tags, and secret hints. Raw decrypted secret tokens remain securely encrypted on the server.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/vault" })}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy} className="gap-1.5">
            <Download className="size-4" />
            {busy ? "Exporting…" : "Download"}
          </Button>
        </div>
      </div>
    </div>
  );
}
