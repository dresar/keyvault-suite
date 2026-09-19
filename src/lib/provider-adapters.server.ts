// Provider-specific credential validation. Only providers with a documented,
// safe verification endpoint are supported — everything else reports
// "unsupported" instead of guessing.

export type TestOutcome =
  | "connected"
  | "invalid"
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "error"
  | "unsupported";

export type TestResult = { status: TestOutcome; detail: string };

type Adapter = (secret: string) => Promise<TestResult>;

function classify(status: number): TestResult {
  if (status === 200) return { status: "connected", detail: "Credential accepted" };
  if (status === 401) return { status: "unauthorized", detail: "Rejected (401)" };
  if (status === 403) return { status: "invalid", detail: "Forbidden (403)" };
  if (status === 429) return { status: "rate_limited", detail: "Rate limited (429)" };
  return { status: "error", detail: `Unexpected response (${status})` };
}

async function probe(url: string, headers: Record<string, string>): Promise<TestResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    return classify(res.status);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError")
      return { status: "timeout", detail: "Provider did not respond in time" };
    return { status: "error", detail: "Network error while contacting provider" };
  }
}

const adapters: Record<string, Adapter> = {
  openai: (s) => probe("https://api.openai.com/v1/models", { Authorization: `Bearer ${s}` }),
  "openai-codex": (s) =>
    probe("https://api.openai.com/v1/models", { Authorization: `Bearer ${s}` }),
  groq: (s) => probe("https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${s}` }),
  deepseek: (s) => probe("https://api.deepseek.com/models", { Authorization: `Bearer ${s}` }),
  mistral: (s) => probe("https://api.mistral.ai/v1/models", { Authorization: `Bearer ${s}` }),
  github: (s) =>
    probe("https://api.github.com/user", {
      Authorization: `Bearer ${s}`,
      "User-Agent": "KeyVault",
    }),
  huggingface: (s) =>
    probe("https://huggingface.co/api/whoami-v2", { Authorization: `Bearer ${s}` }),
  anthropic: (s) =>
    probe("https://api.anthropic.com/v1/models", {
      "x-api-key": s,
      "anthropic-version": "2023-06-01",
    }),
  "claude-code": (s) =>
    probe("https://api.anthropic.com/v1/models", {
      "x-api-key": s,
      "anthropic-version": "2023-06-01",
    }),
  gemini: (s) => probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${s}`, {}),
  "google-gemini": (s) =>
    probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${s}`, {}),
  xai: (s) => probe("https://api.x.ai/v1/models", { Authorization: `Bearer ${s}` }),
  "grok-cli": (s) => probe("https://api.x.ai/v1/models", { Authorization: `Bearer ${s}` }),
  cohere: (s) => probe("https://api.cohere.com/v1/models", { Authorization: `Bearer ${s}` }),
  replicate: (s) =>
    probe("https://api.replicate.com/v1/account", { Authorization: `Bearer ${s}` }),
  resend: (s) => probe("https://api.resend.com/domains", { Authorization: `Bearer ${s}` }),
  vercel: (s) => probe("https://api.vercel.com/v2/user", { Authorization: `Bearer ${s}` }),
  cloudflare: (s) =>
    probe("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      Authorization: `Bearer ${s}`,
    }),
};

export function testingSupported(slug: string): boolean {
  return slug in adapters;
}

export async function testCredential(slug: string, secret: string): Promise<TestResult> {
  const adapter = adapters[slug];
  if (!adapter)
    return { status: "unsupported", detail: "Testing is not supported for this provider" };
  return adapter(secret);
}
