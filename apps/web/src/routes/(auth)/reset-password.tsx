import { seo } from "@/lib/seo/meta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import ResetPasswordForm from "@/components/reset-password-form";

export const Route = createFileRoute("/(auth)/reset-password")({
  head: () =>
    seo({
      title: "Réinitialiser le mot de passe",
      text: "Choisissez un nouveau mot de passe pour votre compte Clik.",
      path: "/reset-password",
      noindex: true,
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
