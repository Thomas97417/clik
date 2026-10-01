import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";

import ChangePasswordCard from "@/components/settings/change-password-card";
import DeleteAccountCard from "@/components/settings/delete-account-card";
import AvatarCard from "@/components/settings/avatar-card";
import { defaultAvatar } from "@clik/avatars";
import SessionsCard from "@/components/settings/sessions-card";
import EmailCard from "@/components/settings/update-email-card";
import UpdateNameCard from "@/components/settings/update-name-card";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Clik" },
      {
        name: "description",
        content: "Gérez votre avatar, votre compte et vos préférences Clik.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const user = useCurrentUser();

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Votre identité et les réglages de votre compte.
        </p>
      </div>
      <AvatarCard
        key={user._id}
        avatar={user.avatar ?? defaultAvatar(user._id)}
      />
      <UpdateNameCard name={user.name} />
      <EmailCard email={user.email} />
      <ChangePasswordCard />
      <SessionsCard />
      <DeleteAccountCard />
    </div>
  );
}
