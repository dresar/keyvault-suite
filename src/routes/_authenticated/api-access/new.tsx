import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Copy, KeyRound, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createApiTokenFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/api-access/new")({
  head: () => ({
    meta: [
      { title: "New Token · KeyVault" },
      { name: "description", content: "Create an API access token." },
    ],
  }),
  component: NewTokenPage,
});

const PERMISSIONS = [
  { id: "read:keys", label: "Read Keys", desc: "View decrypted credentials" },
  { id: "use:keys", label: "Use Keys", desc: "Proxy requests through vault" },
  { id: "manage:keys", label: "Manage Keys", desc: "Create, rotate, and revoke" },
  { id: "audit:read", label: "Read Audits", desc: "View activity logs" },
];

const ENVIRONMENTS = [
  { id: "production", label: "Production" },
  { id: "staging", label: "Staging" },
  { id: "development", label: "Development" },
];

function NewTokenPage() {
  const navigate = useNavigate();
  const createToken = useServerFn(createApiTokenFn);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rateLimit, setRateLimit] = useState(600);
  const [permissions, setPermissions] = useState<string[]>(["read:keys", "use:keys"]);
  const [environments, setEnvironments] = useState<string[]>(["production", "development"]);
  const [busy, setBusy] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleEnvironment = (id: string) => {
    setEnvironments((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    if (permissions.length === 0) {
      toast.error("Select permission");
      return;
    }

    try {
      setBusy(true);
      const res = await createToken({
        data: {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          permissions,
          allowed_environments: environments,
          rate_limit_per_hour: Number(rateLimit) || 600,
        },
      });
      setCreatedToken(res.token);
      toast.success("Token generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setBusy(false);
    }
  };

  const copyToken = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdToken) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-emerald-500/30 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-500">
            <Sparkles className="size-6" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Token Created</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Copy your token now. It will never be displayed again.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-muted/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-xs sm:text-sm font-semibold break-all text-foreground">
                {createdToken}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToken}
                className="shrink-0 gap-1.5"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              onClick={() => navigate({ to: "/api-access" })}
              className="px-6"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/api-access"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Token</h1>
          <p className="text-sm text-muted-foreground">Generate programmatic API access token</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="token-name">Name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="CLI"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token-desc">Description</Label>
          <Input
            id="token-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Production"
          />
        </div>

        <div className="space-y-3">
          <Label>Permissions</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((perm) => (
              <label
                key={perm.id}
                className="flex items-start gap-2.5 rounded-lg border border-border p-3 hover:bg-muted/40 cursor-pointer"
              >
                <Checkbox
                  checked={permissions.includes(perm.id)}
                  onCheckedChange={() => togglePermission(perm.id)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium leading-none">{perm.label}</div>
                  <div className="text-xs text-muted-foreground">{perm.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Environments</Label>
          <div className="flex flex-wrap gap-4">
            {ENVIRONMENTS.map((env) => (
              <label
                key={env.id}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={environments.includes(env.id)}
                  onCheckedChange={() => toggleEnvironment(env.id)}
                />
                <span>{env.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate-limit">Rate Limit (req/hour)</Label>
          <Input
            id="rate-limit"
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            placeholder="600"
            min={10}
            max={100000}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/api-access" })}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Generating…" : "Generate"}
          </Button>
        </div>
      </form>
    </div>
  );
}
