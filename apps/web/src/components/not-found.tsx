import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-[10rem] leading-none font-bold tracking-tighter select-none">
          404
        </span>
        <h1 className="text-foreground text-xl font-semibold">
          Page not found
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link to="/">
        <Button variant="outline" size="lg">Go back home</Button>
      </Link>
    </div>
  );
}
