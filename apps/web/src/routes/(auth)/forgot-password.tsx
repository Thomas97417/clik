import { seo } from "@/lib/seo/meta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () =>
    seo({
      title: "Mot de passe oublié",
      text: "Retrouvez l’accès à votre compte Clik.",
      path: "/forgot-password",
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
  return <ForgotPasswordForm />;
}
