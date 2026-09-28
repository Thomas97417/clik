import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Boxes } from "lucide-react";
import UserMenu from "./user-menu";
export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-icon">
          <Boxes size={24} />
        </span>
        clik<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Navigation principale">
        <Link to="/editor" activeProps={{ className: "active" }}>
          L’atelier
        </Link>
        <Link to="/gallery" activeProps={{ className: "active" }}>
          La galerie
        </Link>
        <Link to="/projects" activeProps={{ className: "active" }}>
          Mes créations
        </Link>
      </nav>
      <div className="header-account">
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link
            to="/sign-in"
            onClick={() =>
              sessionStorage.setItem(
                "clik-return-to",
                window.location.pathname + window.location.search,
              )
            }
          >
            Se connecter <span>↗</span>
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
