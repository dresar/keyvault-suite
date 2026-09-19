import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Delete,
  KeyRound,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { verifySecurityPinFn } from "@/lib/neon-vault.functions";

type PinSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/pin")({
  validateSearch: (search: Record<string, unknown>): PinSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verifikasi PIN Keamanan · KeyVault" },
      { name: "description", content: "Masukkan 6 digit PIN pengaman sesi vault." },
    ],
  }),
  component: PinVerificationPage,
});

function PinVerificationPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const verifyPin = useServerFn(verifySecurityPinFn);

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isVerified = sessionStorage.getItem("keyvault_pin_verified") === "true";
      if (isVerified && user) {
        navigate({ to: search.redirect || "/dashboard", replace: true });
      }
    }
  }, [user, navigate, search.redirect]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (candidatePin: string) => {
    if (candidatePin.length !== 6) {
      setErrorMsg("PIN harus terdiri dari 6 digit angka");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      await verifyPin({ data: { pin: candidatePin } });
      sessionStorage.setItem("keyvault_pin_verified", "true");
      sessionStorage.setItem("keyvault_pin_time", Date.now().toString());
      toast.success("PIN Keamanan terverifikasi");
      navigate({ to: search.redirect || "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PIN salah";
      setErrorMsg(msg);
      toast.error(msg);
      setPin("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 6) {
      handleVerify(pin);
    }
  };

  const handleDigitClick = (num: string) => {
    if (pin.length < 6) {
      const next = pin + num;
      setPin(next);
      setErrorMsg("");
      if (next.length === 6) {
        handleVerify(next);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const handleFillDefault = () => {
    setPin("280219");
    setErrorMsg("");
    handleVerify("280219");
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Lock className="size-6" />
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background border border-border text-emerald-500">
              <ShieldCheck className="size-3.5" />
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Autentikasi PIN Keamanan
            </h1>
            <p className="text-xs text-muted-foreground">
              Sesi terenkripsi. Masukkan 6 digit PIN untuk membuka brankas kunci.
            </p>
          </div>

          {user?.email && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">{user.name || "Owner"}</span>
              <span>({user.email})</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPin(val);
              setErrorMsg("");
              if (val.length === 6) {
                handleVerify(val);
              }
            }}
            onKeyDown={handleKeyDown}
            className="sr-only"
            autoFocus
          />

          <div
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center gap-2.5 cursor-pointer py-1"
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const hasVal = pin.length > idx;
              const isCurrent = pin.length === idx;
              return (
                <div
                  key={idx}
                  className={`flex size-11 items-center justify-center rounded-xl border text-sm font-mono transition-all ${
                    hasVal
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-105"
                      : isCurrent
                      ? "border-ring bg-background shadow-xs ring-2 ring-ring/30"
                      : "border-border/80 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {hasVal ? "•" : ""}
                </div>
              );
            })}
          </div>

          {errorMsg ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-destructive animate-shake">
              <ShieldAlert className="size-3.5" />
              {errorMsg}
            </p>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <KeyRound className="size-3 text-primary" />
              <span>PIN default:</span>
              <button
                type="button"
                onClick={handleFillDefault}
                className="font-mono font-semibold text-primary hover:underline"
              >
                280219
              </button>
              <span className="text-[10px] text-muted-foreground">(.env)</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <Button
                key={n}
                type="button"
                variant="outline"
                onClick={() => handleDigitClick(n)}
                disabled={submitting}
                className="h-12 rounded-xl text-base font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-transform"
              >
                {n}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={handleFillDefault}
              disabled={submitting}
              className="h-12 rounded-xl text-[11px] text-primary hover:bg-primary/10"
              title="Isi PIN Default 280219"
            >
              Default
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDigitClick("0")}
              disabled={submitting}
              className="h-12 rounded-xl text-base font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-transform"
            >
              0
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDeleteDigit}
              disabled={submitting || pin.length === 0}
              className="h-12 rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
            >
              <Delete className="size-5" />
            </Button>
          </div>

          <Button
            type="button"
            onClick={() => handleVerify(pin)}
            disabled={submitting || pin.length !== 6}
            className="w-full h-10 rounded-xl text-xs font-semibold gap-2 shadow-sm"
          >
            {submitting ? "Memverifikasi..." : "Buka Brankas Kunci"}
          </Button>

          <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              Keluar Akun
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">
              AES-256 Protected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
