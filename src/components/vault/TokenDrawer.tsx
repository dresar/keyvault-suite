import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createApiToken } from "@/lib/tokens.functions";
import { collectionsQuery, providersQuery } from "@/lib/queries";
import { ENVIRONMENTS, TOKEN_PERMISSIONS } from "@/lib/vault-constants";

export function TokenDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createApiToken);
  const { data: providers = [] } = useQuery(providersQuery);
  const { data: collections = [] } = useQuery(collectionsQuery);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["keys.list", "keys.random"]);
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [allowedEnvironments, setAllowedEnvironments] = useState<string[]>([]);
  const [allowedCollections, setAllowedCollections] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState(600);
  const [expiresAt, setExpiresAt] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const mutation = useMutation({
    mutationFn: async () =>
      create({
        data: {
          name,
          description: description || null,
          permissions,
          allowed_providers: allowedProviders,
          allowed_environments: allowedEnvironments,
          allowed_collections: allowedCollections,
          rate_limit_per_hour: rateLimit,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
      }),
    onSuccess: (res) => {
      setIssued(res.token);
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setIssued(null);
      setName("");
      setDescription("");
      setCopied(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>{issued ? "Access token created" : "Create access token"}</SheetTitle>
          <SheetDescription>
            {issued
              ? "Copy it now — it is stored hashed and cannot be shown again."
              : "Grant only the permissions the consumer needs."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {issued ? (
            <div className="space-y-3">
              <code className="block break-all rounded-md border border-border bg-muted/50 p-3 font-mono text-xs">
                {issued}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(issued);
                  setCopied(true);
                  toast.success("Copied to clipboard");
                }}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                Copy token
              </Button>
              <p className="text-xs text-muted-foreground">
                Store this in your backend environment only — never in frontend code, a public
                prompt, or a Git repository.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Token name</Label>
                <Input
                  id="t-name"
                  placeholder="AI Worker"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-desc">Description</Label>
                <Textarea
                  id="t-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TOKEN_PERMISSIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={permissions.includes(p)}
                        onCheckedChange={() => toggle(permissions, p, setPermissions)}
                      />
                      <span className="font-mono text-xs">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed providers</Label>
                <p className="text-xs text-muted-foreground">
                  Leave empty to allow every provider in your vault.
                </p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {providers.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={allowedProviders.includes(p.slug)}
                        onCheckedChange={() =>
                          toggle(allowedProviders, p.slug, setAllowedProviders)
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed environments</Label>
                <div className="flex flex-wrap gap-3">
                  {ENVIRONMENTS.map((e) => (
                    <label key={e} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={allowedEnvironments.includes(e)}
                        onCheckedChange={() =>
                          toggle(allowedEnvironments, e, setAllowedEnvironments)
                        }
                      />
                      {e}
                    </label>
                  ))}
                </div>
              </div>

              {collections.length > 0 ? (
                <div className="space-y-2">
                  <Label>Allowed collections</Label>
                  <div className="flex flex-wrap gap-3">
                    {collections.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedCollections.includes(c.name)}
                          onCheckedChange={() =>
                            toggle(allowedCollections, c.name, setAllowedCollections)
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="t-rate">Rate limit (requests/hour)</Label>
                  <Input
                    id="t-rate"
                    type="number"
                    min={10}
                    max={10000}
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-exp">Expires</Label>
                  <Input
                    id="t-exp"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          {issued ? (
            <Button onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !name.trim() || permissions.length === 0}
              >
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create token
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
