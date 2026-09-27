import { createFileRoute, redirect } from "@tanstack/react-router";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/(auth)/sign-up")({
  head: () => ({
    meta: [
      { title: "Sign Up — Toma Stack" },
      {
        name: "description",
        content: "Create a new Toma Stack account.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SignUpForm />;
}
