import { cn } from "@/lib/utils";
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
    <main
      className={cn(
        "settings-page px-[36px] mx-[auto] my-[0] max-w-[1180px] pt-[48px] pb-[80px] text-[color:#26344c] [@media(width<=640px)]:px-[18px] [@media(width<=640px)]:pt-[28px] [@media(width<=640px)]:pb-[48px] [&_[class~='group/avatar-settings-card']]:p-[28px] [&_[class~='group/avatar-settings-card']]:gap-[26px] [&_[class~='group/avatar-settings-card']]:border-[length:1px] [&_[class~='group/avatar-settings-card']]:border-solid [&_[class~='group/avatar-settings-card']]:border-[color:#dbe5f6] [&_[class~='group/avatar-settings-card']]:flex [&_[class~='group/avatar-settings-card']]:items-center [&_[class~='group/avatar-settings-card']]:mb-[16px] [&_[class~='group/avatar-settings-card']]:rounded-[16px] [&_[class~='group/avatar-settings-card']]:[background:linear-gradient(120deg,_#edf3fe,_#fffaf5)] [@media(width<=640px)]:[&_[class~='group/avatar-settings-card']]:p-[20px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-card']]:gap-[18px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-card']]:items-start [@media(width<=640px)]:[&_[class~='group/avatar-settings-card']]:flex-col",
      )}
    >
      <header
        className={cn(
          "settings-heading px-[12px] gap-[32px] flex items-center justify-between pt-[0] pb-[38px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e7f0] [@media(width<=640px)]:px-[0] [@media(width<=640px)]:gap-[8px] [@media(width<=640px)]:items-start [@media(width<=640px)]:pb-[24px] [&_h1]:m-[0] [&_h1]:[font-size:clamp(36px,_4.2vw,_56px)] [&_h1]:font-[800] [&_h1]:leading-[1.1] [&_h1]:tracking-[-2px] [@media(width<=640px)]:[&_h1]:[font-size:35px] [@media(width<=640px)]:[&_h1]:tracking-[-1.5px] [&_em]:not-italic [&_em]:text-[color:#356ae6] [&_p]:mx-[0] [&_p]:max-w-[450px] [&_p]:mt-[20px] [&_p]:mb-[0] [&_p]:text-[color:#697a93] [&_p]:[font-size:14px] [&_p]:leading-[1.8] [@media(width<=640px)]:[&_p]:[font-size:12px]",
        )}
      >
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
      <div
        className={cn(
          "settings-layout gap-[40px] grid grid-cols-[170px_minmax(0,_1fr)] [align-items:start] pt-[38px] [@media(width<=1000px)]:gap-[28px] [@media(width<=1000px)]:grid-cols-[1fr] [@media(width<=1000px)]:pt-[22px]",
        )}
      >
        <aside
          className={cn(
            "settings-sidebar sticky top-[24px] [@media(width<=640px)]:gap-[12px] [@media(width<=640px)]:[position:static] [@media(width<=640px)]:block [@media(width<=640px)]:items-center [@media(width<=640px)]:justify-between [@media(640px<width<=1000px)]:gap-[12px] [@media(640px<width<=1000px)]:[position:static] [@media(640px<width<=1000px)]:flex [@media(640px<width<=1000px)]:items-center [@media(640px<width<=1000px)]:justify-between [&_nav]:gap-[8px] [&_nav]:grid [@media(width<=640px)]:[&_nav]:gap-[4px] [@media(width<=640px)]:[&_nav]:flex [@media(width<=640px)]:[&_nav]:flex-wrap [@media(width<=640px)]:[&_nav]:justify-between [@media(640px<width<=1000px)]:[&_nav]:gap-[4px] [@media(640px<width<=1000px)]:[&_nav]:flex [@media(640px<width<=1000px)]:[&_nav]:flex-wrap [&_nav_a]:px-[10px] [&_nav_a]:py-[12px] [&_nav_a]:gap-[12px] [&_nav_a]:flex [&_nav_a]:items-center [&_nav_a]:rounded-[8px] [&_nav_a]:text-[color:#435773] [&_nav_a]:[font-size:12px] [&_nav_a]:[transition:background_150ms] [@media(width<=640px)]:[&_nav_a]:px-[4px] [@media(width<=640px)]:[&_nav_a]:py-[9px] [@media(width<=640px)]:[&_nav_a]:gap-[5px] [@media(width<=640px)]:[&_nav_a]:[font-size:11px] [&_nav_a:hover]:bg-[#eaf0fc] [&_nav_a:hover]:text-[color:#356ae6] [&_nav_a:focus-visible]:bg-[#eaf0fc] [&_nav_a:focus-visible]:text-[color:#356ae6] [&_nav_a_span]:[font-size:10px] [&_nav_a_span]:text-[color:#94a5bd] [&_nav_a_span]:tabular-nums",
          )}
        >
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
            className={cn(
              "settings-profile-link px-[10px] gap-[8px] flex items-center pt-[20px] pb-[0] mt-[16px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e7f0] text-[color:#356ae6] [font-size:11px] [@media(width<=640px)]:px-[4px] [@media(width<=640px)]:m-[0] [@media(width<=640px)]:border-[length:0] [@media(width<=640px)]:border-none [@media(width<=640px)]:border-[color:currentColor] [@media(width<=640px)]:inline-flex [@media(width<=640px)]:pt-[12px] [@media(640px<width<=1000px)]:px-[0] [@media(640px<width<=1000px)]:py-[10px] [@media(640px<width<=1000px)]:m-[0] [@media(640px<width<=1000px)]:border-[length:0] [@media(640px<width<=1000px)]:border-none [@media(640px<width<=1000px)]:border-[color:currentColor] [&:hover]:[text-decoration:underline]",
            )}
          >
            Voir ma page publique <span aria-hidden="true">↗</span>
          </Link>
        </aside>
        <div
          className={cn(
            "settings-sections gap-[40px] min-w-[0] grid [&_>_section]:min-w-[0] [&_>_section]:[scroll-margin-top:24px]",
          )}
        >
          <section id="identity" aria-labelledby="identity-title">
            <div
              className={cn(
                "settings-section-heading gap-[14px] flex items-start mb-[18px] [&_>_span]:grid [&_>_span]:[place-items:center] [&_>_span]:w-[30px] [&_>_span]:h-[30px] [&_>_span]:shrink-[0] [&_>_span]:bg-[#e9effa] [&_>_span]:text-[color:#6681b0] [&_>_span]:rounded-[8px_8px_3px_8px] [&_>_span]:[font-size:11px] [&_h2]:mx-[0] [&_h2]:[font-size:19px] [&_h2]:mt-[0] [&_h2]:mb-[5px] [&_h2]:font-[650] [&_h2]:tracking-[-0.4px] [&_p]:m-[0] [&_p]:text-[color:#77869c] [&_p]:[font-size:12px] [&_p]:leading-[1.6]",
              )}
            >
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
            <div
              className={cn(
                "settings-form-grid gap-[16px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [align-items:start] [@media(width<=640px)]:grid-cols-[1fr] [&_>_form]:min-w-[0] [&_>_form]:h-[100%]",
              )}
            >
              <UpdateNameCard name={user.name} />
              <EmailCard email={user.email} />
            </div>
          </section>
          <section id="security" aria-labelledby="security-title">
            <div
              className={cn(
                "settings-section-heading gap-[14px] flex items-start mb-[18px] [&_>_span]:grid [&_>_span]:[place-items:center] [&_>_span]:w-[30px] [&_>_span]:h-[30px] [&_>_span]:shrink-[0] [&_>_span]:bg-[#e9effa] [&_>_span]:text-[color:#6681b0] [&_>_span]:rounded-[8px_8px_3px_8px] [&_>_span]:[font-size:11px] [&_h2]:mx-[0] [&_h2]:[font-size:19px] [&_h2]:mt-[0] [&_h2]:mb-[5px] [&_h2]:font-[650] [&_h2]:tracking-[-0.4px] [&_p]:m-[0] [&_p]:text-[color:#77869c] [&_p]:[font-size:12px] [&_p]:leading-[1.6]",
              )}
            >
              <span aria-hidden="true">02</span>
              <div>
                <h2 id="security-title">Les clés de votre atelier</h2>
                <p>
                  Votre mot de passe et les appareils qui ont accès à votre
                  compte.
                </p>
              </div>
            </div>
            <div
              className={cn(
                "settings-form-grid settings-security-grid gap-[16px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [align-items:start] [@media(width<=640px)]:grid-cols-[1fr] [&_>_form]:min-w-[0] [&_>_form]:h-[100%]",
              )}
            >
              <ChangePasswordCard />
              <SessionsCard />
            </div>
          </section>
          <section id="account" aria-labelledby="account-title">
            <div
              className={cn(
                "settings-section-heading gap-[14px] flex items-start mb-[18px] [&_>_span]:grid [&_>_span]:[place-items:center] [&_>_span]:w-[30px] [&_>_span]:h-[30px] [&_>_span]:shrink-[0] [&_>_span]:bg-[#e9effa] [&_>_span]:text-[color:#6681b0] [&_>_span]:rounded-[8px_8px_3px_8px] [&_>_span]:[font-size:11px] [&_h2]:mx-[0] [&_h2]:[font-size:19px] [&_h2]:mt-[0] [&_h2]:mb-[5px] [&_h2]:font-[650] [&_h2]:tracking-[-0.4px] [&_p]:m-[0] [&_p]:text-[color:#77869c] [&_p]:[font-size:12px] [&_p]:leading-[1.6]",
              )}
            >
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
