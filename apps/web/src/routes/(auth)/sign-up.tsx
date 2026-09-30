import { createFileRoute, redirect } from "@tanstack/react-router";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/(auth)/sign-up")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Clik" },
      {
        name: "description",
        content:
          "Créez votre compte Clik pour conserver vos constructions en ligne et les partager.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/editor" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SignUpForm />;
}
