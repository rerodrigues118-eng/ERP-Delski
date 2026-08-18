import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/projetos")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/app/projects",
      search: (search as any) || {},
    });
  },
  component: () => null,
});
