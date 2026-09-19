import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, updateUserSession } from "@/hooks/useAuth";
import {
  getProfileDataFn,
  updateProfileIdentityFn,
  updatePasswordFn,
  uploadIconToGitHubFn,
} from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profil & Keamanan · KeyVault" },
      { name: "description", content: "Kelola foto profil CDN, identitas akun, dan kata sandi." },
    ],
  }),
  component: ProfilePage,
});

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=KeyVaultMaster&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/bottts/svg?seed=NeonSecurity&backgroundColor=0284c7",
  "https://api.dicebear.com/7.x/shapes/svg?seed=AksaraCinta&backgroundColor=6366f1",
  "https://api.dicebear.com/7.x/identicon/svg?seed=CryptoVault&backgroundColor=1e293b",
];

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: authUser, signOut } = useAuth();

  const fetchProfile = useServerFn(getProfileDataFn);
  const updateIdentity = useServerFn(updateProfileIdentityFn);
  const updatePassword = useServerFn(updatePasswordFn);
  const uploadImage = useServerFn(uploadIconToGitHubFn);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["neon-user-profile"],
    queryFn: () => fetchProfile(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name || "");
      setEmail(data.user.email || "");
      setImageUrl(data.user.image || "");
    } else if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
      setImageUrl(authUser.image || "");
    }
  }, [data, authUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.name.endsWith(".svg")) {
      toast.error("File harus berformat gambar (.png, .jpg, .svg, .webp)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await uploadImage({
          data: {
            filename: file.name,
            base64Data,
          },
        });
        setImageUrl(res.cdnUrl);
        toast.success("Foto avatar berhasil di-upload ke GitHub CDN");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal upload gambar");
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Gagal membaca file");
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!email.trim()) {
      toast.error("Email wajib diisi");
      return;
    }

    setSavingIdentity(true);
    try {
      const res = await updateIdentity({
        data: {
          name: name.trim(),
          email: email.trim(),
          image: imageUrl.trim() ? imageUrl.trim() : null,
        },
      });

      updateUserSession({
        name: res.user.name,
        email: res.user.email,
        image: res.user.image,
      });

      qc.invalidateQueries({ queryKey: ["neon-user-profile"] });
      qc.invalidateQueries({ queryKey: ["neon-settings"] });
      toast.success("Identitas profil berhasil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword({
        data: {
          currentPassword: currentPassword.trim() ? currentPassword.trim() : undefined,
          newPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Kata sandi berhasil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui kata sandi");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLockSession = () => {
    sessionStorage.removeItem("keyvault_pin_verified");
    toast.info("Sesi vault dikunci. Masukkan PIN untuk membuka kembali.");
    navigate({ to: "/pin", search: { redirect: "/profile" }, replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Profil & Identitas Akun
            </h1>
            <p className="text-xs text-muted-foreground">
              Kelola foto avatar CDN, nama, email, kata sandi, dan PIN pengaman.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLockSession}
            className="h-8 gap-1.5 text-xs text-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
          >
            <Lock className="size-3.5" />
            Kunci Sesi
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Foto Avatar CDN
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                jsDelivr CDN
              </Badge>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-muted/40 shadow-md">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || "User Avatar"}
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-primary/10 text-xl font-bold text-primary">
                    {(name || "E").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="avatar-url" className="text-xs font-medium">
                    URL Gambar Avatar (CDN)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="avatar-url"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.jsdelivr.net/gh/... atau link CDN gambar"
                      className="h-9 text-xs font-mono"
                    />
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="h-9 px-2.5 text-xs text-muted-foreground"
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Upload className="size-3.5" />
                    {uploadingImage ? "Mengunggah..." : "Upload ke GitHub CDN"}
                  </Button>

                  <span className="text-[11px] text-muted-foreground">atau pilih preset:</span>
                  <div className="flex items-center gap-1.5">
                    {AVATAR_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(p)}
                        className="size-6 overflow-hidden rounded-full border border-border hover:border-primary transition-colors"
                        title={`Pilih Avatar ${idx + 1}`}
                      >
                        <img src={p} alt={`Preset ${idx + 1}`} className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Aset foto disimpan di repository ekasyarifmaulana10-crypto/PORTOFOLIO-assets dan dialirkan lewat jsDelivr CDN.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveIdentity} className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Identitas Pengguna
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Owner Account
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="user-name" className="text-xs font-medium">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap..."
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email" className="text-xs font-medium">
                  Alamat Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground">
                Tersinkronisasi ke Neon Lakebase PostgreSQL.
              </span>
              <Button
                type="submit"
                disabled={savingIdentity}
                className="h-8 gap-1.5 px-4 text-xs font-medium"
              >
                <Save className="size-3.5" />
                {savingIdentity ? "Menyimpan..." : "Simpan Identitas"}
              </Button>
            </div>
          </form>

          <form onSubmit={handleUpdatePassword} className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Perbarui Kata Sandi
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                Argon2 / Scrypt
              </Badge>
            </div>

            <div className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="curr-pass" className="text-xs font-medium">
                  Kata Sandi Saat Ini (Opsional jika baru pertama kali ganti)
                </Label>
                <div className="relative">
                  <Input
                    id="curr-pass"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 text-xs pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass" className="text-xs font-medium">
                    Kata Sandi Baru <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-9 text-xs pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass" className="text-xs font-medium">
                    Konfirmasi Kata Sandi Baru <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="h-9 text-xs pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground">
                Dienkripsi dan diverifikasi dengan standar Better Auth crypto.
              </span>
              <Button
                type="submit"
                disabled={savingPassword}
                className="h-8 gap-1.5 px-4 text-xs font-medium"
              >
                <KeyRound className="size-3.5" />
                {savingPassword ? "Memproses..." : "Perbarui Kata Sandi"}
              </Button>
            </div>
          </form>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  PIN Keamanan Tambahan
                </h2>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-mono text-[10px]">
                Active Gate
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Verifikasi PIN 6-Digit setelah Login
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PIN default diatur ke <span className="font-mono font-bold text-foreground">280219</span> melalui konfigurasi <span className="font-mono text-primary">SECURITY_PIN</span> di file .env.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLockSession}
                className="h-8 gap-1.5 text-xs text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 shrink-0"
              >
                <Lock className="size-3.5" />
                Kunci Sesi Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
