import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Settings,
  Sun,
  Terminal,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProviderIcon } from "@/components/vault/ProviderIcon";
import { getProvidersPageFn } from "@/lib/neon-vault.functions";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/providers", label: "Providers", icon: Plug },
  { to: "/api-access", label: "API Access", icon: Terminal },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const fetchProviders = useServerFn(getProvidersPageFn);
  const { data: providersData } = useQuery({
    queryKey: ["neon-providers-catalog"],
    queryFn: () => fetchProviders(),
  });

  const providers = (providersData?.providers ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    icon_url: string | null;
    key_count: number;
  }>;

  const topProviders = providers.slice(0, 8);

  useEffect(() => {
    const saved = localStorage.getItem("keyvault_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const active = saved === "dark" || (!saved && prefersDark);
    setIsDark(active);
    document.documentElement.classList.toggle("dark", active);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("keyvault_theme", next ? "dark" : "light");
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    const isPinVerified = sessionStorage.getItem("keyvault_pin_verified") === "true";
    if (!isPinVerified) {
      navigate({ to: "/pin", search: { redirect: pathname }, replace: true });
    }
  }, [loading, user, pathname, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate({ to: "/providers" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-1 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  const brand = (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3.5">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
        <KeyRound className="size-4" />
      </div>
      {collapsed ? null : (
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          KeyVault
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto hidden size-7 text-sidebar-foreground/70 hover:text-sidebar-foreground lg:inline-flex"
        onClick={() => setCollapsed((c) => !c)}
        aria-label="Collapse sidebar"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>
    </div>
  );

  const nav = (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {NAV.map((item) => {
        const active =
          pathname === item.to ||
          (item.to === "/providers" && pathname.startsWith("/providers"));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-secondary hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {collapsed ? null : <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const providerList = (
    <div className="px-2 py-2 border-t border-sidebar-border/60">
      {collapsed ? null : (
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Providers</span>
          <Link
            to="/providers"
            onClick={() => setMobileOpen(false)}
            className="text-[10px] text-primary hover:underline lowercase font-normal"
          >
            view all
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-0.5 mt-1">
        {topProviders.map((p) => {
          const active = pathname === `/providers/${p.slug}`;
          return (
            <Link
              key={p.id}
              to="/providers/$slug"
              params={{ slug: p.slug }}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-secondary hover:text-sidebar-foreground",
              )}
            >
              <ProviderIcon
                name={p.name}
                slug={p.slug}
                iconUrl={p.icon_url}
                size="sm"
                className="size-5 rounded shrink-0"
              />
              {collapsed ? null : (
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="truncate">{p.name}</span>
                  {p.key_count > 0 && (
                    <Badge
                      variant="secondary"
                      className="font-mono text-[9px] py-0 px-1.5 h-4 text-muted-foreground bg-muted/60"
                    >
                      {p.key_count}
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  const sidebarAccount = (
    <div className="border-t border-sidebar-border p-2 mt-auto shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs hover:bg-secondary transition-colors">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="size-7 shrink-0 rounded-full object-cover border border-border"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </span>
            )}
            {collapsed ? null : (
              <div className="min-w-0 flex-1 truncate text-left leading-tight">
                <p className="truncate text-xs font-medium text-foreground">
                  {user.name || user.email?.split("@")[0]}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
            <User className="size-4 mr-2" /> Profil & Akun
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
            <Settings className="size-4 mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              sessionStorage.removeItem("keyvault_pin_verified");
              navigate({ to: "/pin", replace: true });
            }}
          >
            <Lock className="size-4 mr-2 text-amber-500" /> Kunci Sesi PIN
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex h-screen overflow-hidden",
          collapsed ? "w-[64px]" : "w-60",
        )}
      >
        {brand}
        <div className="flex-1 overflow-y-auto">
          {nav}
          {providerList}
        </div>
        {sidebarAccount}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 flex flex-col h-full">
          {brand}
          <div className="flex-1 overflow-y-auto">
            {nav}
            {providerList}
          </div>
          {sidebarAccount}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden size-8"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <button
              onClick={() => navigate({ to: "/providers" })}
              className="flex h-9 w-64 sm:w-80 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-ring/50"
            >
              <Search className="size-3.5" />
              <span className="flex-1 text-left truncate">Cari provider & koneksi…</span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="size-6 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                  <span className="hidden md:inline max-w-[120px] truncate text-[11px] pr-1.5">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
                  <User className="size-4 mr-2" /> Profil & Akun
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                  <Settings className="size-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    sessionStorage.removeItem("keyvault_pin_verified");
                    navigate({ to: "/pin", replace: true });
                  }}
                >
                  <Lock className="size-4 mr-2 text-amber-500" /> Kunci Sesi PIN
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-grid-plus p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
