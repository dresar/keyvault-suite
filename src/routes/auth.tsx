import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
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
          {sent ? (
            <div className="space-y-3 text-sm">
              <h1 className="text-base font-semibold">Confirm your email</h1>
              <p className="text-muted-foreground">
                We sent a confirmation link to <span className="font-medium">{email}</span>. Open it
                to activate your vault, then sign in.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              {mode === "signin" ? (
                <button
                  onClick={forgot}
                  className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              ) : null}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Secrets are encrypted server-side. Only you can read your vault.
        </p>
      </div>
    </div>
  );
}
