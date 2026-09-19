import { authenticateToken, checkScope, jsonResponse, requirePermission } from "./api-auth.server";
import { logUsage } from "./audit.server";
import { resolveCredential, SelectionError, type Strategy } from "./selection.server";

const STRATEGIES: Strategy[] = ["random", "round_robin", "least_used", "first_available"];

export async function handleCredentialRequest(
  request: Request,
  endpoint: string,
  defaultStrategy: Strategy,
): Promise<Response> {
  const started = Date.now();
  const auth = await authenticateToken(request);
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.token, "keys.random");
  if (denied) return denied;

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const actor = url.searchParams.get("actor");
  const environment = url.searchParams.get("environment");
  const collection = url.searchParams.get("collection");
  const tag = url.searchParams.get("tag");
  const requested = url.searchParams.get("strategy") as Strategy | null;
  const strategy = requested && STRATEGIES.includes(requested) ? requested : defaultStrategy;

  const scopeDenied = checkScope(auth.token, { provider, environment, collection });
  if (scopeDenied) return scopeDenied;

  const includeSecret = auth.token.permissions.includes("keys.reveal");

  try {
    const credential = await resolveCredential({
      userId: auth.token.user_id,
      provider,
      actor,
      environment,
      collection,
      tag,
      strategy,
      includeSecret,
    });

    await logUsage({
      userId: auth.token.user_id,
      tokenId: auth.token.id,
      tokenName: auth.token.name,
      endpoint,
      providerSlug: credential.provider,
      keyId: credential.id,
      keyName: credential.name,
      strategy,
      statusCode: 200,
      latencyMs: Date.now() - started,
    });

    return jsonResponse({
      success: true,
      data: credential,
      meta: {
        strategy,
        secret_included: includeSecret,
        ...(includeSecret ? {} : { note: "Token lacks keys.reveal permission; secret omitted." }),
      },
    });
  } catch (err) {
    const code = err instanceof SelectionError ? err.code : "INTERNAL_ERROR";
    const status = code === "NO_AVAILABLE_CREDENTIAL" ? 404 : code === "INTERNAL_ERROR" ? 500 : 400;
    await logUsage({
      userId: auth.token.user_id,
      tokenId: auth.token.id,
      tokenName: auth.token.name,
      endpoint,
      providerSlug: provider,
      strategy,
      statusCode: status,
      latencyMs: Date.now() - started,
    });
    return jsonResponse(
      {
        success: false,
        data: null,
        error: { code, message: err instanceof Error ? err.message : "Unexpected error" },
      },
      status,
    );
  }
}
