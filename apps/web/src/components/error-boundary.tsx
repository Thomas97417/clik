import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import ErrorArt from "./clik/error-art";
import { Button } from "./ui/button";

export default function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <main className="error-page site-blueprint px-[5%] py-14 flex items-center justify-center min-h-svh bg-[#f8fafc] font-sans [--font-sans:'Avenir_Next','Segoe_UI',sans-serif] max-md-compact:px-6 max-md-compact:pt-8 max-md-compact:pb-10">
      <div className="error-layout gap-7 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center w-full max-w-265 max-md-compact:gap-3.5 max-md-compact:grid-cols-[minmax(0,1fr)] max-md-compact:max-w-115 max-md-compact:text-center">
        <div className="error-copy min-w-0">
          <h1 className="mx-0 mt-5 mb-4 text-[#202b40] text-[clamp(32px,_3.8vw,_46px)] font-extrabold leading-[1.15] tracking-[-1.5px] max-md-compact:mt-4 max-md-compact:text-[clamp(32px,_6vw,_40px)]">
            Cette page n’a pas pu être chargée
            <span className="text-[#356ae6]">.</span>
          </h1>
          <p className="max-w-97.5 text-[#65738a] text-sm leading-[1.85] max-md-compact:mx-auto max-md-compact:text-[13px]">
            Une erreur temporaire est survenue. Réessayez dans un instant pour
            reprendre votre visite.
          </p>
          <div className="error-actions flex items-center flex-wrap gap-y-3 gap-x-5 mt-7 max-md-compact:gap-y-2.5 max-md-compact:mt-6 max-md-compact:justify-center">
            <Button
              className="error-primary px-4.25 py-2.5 rounded-[10px] bg-[#356ae6] text-white [box-shadow:0_4px_12px_#356ae61a] hover:bg-[#285abd] gap-2 min-h-11.5 h-auto text-[13px] font-semibold leading-normal focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
              onClick={() => {
                reset();
                router.invalidate();
              }}
            >
              <RotateCcw size={17} aria-hidden="true" />
              Réessayer
            </Button>
            <Link
              to="/"
              className="error-secondary [transition:background_0.15s,color_0.15s,box-shadow_0.15s] rounded-[6px] text-[#536e99] hover:text-[#285abd] hover:underline hover:underline-offset-4 gap-2 inline-flex items-center justify-center min-h-11.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Retour à l’accueil
            </Link>
          </div>
          {import.meta.env.DEV && error instanceof Error && (
            <details className="error-details mt-6 max-w-full rounded-[12px] border border-solid border-[#dfe7f3] bg-white/80 px-4 py-3 text-left text-[#65738a]">
              <summary className="cursor-pointer rounded-[4px] text-xs font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4">
                Détails de l’erreur
              </summary>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap wrap-anywhere text-xs leading-[1.7]">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        <ErrorArt />
      </div>
    </main>
  );
}
