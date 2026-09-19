import { useState } from "react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const palette = [
  "bg-[oklch(0.95_0.03_40)] text-[oklch(0.45_0.14_40)]",
  "bg-[oklch(0.95_0.03_150)] text-[oklch(0.42_0.12_150)]",
  "bg-[oklch(0.95_0.03_250)] text-[oklch(0.42_0.12_250)]",
  "bg-[oklch(0.95_0.03_310)] text-[oklch(0.42_0.12_310)]",
  "bg-[oklch(0.95_0.03_90)] text-[oklch(0.42_0.12_90)]",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function GeminiSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.33" stopColor="#9B72CB" />
          <stop offset="0.66" stopColor="#D96570" />
          <stop offset="1" stopColor="#F4B400" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OpenAISvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7466-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3428 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.405-.6667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1636a.0804.0804 0 0 1-.038-.0567V6.0748a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4598a.7948.7948 0 0 0-.3927.6813v6.7219zm1.1444-1.5714l3.0003-1.7299 3.0003 1.7299v3.4599l-3.0003 1.7299-3.0003-1.7299z" />
    </svg>
  );
}

export function ClaudeSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.3 3.2L12.5 13.8L9.2 6.6L3.5 18.2L1.8 14.5L8.5 0.8H12.3L15 6.7L17.3 1.5H21.2L17.3 3.2ZM12.7 15.6L16.2 22.8H20.1L14.7 11.2L12.7 15.6ZM6.7 22.8H2.8L7.4 13.4L9.4 17.5L6.7 22.8Z" />
    </svg>
  );
}

export function DeepSeekSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

export function CloudflareSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.3 10.1c-.2-.7-.6-1.4-1.1-1.9-.8-.9-2-1.4-3.2-1.4-1.5 0-2.8.8-3.6 2-.4-.2-.9-.3-1.4-.3-1.7 0-3.1 1.2-3.4 2.8C5.1 11.6 4.6 12 4.3 12.6c-.5.8-.6 1.7-.4 2.6.2.9.8 1.6 1.6 2 .5.2 1 .3 1.5.3h11.2c1.5 0 2.8-.7 3.5-1.9.8-1.1.9-2.6.3-3.8-.5-1-1.6-1.6-2.7-1.7h-1z" />
    </svg>
  );
}

export function SupabaseSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M13.35 23.63C12.8 24.12 12 23.72 12 23V13.88H21.6C22.65 13.88 23.2 12.64 22.5 11.87L11.65 0.37C11.1 -0.12 12 0.28 12 1V10.12H2.4C1.35 10.12 0.8 11.36 1.5 12.13L13.35 23.63Z"
        fill="#3ECF8E"
      />
    </svg>
  );
}

export function NeonSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="4" fill="#00E599" />
      <path d="M6 18V6H8.5L15.5 14.5V6H18V18H15.5L8.5 9.5V18H6Z" fill="#0A0C10" />
    </svg>
  );
}

export function ProviderIcon({
  name,
  slug,
  iconUrl,
  size = "md",
  className,
}: {
  name: string;
  slug: string;
  iconUrl?: string | null | undefined;
  size?: ("sm" | "md" | "lg") | undefined;
  className?: string | undefined;
}) {
  const [imgError, setImgError] = useState(false);

  const dim =
    size === "sm"
      ? "size-7 text-[11px]"
      : size === "lg"
        ? "size-12 text-base"
        : "size-9 text-xs";

  const s = slug.toLowerCase();

  if (s === "gemini" || s === "google-gemini") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-card border border-border shadow-xs",
          dim,
          className,
        )}
      >
        <GeminiSvg className={size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5"} />
      </div>
    );
  }

  if (s === "supabase") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 shadow-xs",
          dim,
          className,
        )}
      >
        <SupabaseSvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4.5"} />
      </div>
    );
  }

  if (s === "neon" || s === "neon-postgres") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-[#00E599]/10 border border-[#00E599]/20 shadow-xs",
          dim,
          className,
        )}
      >
        <NeonSvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4.5"} />
      </div>
    );
  }

  if (s === "openai" || s === "openai-codex") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
          dim,
          className,
        )}
      >
        <OpenAISvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4"} />
      </div>
    );
  }

  if (s === "claude" || s === "claude-code" || s === "anthropic") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          dim,
          className,
        )}
      >
        <ClaudeSvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4"} />
      </div>
    );
  }

  if (s === "deepseek") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20",
          dim,
          className,
        )}
      >
        <DeepSeekSvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4"} />
      </div>
    );
  }

  if (s === "cloudflare" || s === "cloudflare-ai") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20",
          dim,
          className,
        )}
      >
        <CloudflareSvg className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-4"} />
      </div>
    );
  }

  const effectiveUrl = iconUrl || `https://cdn.simpleicons.org/${s}`;

  if (!imgError && effectiveUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border/80 bg-white dark:bg-card/90 p-1 shadow-xs overflow-hidden",
          dim,
          className,
        )}
      >
        <img
          src={effectiveUrl}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className="size-full object-contain"
        />
      </div>
    );
  }

  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight shadow-xs",
        palette[hash(slug) % palette.length],
        dim,
        className,
      )}
    >
      {initials || <KeyRound className="size-4" />}
    </div>
  );
}
