import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, setAuthSession } from "@/hooks/useAuth";
import { loginFn } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · KeyVault" },
      {
        name: "description",
        content: "Sign in to KeyVault, your private API key and credential vault.",
      },
      { property: "og:title", content: "Sign in · KeyVault" },
      {
        property: "og:description",
        content: "Private, encrypted storage for your API keys and credentials.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await loginFn({
        data: { email, password },
      });
      if (res?.success && res?.user && res?.token) {
        setAuthSession(res.user, res.token);
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        throw new Error("Login failed");
      }
    } catch (err) {
      toast.error((err as Error).message || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-surface flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">KeyVault</p>
            <p className="text-xs text-muted-foreground">Private credential vault</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h1 className="text-lg font-semibold tracking-tight">Personal Sign in</h1>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to unlock your vault.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Secrets are encrypted server-side in Neon Postgres. Only you can access your vault.
        </p>
      </div>
    </div>
  );
}
