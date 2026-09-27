import { createFileRoute, redirect } from "@tanstack/react-router";
import ResetPasswordForm from "@/components/reset-password-form";

export const Route = createFileRoute("/(auth)/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Toma Stack" },
      {
        name: "description",
        content: "Set a new password for your Toma Stack account.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <ResetPasswordForm />;
}
