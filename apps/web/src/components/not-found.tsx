import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import NotFoundArt from "./clik/not-found-art";

export default function NotFound() {
  return (
    <main className="not-found-page px-[5%] py-14 flex items-center justify-center min-h-full [@media(width<=760px)]:px-6 [@media(width<=760px)]:pt-8 [@media(width<=760px)]:pb-10">
      <div className="not-found-layout gap-7 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center w-full max-w-265 [@media(width<=760px)]:gap-3.5 [@media(width<=760px)]:grid-cols-[minmax(0,1fr)] [@media(width<=760px)]:max-w-115 [@media(width<=760px)]:text-center">
        <div className="not-found-copy">
          <h1 className="mx-0 mt-5 mb-4 text-[#202b40] text-[clamp(32px,_3.8vw,_46px)] font-extrabold leading-[1.15] tracking-[-1.5px] [@media(width<=760px)]:mt-4 [@media(width<=760px)]:text-[clamp(32px,_6vw,_40px)]">
            Page introuvable<span className="text-[#356ae6]">.</span>
          </h1>
          <p className="max-w-97.5 text-[#65738a] text-sm leading-[1.85] [@media(width<=760px)]:mx-auto [@media(width<=760px)]:text-[13px]">
            Cette page n’existe pas ou n’est plus disponible. Votre prochaine
            idée vous attend ailleurs dans Clik.
          </p>
          <div className="not-found-actions flex items-center flex-wrap gap-y-3 gap-x-5 mt-7 [@media(width<=760px)]:gap-y-2.5 [@media(width<=760px)]:mt-6 [@media(width<=760px)]:justify-center">
            <Link
              to="/"
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 not-found-primary px-4.25 py-2.5 rounded-[10px] bg-[#356ae6] text-white [box-shadow:0_4px_12px_#356ae61a] hover:bg-[#285abd] gap-2 inline-flex items-center justify-center min-h-11.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Retour à l’accueil
            </Link>
            <Link
              to="/gallery"
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 not-found-secondary rounded-[6px] text-[#536e99] hover:text-[#285abd] hover:underline hover:underline-offset-4 gap-2 inline-flex items-center justify-center min-h-11.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
            >
              Explorer la galerie <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <NotFoundArt />
      </div>
    </main>
  );
}
