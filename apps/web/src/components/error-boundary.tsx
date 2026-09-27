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
        <h1 className="text-foreground text-xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg border bg-muted/50 p-4 text-left text-xs text-destructive">
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
          Try again
        </Button>
        <Link to="/">
          <Button variant="ghost" size="lg" className="hover:cursor-pointer">
            Go back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
