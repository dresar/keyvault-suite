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

const domainMap: Record<string, string> = {
  gemini: "ai.google.dev",
  "google-gemini": "ai.google.dev",
  "google-cloud": "cloud.google.com",
  openai: "openai.com",
  "openai-codex": "openai.com",
  claude: "anthropic.com",
  "claude-code": "claude.ai",
  anthropic: "anthropic.com",
  antigravity: "antigravity.google",
  deepseek: "deepseek.com",
  cloudflare: "cloudflare.com",
  "cloudflare-ai": "cloudflare.com",
  supabase: "supabase.com",
  neon: "neon.tech",
  "neon-postgres": "neon.tech",
  github: "github.com",
  "github-copilot": "github.com",
  gitlab: "gitlab.com",
  stripe: "stripe.com",
  resend: "resend.com",
  upstash: "upstash.com",
  clerk: "clerk.com",
  auth0: "auth0.com",
  vercel: "vercel.com",
  xai: "x.ai",
  "grok-cli": "x.ai",
  groq: "groq.com",
  mistral: "mistral.ai",
  cohere: "cohere.com",
  huggingface: "huggingface.co",
  pinecone: "pinecone.io",
  qdrant: "qdrant.tech",
  railway: "railway.app",
  render: "render.com",
  "fly-io": "fly.io",
  turso: "turso.tech",
  planetscale: "planetscale.com",
  clickhouse: "clickhouse.com",
  mongodb: "mongodb.com",
  posthog: "posthog.com",
  mixpanel: "mixpanel.com",
  sentry: "sentry.io",
  midjourney: "midjourney.com",
  elevenlabs: "elevenlabs.io",
  runway: "runwayml.com",
  suno: "suno.com",
  udio: "udio.com",
  livekit: "livekit.io",
  deepgram: "deepgram.com",
  assemblyai: "assemblyai.com",
  tavily: "tavily.com",
  firecrawl: "firecrawl.dev",
  crawl4ai: "crawl4ai.com",
  mem0: "mem0.ai",
  aider: "aider.chat",
  cursor: "cursor.com",
  cline: "cline.bot",
  clinepass: "cline.bot",
  codebuddy: "copilot.tencent.com",
  "codebuddy-cn": "copilot.tencent.com",
  opencode: "opencode.ai",
  openrouter: "openrouter.ai",
  "together-ai": "together.ai",
  "fireworks-ai": "fireworks.ai",
  replicate: "replicate.com",
  cerebras: "cerebras.ai",
  kimi: "moonshot.cn",
  lemonsqueezy: "lemonsqueezy.com",
  paddle: "paddle.com",
  xendit: "xendit.co",
  midtrans: "midtrans.com",
  sendgrid: "sendgrid.com",
  slack: "slack.com",
  discord: "discord.com",
  telegram: "telegram.org",
  whatsapp: "whatsapp.com",
  twilio: "twilio.com",
  pusher: "pusher.com",
  tailscale: "tailscale.com",
  ngrok: "ngrok.com",
  docker: "hub.docker.com",
  aws: "aws.amazon.com",
  azure: "azure.microsoft.com",
  digitalocean: "digitalocean.com",
  linode: "linode.com",
  vultr: "vultr.com",
  hetzner: "hetzner.com",
  scaleway: "scaleway.com",
  "deno-deploy": "deno.com",
  imagekit: "imagekit.io",
  uploadcare: "uploadcare.com",
  cloudinary: "cloudinary.com",
  convex: "convex.dev",
  algolia: "algolia.com",
  alchemy: "alchemy.com",
  shopify: "shopify.com",
  "kilo-code": "kilocode.ai",
  qoder: "qoder.com",
  "xiaomi-mimo": "xiaomimimo.com",
  netlify: "netlify.com",
  perplexity: "perplexity.ai",
  stability: "stability.ai",
  "shopify-api": "shopify.dev",
};

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

  const s = slug ? slug.toLowerCase().trim() : "";
  const domain = domainMap[s] || (s ? `${s}.com` : "");
  const fallbackUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;
  const effectiveUrl = iconUrl || fallbackUrl;

  if (!imgError && effectiveUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background p-1 shadow-2xs overflow-hidden",
          dim,
          className,
        )}
      >
        <img
          src={effectiveUrl}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="size-full object-contain rounded-[3px]"
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
        "flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-tight shadow-2xs",
        palette[hash(slug || "key") % palette.length],
        dim,
        className,
      )}
    >
      {initials || <KeyRound className="size-4" />}
    </div>
  );
}
