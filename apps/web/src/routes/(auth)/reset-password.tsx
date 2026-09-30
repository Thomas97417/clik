import { createFileRoute, redirect } from "@tanstack/react-router";
import ResetPasswordForm from "@/components/reset-password-form";

export const Route = createFileRoute("/(auth)/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Clik" },
      {
        name: "description",
        content:
          "Choisissez un nouveau mot de passe pour retrouver votre atelier Clik.",
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
  return <ResetPasswordForm />;
}
