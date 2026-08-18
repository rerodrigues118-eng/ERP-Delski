import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/onboarding")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/onboarding",
      search: (search as any) || {},
    });
  },
  component: () => null,
});
