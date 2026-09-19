import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
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
import { rotateSecret } from "@/lib/vault.functions";

export function RotateDrawer({
  open,
  onOpenChange,
  keyId,
  keyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyId: string;
  keyName: string;
}) {
  const qc = useQueryClient();
  const rotate = useServerFn(rotateSecret);
  const [secret, setSecret] = useState("");
  const [revokePrevious, setRevokePrevious] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await rotate({ data: { id: keyId, secret, revoke_previous: revokePrevious } });
      toast.success(`Rotated to version ${res.version}`);
      setSecret("");
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["key", keyId] });
      qc.invalidateQueries({ queryKey: ["versions", keyId] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Rotate secret</SheetTitle>
          <SheetDescription>{keyName}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="rotate-secret">New secret</Label>
            <Input
              id="rotate-secret"
              type="password"
              autoComplete="off"
              className="font-mono"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Revoke previous version</p>
              <p className="text-xs text-muted-foreground">
                Old versions stay recorded but can no longer be served.
              </p>
            </div>
            <Switch checked={revokePrevious} onCheckedChange={setRevokePrevious} />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !secret.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Rotate
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
