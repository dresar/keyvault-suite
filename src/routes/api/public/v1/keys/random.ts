import { createFileRoute } from "@tanstack/react-router";
import { handleCredentialRequest } from "@/lib/credential-endpoint.server";

export const Route = createFileRoute("/api/public/v1/keys/random")({
  server: {
    handlers: {
      GET: ({ request }) => handleCredentialRequest(request, "/api/v1/keys/random", "random"),
    },
  },
});
