import { seo } from "@/lib/seo/meta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/(auth)/sign-up")({
  head: () =>
    seo({
      title: "Créer un compte",
      text: "Rejoignez Clik et partagez vos constructions en briques 3D.",
      path: "/sign-up",
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
  return <SignUpForm />;
}
