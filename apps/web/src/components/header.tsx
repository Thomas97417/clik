import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  ArrowUpRight,
  FolderOpen,
  Hammer,
  Images,
  UserRound,
  Trophy,
} from "lucide-react";
import UserMenu from "./user-menu";

const navigation = [
  { to: "/editor", label: "L’atelier", short: "Atelier", icon: Hammer },
  { to: "/gallery", label: "La galerie", short: "Galerie", icon: Images },
  { to: "/challenges", label: "Les défis", short: "Défis", icon: Trophy },
  {
    to: "/projects",
    label: "Mes créations",
    short: "Créations",
    icon: FolderOpen,
  },
] as const;

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="clik. — Accueil">
        clik<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Navigation principale">
        {navigation.map(({ to, label, short, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            activeProps={{ className: "active" }}
          >
            <span className="header-nav-block" aria-hidden="true">
              <Icon size={17} />
            </span>
            <span className="header-nav-label">{label}</span>
            <span className="header-nav-short" aria-hidden="true">
              {short}
            </span>
          </Link>
        ))}
      </nav>
      <div className="header-account">
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link
            to="/sign-in"
            className="header-sign-in"
            onClick={() =>
              sessionStorage.setItem(
                "clik-return-to",
                window.location.pathname + window.location.search,
              )
            }
          >
            <span className="header-avatar" aria-hidden="true">
              <UserRound size={16} />
            </span>
            <span>Se connecter</span>
            <ArrowUpRight
              className="header-account-chevron"
              size={14}
              aria-hidden="true"
            />
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
