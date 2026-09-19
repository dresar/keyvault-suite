import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportVault } from "@/lib/vault.functions";

export function ExportDrawer({
  open,
  onOpenChange,
  selectedIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds?: string[];
}) {
  const runExport = useServerFn(exportVault);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await runExport({
        data: {
          format,
          include_secrets: includeSecrets,
          ...(selectedIds?.length ? { ids: selectedIds } : {}),
          ...(includeSecrets ? { password } : {}),
        },
      });
      const blob = new Blob([res.content], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
      setPassword("");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Export vault</SheetTitle>
          <SheetDescription>
            {selectedIds?.length
              ? `${selectedIds.length} selected credential(s).`
              : "All credentials in your vault."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Include secrets</p>
              <p className="text-xs text-muted-foreground">
                Off exports metadata only, with no credential values.
              </p>
            </div>
            <Switch checked={includeSecrets} onCheckedChange={setIncludeSecrets} />
          </div>

          {includeSecrets ? (
            <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
              <p className="flex items-start gap-2 text-xs text-destructive">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                This file will contain decrypted credentials in plain text. Store it in an encrypted
                location and delete it when you are done.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="export-pass">Confirm your account password</Label>
                <Input
                  id="export-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={download} disabled={busy || (includeSecrets && password.length === 0)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
