import { Link, useLocation } from "@tanstack/react-router";

export default function SiteFooter() {
  const pathname = useLocation({ select: (location) => location.pathname });
  if (pathname === "/editor" || pathname.startsWith("/editor/")) return null;
  return (
    <footer className="site-footer px-0 mx-auto my-0 flex shrink-0 items-center gap-y-4.5 gap-x-7 max-w-324 pt-6.5 pb-8 w-[90%] border-t border-solid border-t-[#e0e6ef] text-[#67788f] max-3xs:pt-5.5 max-3xs:w-[calc(100%-36px)] max-3xs:flex-wrap min-3xs:max-md-compact:pt-5.5 min-3xs:max-md-compact:w-[calc(100%-48px)] min-3xs:max-md-compact:flex-wrap print:[&&]:hidden!">
      <Link
        to="/"
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 site-footer-brand shrink-0 text-[28px] font-[850] text-[#243148] tracking-[-1.7px] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]"
        aria-label="Clik, accueil"
      >
        clik<span className="text-[#356ae6]">.</span>
      </Link>
      <p className="m-0 text-[11px] leading-[1.7]">
        Un espace pour construire.
        <br />
        Juste pour le plaisir.
      </p>
      <nav
        className="flex flex-wrap items-center justify-end gap-y-2.5 gap-x-5.5 ml-auto text-[11px] max-md-compact:m-0 max-md-compact:justify-start max-md-compact:gap-y-3.5 max-md-compact:basis-full max-md-compact:leading-[1.6]"
        aria-label="Informations et confidentialité"
      >
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px] aria-[current=page]:font-bold hover:text-[#356ae6]"
          to="/privacy"
          preload="viewport"
        >
          Confidentialité
        </Link>
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px] aria-[current=page]:font-bold hover:text-[#356ae6]"
          to="/terms"
          preload="viewport"
        >
          Conditions d’utilisation
        </Link>
      </nav>
    </footer>
  );
}
