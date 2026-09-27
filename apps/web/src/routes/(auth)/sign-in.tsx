import { createFileRoute, redirect } from "@tanstack/react-router";
import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/(auth)/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In — Toma Stack" },
      {
        name: "description",
        content: "Sign in to your Toma Stack account.",
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
  return <SignInForm />;
}
