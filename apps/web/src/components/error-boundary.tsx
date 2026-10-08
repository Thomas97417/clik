import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "./ui/button";

export default function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-8xl leading-none font-bold tracking-tighter select-none">
          Oops
        </span>
        <h1 className="text-foreground text-xl leading-(--text-xl--line-height) font-semibold">
          Cette page n’a pas pu être chargée
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm leading-(--text-sm--line-height)">
          Une erreur temporaire est survenue. Réessayez dans un instant.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg border bg-muted/50 p-4 text-left text-xs leading-(--text-xs--line-height) text-destructive group/text-xs">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="hover:cursor-pointer"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Réessayer
        </Button>
        <Button
          variant="ghost"
          size="lg"
          nativeButton={false}
          render={
            <Link
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3"
              to="/"
            />
          }
        >
          Retour à l’accueil
        </Button>
      </div>
    </div>
  );
}
