import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/freelancer/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer" });
  },
  component: () => null,
});
