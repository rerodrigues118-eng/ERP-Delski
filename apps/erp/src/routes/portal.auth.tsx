import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/auth")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/portal/definir-senha",
      search: (search as any) || {},
    });
  },
  component: () => null,
});
