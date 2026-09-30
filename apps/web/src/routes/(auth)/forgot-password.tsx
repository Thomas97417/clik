import { createFileRoute, redirect } from "@tanstack/react-router";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Clik" },
      {
        name: "description",
        content:
          "Recevez un lien pour réinitialiser le mot de passe de votre compte Clik.",
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
  return <ForgotPasswordForm />;
}
