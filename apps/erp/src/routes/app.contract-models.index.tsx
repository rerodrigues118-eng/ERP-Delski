import { createFileRoute, redirect, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/contract-models/")({
  beforeLoad: () => {
    throw redirect({
      to: "/app/contract-generator",
      search: { tab: "modelos" },
      replace: true,
    });
  },
  component: () => (
    <Navigate to="/app/contract-generator" search={{ tab: "modelos" }} replace />
  ),
});
