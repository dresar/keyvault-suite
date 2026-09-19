import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vault/")({
  beforeLoad: () => {
    throw redirect({ to: "/providers", replace: true });
  },
  component: () => null,
});
