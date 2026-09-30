import { createFileRoute, redirect } from "@tanstack/react-router";
import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/(auth)/sign-in")({
  head: () => ({
    meta: [
      { title: "Connexion — Clik" },
      {
        name: "description",
        content:
          "Retrouvez votre atelier et vos créations. Connectez-vous à votre compte Clik.",
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
  return <SignInForm />;
}
