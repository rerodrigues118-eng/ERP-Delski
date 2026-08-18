import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cliente/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/cliente" });
  },
  component: () => null,
});
