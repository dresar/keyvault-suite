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

export function ProviderIcon({
  name,
  slug,
  iconUrl,
  size = "md",
  className,
}: {
  name: string;
  slug: string;
  iconUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-12 text-base" : "size-9 text-xs";
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={cn(dim, "rounded-md border border-border object-contain bg-card", className)}
      />
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
        "flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight",
        palette[hash(slug) % palette.length],
        dim,
        className,
      )}
    >
      {initials || <KeyRound className="size-4" />}
    </div>
  );
}
