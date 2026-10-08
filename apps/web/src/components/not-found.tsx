import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import NotFoundArt from "./clik/not-found-art";

export default function NotFound() {
  return (
    <main
      className={cn(
        "not-found-page px-[5%] py-[56px] flex items-center justify-center min-h-[100%] [@media(width<=760px)]:px-[24px] [@media(width<=760px)]:pt-[32px] [@media(width<=760px)]:pb-[40px]",
      )}
    >
      <div
        className={cn(
          "not-found-layout gap-[28px] grid grid-cols-[minmax(0,_1fr)_minmax(0,_1.15fr)] items-center w-[100%] max-w-[1060px] [@media(width<=760px)]:gap-[14px] [@media(width<=760px)]:grid-cols-[minmax(0,_1fr)] [@media(width<=760px)]:max-w-[460px] [@media(width<=760px)]:text-center",
        )}
      >
        <div
          className={cn(
            "not-found-copy [&_h1]:mx-[0] [&_h1]:mt-[20px] [&_h1]:mb-[16px] [&_h1]:text-[color:#202b40] [&_h1]:[font-size:clamp(32px,_3.8vw,_46px)] [&_h1]:font-[800] [&_h1]:leading-[1.15] [&_h1]:tracking-[-1.5px] [@media(width<=760px)]:[&_h1]:mt-[16px] [@media(width<=760px)]:[&_h1]:[font-size:clamp(32px,_6vw,_40px)] [&_h1_>_span]:text-[color:#356ae6] [&_p]:max-w-[390px] [&_p]:text-[color:#65738a] [&_p]:[font-size:14px] [&_p]:leading-[1.85] [@media(width<=760px)]:[&_p]:mx-[auto] [@media(width<=760px)]:[&_p]:[font-size:13px]",
          )}
        >
          <h1>
            Page introuvable<span>.</span>
          </h1>
          <p>
            Cette page n’existe pas ou n’est plus disponible. Votre prochaine
            idée vous attend ailleurs dans Clik.
          </p>
          <div
            className={cn(
              "not-found-actions flex items-center flex-wrap gap-y-[12px] gap-x-[20px] mt-[28px] [@media(width<=760px)]:gap-y-[10px] [@media(width<=760px)]:mt-[24px] [@media(width<=760px)]:justify-center [&_a]:gap-[8px] [&_a]:inline-flex [&_a]:items-center [&_a]:justify-center [&_a]:min-h-[46px] [&_a]:[font-size:13px] [&_a]:font-[600] [&_a:focus-visible]:[outline:2px_solid_#356ae6] [&_a:focus-visible]:[outline-offset:4px]",
            )}
          >
            <Link
              to="/"
              className={cn(
                "not-found-primary px-[17px] py-[10px] rounded-[10px] bg-[#356ae6] text-[color:#fff] [box-shadow:0_4px_12px_#356ae61a] [&:hover]:bg-[#285abd]",
              )}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Retour à l’accueil
            </Link>
            <Link
              to="/gallery"
              className={cn(
                "not-found-secondary rounded-[6px] text-[color:#536e99] [&:hover]:text-[color:#285abd] [&:hover]:[text-decoration:underline] [&:hover]:underline-offset-[4px]",
              )}
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
