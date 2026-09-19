const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = process.env["VAULT_ENCRYPTION_KEY"];
  if (!raw) throw new Error("VAULT_ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  cachedKey = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, encoder.encode(plaintext)),
  );
  return `v1.${toBase64(iv)}.${toBase64(cipher)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Malformed ciphertext");
  const key = await getKey();
  const iv = fromBase64(parts[1]!);
  const cipher = fromBase64(parts[2]!);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    cipher as unknown as BufferSource,
  );
  return decoder.decode(plain);
}

export function secretHint(plaintext: string): string {
  const trimmed = plaintext.trim();
  const head = trimmed.slice(0, Math.min(3, Math.max(0, trimmed.length - 4)));
  const tail = trimmed.length > 8 ? trimmed.slice(-4) : "";
  return `${head}${head ? "…" : ""}${tail}`;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64(new Uint8Array(digest));
}

export function generateApiToken(): { token: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = toBase64(bytes).replace(/[+/=]/g, "").slice(0, 32);
  const token = `kv_${body}`;
  return { token, prefix: token.slice(0, 10) };
}
