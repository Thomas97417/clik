import { createFileRoute, redirect } from "@tanstack/react-router";
import VerifyEmailForm from "@/components/verify-email-form";

export const Route = createFileRoute("/(auth)/verify-email")({
  head: () => ({
    meta: [
      { title: "Vérifier mon email — Clik" },
      {
        name: "description",
        content:
          "Confirmez votre adresse email pour accéder à votre espace Clik.",
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
  return <VerifyEmailForm />;
}
