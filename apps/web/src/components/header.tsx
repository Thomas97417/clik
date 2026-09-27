import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import UserMenu from "./user-menu";
import { ModeToggle } from "./mode-toggle";
import { buttonVariants } from "./ui/button";

const linkStyles =
  "text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-medium";

export default function Header() {
  return (
    <header className="border-b">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Toma Stack
          </Link>
          <nav className="flex items-center gap-4">
            <Authenticated>
              <Link to="/dashboard" className={linkStyles}>
                Dashboard
              </Link>
              <Link to="/settings" className={linkStyles}>
                Settings
              </Link>
              <Link to="/upload" className={linkStyles}>
                Upload
              </Link>
            </Authenticated>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Authenticated>
            <UserMenu />
          </Authenticated>
          <Unauthenticated>
            <Link
              to="/sign-in"
              className={buttonVariants({ variant: "outline" })}
            >
              Login
            </Link>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}
