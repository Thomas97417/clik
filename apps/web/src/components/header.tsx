import { Link, useLocation } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserMenu from "./user-menu";

const navigation = [
  { to: "/editor", label: "L’atelier", short: "Atelier" },
  { to: "/gallery", label: "La galerie", short: "Galerie" },
  { to: "/challenges", label: "Les défis", short: "Défis" },
  { to: "/projects", label: "Mes créations", short: "Créations" },
] as const;

const compactQuery = "(max-width: 680px)";
function subscribeToCompactHeader(onChange: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getCompactHeader = () => window.matchMedia(compactQuery).matches;
const getServerCompactHeader = () => false;

export default function Header() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = useSyncExternalStore(
    subscribeToCompactHeader,
    getCompactHeader,
    getServerCompactHeader,
  );
  const current = navigation.find(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  );

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => setMenuOpen(false), [compact]);

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="clik. — Accueil">
        clik<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Navigation principale">
        <div className="header-nav-links">
          {navigation.map(({ to, label, short }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              activeProps={{ className: "active" }}
            >
              <span className="header-nav-label">{label}</span>
              <span className="header-nav-short" aria-hidden="true">
                {short}
              </span>
            </Link>
          ))}
        </div>
        {compact && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              className="header-nav-trigger"
              aria-label="Explorer les rubriques"
            >
              <span>{current?.short || "Explorer"}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="header-nav-menu"
              align="center"
              sideOffset={16}
            >
              {navigation.map(({ to, label }, index) => (
                <DropdownMenuItem
                  key={to}
                  render={<Link to={to} />}
                  nativeButton={false}
                  aria-current={current?.to === to ? "page" : undefined}
                >
                  <span className="header-nav-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  {label}
                  {current?.to === to && (
                    <span className="header-nav-dot" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
      <div className="header-account">
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link
            to="/sign-in"
            className="header-sign-in"
            aria-label="Se connecter"
            onClick={() =>
              sessionStorage.setItem(
                "clik-return-to",
                window.location.pathname + window.location.search,
              )
            }
          >
            Connexion
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
