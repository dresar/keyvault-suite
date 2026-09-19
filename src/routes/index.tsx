import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "KeyVault · Private API key & credential vault" },
      {
        name: "description",
        content:
          "KeyVault stores, organizes, rotates, and serves your API keys and credentials with encryption and audit logging.",
      },
      { property: "og:title", content: "KeyVault · Private API key & credential vault" },
      {
        property: "og:description",
        content: "Encrypted storage, rotation, and programmatic access for all your API keys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-1 w-24 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
