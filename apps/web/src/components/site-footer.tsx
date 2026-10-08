import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

export default function SiteFooter() {
  const pathname = useLocation({ select: (location) => location.pathname });
  if (pathname === "/editor" || pathname.startsWith("/editor/")) return null;
  return (
    <footer
      className={cn(
        "site-footer [&_a:focus-visible]:[outline:3px_solid_#a7c0f2] [&_a:focus-visible]:[outline-offset:4px] [&_a:focus-visible]:rounded-[5px] px-[0] mx-[auto] my-[0] flex shrink-[0] items-center gap-y-[18px] gap-x-[28px] max-w-[1296px] pt-[26px] pb-[32px] w-[90%] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e6ef] text-[color:#67788f] [@media(width<=360px)]:pt-[22px] [@media(width<=360px)]:w-[calc(100%_-_36px)] [@media(width<=360px)]:flex-wrap [@media(360px<width<=760px)]:pt-[22px] [@media(360px<width<=760px)]:w-[calc(100%_-_48px)] [@media(360px<width<=760px)]:flex-wrap [&_>_p]:m-[0] [&_>_p]:[font-size:11px] [&_>_p]:leading-[1.7] [&_nav]:flex [&_nav]:flex-wrap [&_nav]:items-center [&_nav]:justify-end [&_nav]:gap-y-[10px] [&_nav]:gap-x-[22px] [&_nav]:ml-[auto] [&_nav]:[font-size:11px] [@media(width<=760px)]:[&_nav]:m-[0] [@media(width<=760px)]:[&_nav]:justify-start [@media(width<=760px)]:[&_nav]:gap-y-[14px] [@media(width<=760px)]:[&_nav]:basis-[100%] [@media(width<=760px)]:[&_nav]:leading-[1.6] [&_nav_a[aria-current='page']]:font-[700] [&_nav_a:hover]:text-[color:#356ae6] print:[&&]:hidden!",
      )}
    >
      <Link
        to="/"
        className={cn(
          "site-footer-brand shrink-[0] [font-size:28px] font-[850] text-[color:#243148] tracking-[-1.7px] [&_span]:text-[color:#356ae6]",
        )}
        aria-label="Clik, accueil"
      >
        clik<span>.</span>
      </Link>
      <p>
        Un espace pour construire.
        <br />
        Juste pour le plaisir.
      </p>
      <nav aria-label="Informations et confidentialité">
        <Link to="/privacy">Confidentialité</Link>
        <Link to="/terms">Conditions d’utilisation</Link>
      </nav>
    </footer>
  );
}
