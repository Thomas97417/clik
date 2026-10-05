import { seo } from "@/lib/seo/meta";
import SettingsArt from "@/components/settings/settings-art";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";

import ChangePasswordCard from "@/components/settings/change-password-card";
import DeleteAccountCard from "@/components/settings/delete-account-card";
import AvatarCard from "@/components/settings/avatar-card";
import { defaultAvatar } from "@clik/avatars";
import SessionsCard from "@/components/settings/sessions-card";
import EmailCard from "@/components/settings/update-email-card";
import UpdateNameCard from "@/components/settings/update-name-card";

export const Route = createFileRoute("/settings")({
  head: () =>
    seo({
      title: "Paramètres du compte",
      text: "Personnalisez votre avatar et votre compte Clik.",
      path: "/settings",
      noindex: true,
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
    <main className="settings-page">
      <header className="settings-heading">
        <div>
          <h1>
            Votre espace,
            <br />
            <em>à votre façon.</em>
          </h1>
          <p>
            Les petits détails qui font que vous êtes chez vous. Ajustez votre
            profil et gardez la main sur votre compte.
          </p>
        </div>
        <SettingsArt />
      </header>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav aria-label="Sections des paramètres">
            <a href="#identity">
              <span aria-hidden="true">01</span> Votre identité
            </a>
            <a href="#security">
              <span aria-hidden="true">02</span> Sécurité
            </a>
            <a href="#account">
              <span aria-hidden="true">03</span> Votre compte
            </a>
          </nav>
          <Link
            to="/gallery/user/$userId"
            params={{ userId: user._id }}
            className="settings-profile-link"
          >
            Voir ma page publique <span aria-hidden="true">↗</span>
          </Link>
        </aside>
        <div className="settings-sections">
          <section id="identity" aria-labelledby="identity-title">
            <div className="settings-section-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h2 id="identity-title">Votre identité</h2>
                <p>Ce petit quelque chose qui vous rend reconnaissable.</p>
              </div>
            </div>
            <AvatarCard
              key={user._id}
              avatar={user.avatar ?? defaultAvatar(user._id)}
            />
            <div className="settings-form-grid">
              <UpdateNameCard name={user.name} />
              <EmailCard email={user.email} />
            </div>
          </section>
          <section id="security" aria-labelledby="security-title">
            <div className="settings-section-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h2 id="security-title">Les clés de votre atelier</h2>
                <p>
                  Votre mot de passe et les appareils qui ont accès à votre
                  compte.
                </p>
              </div>
            </div>
            <div className="settings-form-grid settings-security-grid">
              <ChangePasswordCard />
              <SessionsCard />
            </div>
          </section>
          <section id="account" aria-labelledby="account-title">
            <div className="settings-section-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h2 id="account-title">Votre compte</h2>
                <p>Vous gardez le contrôle, jusqu’à la dernière brique.</p>
              </div>
            </div>
            <DeleteAccountCard />
          </section>
        </div>
      </div>
    </main>
  );
}
