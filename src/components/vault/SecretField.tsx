import { useState } from "react";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { revealSecret } from "@/lib/vault.functions";

export function SecretField({ keyId, hint }: { keyId: string; hint: string }) {
  const reveal = useServerFn(revealSecret);
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState<"reveal" | "copy" | null>(null);

  async function handleReveal() {
    if (value) {
      setValue(null);
      return;
    }
    setBusy("reveal");
    try {
      const res = await reveal({ data: { id: keyId, reason: "reveal" } });
      setValue(res.secret);
    } catch {
      toast.error("Could not reveal this credential");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    setBusy("copy");
    try {
      const res = await reveal({ data: { id: keyId, reason: "copy" } });
      await navigator.clipboard.writeText(res.secret);
      toast.success("Copied to clipboard", {
        description: "Clipboard clears automatically in 45 seconds.",
      });
      window.setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => undefined);
      }, 45_000);
    } catch {
      toast.error("Could not copy this credential");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs">
        {value ?? `${hint ? hint.split("…")[0] : ""}••••••••••••`}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={handleReveal} disabled={busy !== null}>
        {busy === "reveal" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : value ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
        {value ? "Hide" : "Reveal"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={busy !== null}>
        {busy === "copy" ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
        Copy
      </Button>
    </div>
  );
}
