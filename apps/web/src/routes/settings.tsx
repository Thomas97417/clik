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
    <main className="settings-page px-9 mx-auto my-0 max-w-295 pt-12 pb-20 text-[#26344c] max-sm:px-4.5 max-sm:pt-7 max-sm:pb-12">
      <header className="settings-heading px-3 gap-8 flex items-center justify-between pt-0 pb-9.5 border-b border-solid border-b-[#e1e7f0] max-sm:px-0 max-sm:gap-2 max-sm:items-start max-sm:pb-6">
        <div>
          <h1 className="m-0 text-[clamp(36px,_4.2vw,_56px)] font-extrabold leading-[1.1] tracking-[-2px] max-sm:text-[35px] max-sm:tracking-[-1.5px]">
            Votre espace,
            <br />
            <em className="not-italic text-[#356ae6]">à votre façon.</em>
          </h1>
          <p className="mx-0 max-w-112.5 mt-5 mb-0 text-[#697a93] text-sm leading-[1.8] max-sm:text-xs">
            Les petits détails qui font que vous êtes chez vous. Ajustez votre
            profil et gardez la main sur votre compte.
          </p>
        </div>
        <SettingsArt />
      </header>
      <div className="settings-layout gap-10 grid grid-cols-[170px_minmax(0,1fr)] items-start pt-9.5 max-lg-wide:gap-7 max-lg-wide:grid-cols-1 max-lg-wide:pt-5.5">
        <aside className="settings-sidebar sticky top-6 max-sm:gap-3 max-sm:static max-sm:block max-sm:items-center max-sm:justify-between min-sm:max-lg-wide:gap-3 min-sm:max-lg-wide:static min-sm:max-lg-wide:flex min-sm:max-lg-wide:items-center min-sm:max-lg-wide:justify-between">
          <nav
            className="gap-2 grid max-sm:gap-1 max-sm:flex max-sm:flex-wrap max-sm:justify-between min-sm:max-lg-wide:gap-1 min-sm:max-lg-wide:flex min-sm:max-lg-wide:flex-wrap"
            aria-label="Sections des paramètres"
          >
            <a
              className="focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-2.5 py-3 gap-3 flex items-center rounded-[8px] text-[#435773] text-xs leading-[inherit] [transition:background_150ms] max-sm:px-1 max-sm:py-2.25 max-sm:gap-1.25 max-sm:text-[11px] hover:bg-[#eaf0fc] hover:text-[#356ae6] focus-visible:bg-[#eaf0fc] focus-visible:text-[#356ae6]"
              href="#identity"
            >
              <span
                className="text-[10px] text-[#94a5bd] tabular-nums"
                aria-hidden="true"
              >
                01
              </span>{" "}
              Votre identité
            </a>
            <a
              className="focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-2.5 py-3 gap-3 flex items-center rounded-[8px] text-[#435773] text-xs leading-[inherit] [transition:background_150ms] max-sm:px-1 max-sm:py-2.25 max-sm:gap-1.25 max-sm:text-[11px] hover:bg-[#eaf0fc] hover:text-[#356ae6] focus-visible:bg-[#eaf0fc] focus-visible:text-[#356ae6]"
              href="#security"
            >
              <span
                className="text-[10px] text-[#94a5bd] tabular-nums"
                aria-hidden="true"
              >
                02
              </span>{" "}
              Sécurité
            </a>
            <a
              className="focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-2.5 py-3 gap-3 flex items-center rounded-[8px] text-[#435773] text-xs leading-[inherit] [transition:background_150ms] max-sm:px-1 max-sm:py-2.25 max-sm:gap-1.25 max-sm:text-[11px] hover:bg-[#eaf0fc] hover:text-[#356ae6] focus-visible:bg-[#eaf0fc] focus-visible:text-[#356ae6]"
              href="#account"
            >
              <span
                className="text-[10px] text-[#94a5bd] tabular-nums"
                aria-hidden="true"
              >
                03
              </span>{" "}
              Votre compte
            </a>
          </nav>
          <Link
            to="/gallery/user/$userId"
            params={{ userId: user._id }}
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 settings-profile-link px-2.5 gap-2 flex items-center pt-5 pb-0 mt-4 border-t border-solid border-t-[#e1e7f0] text-[#356ae6] text-[11px] max-sm:px-1 max-sm:m-0 max-sm:border-0 max-sm:border-none max-sm:border-current max-sm:inline-flex max-sm:pt-3 min-sm:max-lg-wide:px-0 min-sm:max-lg-wide:py-2.5 min-sm:max-lg-wide:m-0 min-sm:max-lg-wide:border-0 min-sm:max-lg-wide:border-none min-sm:max-lg-wide:border-current hover:underline"
          >
            Voir ma page publique <span aria-hidden="true">↗</span>
          </Link>
        </aside>
        <div className="settings-sections gap-10 min-w-0 grid">
          <section
            className="min-w-0 scroll-mt-6"
            id="identity"
            aria-labelledby="identity-title"
          >
            <div className="settings-section-heading gap-3.5 flex items-start mb-4.5">
              <span
                className="grid place-items-center shrink-0 bg-[#e9effa] text-[#6681b0] rounded-[8px_8px_3px_8px] text-[11px] size-7.5"
                aria-hidden="true"
              >
                01
              </span>
              <div>
                <h2
                  className="mx-0 text-[19px] mt-0 mb-1.25 font-[650] tracking-[-0.4px]"
                  id="identity-title"
                >
                  Votre identité
                </h2>
                <p className="m-0 text-[#77869c] text-xs leading-[1.6]">
                  Ce petit quelque chose qui vous rend reconnaissable.
                </p>
              </div>
            </div>
            <AvatarCard
              key={user._id}
              avatar={user.avatar ?? defaultAvatar(user._id)}
            />
            <div className="settings-form-grid gap-4 grid grid-cols-2 items-start max-sm:grid-cols-1">
              <UpdateNameCard name={user.name} />
              <EmailCard email={user.email} />
            </div>
          </section>
          <section
            className="min-w-0 scroll-mt-6"
            id="security"
            aria-labelledby="security-title"
          >
            <div className="settings-section-heading gap-3.5 flex items-start mb-4.5">
              <span
                className="grid place-items-center shrink-0 bg-[#e9effa] text-[#6681b0] rounded-[8px_8px_3px_8px] text-[11px] size-7.5"
                aria-hidden="true"
              >
                02
              </span>
              <div>
                <h2
                  className="mx-0 text-[19px] mt-0 mb-1.25 font-[650] tracking-[-0.4px]"
                  id="security-title"
                >
                  Les clés de votre atelier
                </h2>
                <p className="m-0 text-[#77869c] text-xs leading-[1.6]">
                  Votre mot de passe et les appareils qui ont accès à votre
                  compte.
                </p>
              </div>
            </div>
            <div className="settings-form-grid settings-security-grid gap-4 grid grid-cols-2 items-start max-sm:grid-cols-1">
              <ChangePasswordCard />
              <SessionsCard />
            </div>
          </section>
          <section
            className="min-w-0 scroll-mt-6"
            id="account"
            aria-labelledby="account-title"
          >
            <div className="settings-section-heading gap-3.5 flex items-start mb-4.5">
              <span
                className="grid place-items-center shrink-0 bg-[#e9effa] text-[#6681b0] rounded-[8px_8px_3px_8px] text-[11px] size-7.5"
                aria-hidden="true"
              >
                03
              </span>
              <div>
                <h2
                  className="mx-0 text-[19px] mt-0 mb-1.25 font-[650] tracking-[-0.4px]"
                  id="account-title"
                >
                  Votre compte
                </h2>
                <p className="m-0 text-[#77869c] text-xs leading-[1.6]">
                  Vous gardez le contrôle, jusqu’à la dernière brique.
                </p>
              </div>
            </div>
            <DeleteAccountCard />
          </section>
        </div>
      </div>
    </main>
  );
}
