import { seo } from "@/lib/seo/meta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import VerifyEmailForm from "@/components/verify-email-form";

export const Route = createFileRoute("/(auth)/verify-email")({
  head: () =>
    seo({
      title: "Vérifier votre adresse e-mail",
      text: "Confirmez votre adresse pour accéder à votre compte Clik.",
      path: "/verify-email",
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
  return <VerifyEmailForm />;
}
