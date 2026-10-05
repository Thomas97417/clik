import { seo } from "@/lib/seo/meta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/(auth)/sign-in")({
  head: () =>
    seo({
      title: "Connexion",
      text: "Connectez-vous à Clik pour retrouver vos créations.",
      path: "/sign-in",
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
  return <SignInForm />;
}
