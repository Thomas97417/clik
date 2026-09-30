import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { FolderOpen, Hammer, Images, UserRound, Trophy } from "lucide-react";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="clik. — Accueil">
        clik<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Navigation principale">
        <Link to="/editor" activeProps={{ className: "active" }}>
          <Hammer size={17} aria-hidden="true" />
          L’atelier
        </Link>
        <Link to="/gallery" activeProps={{ className: "active" }}>
          <Images size={17} aria-hidden="true" />
          La galerie
        </Link>
        <Link to="/challenges" activeProps={{ className: "active" }}>
          <Trophy size={17} aria-hidden="true" />
          Les défis
        </Link>
        <Link to="/projects" activeProps={{ className: "active" }}>
          <FolderOpen size={17} aria-hidden="true" />
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
            className="header-sign-in"
            onClick={() =>
              sessionStorage.setItem(
                "clik-return-to",
                window.location.pathname + window.location.search,
              )
            }
          >
            <UserRound size={17} aria-hidden="true" />
            Se connecter
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
