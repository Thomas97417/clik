import { Link, useLocation } from "@tanstack/react-router";

export default function SiteFooter() {
  const pathname = useLocation({ select: (location) => location.pathname });
  if (pathname === "/editor" || pathname.startsWith("/editor/")) return null;
  return (
    <footer className="site-footer">
      <Link to="/" className="site-footer-brand" aria-label="Clik, accueil">
        clik<span>.</span>
      </Link>
      <p>
        Un espace pour construire.
        <br />
        Juste pour le plaisir.
      </p>
      <nav aria-label="Informations et confidentialité">
        <Link to="/privacy">Confidentialité</Link>
        <Link to="/terms">Conditions d’utilisation</Link>
      </nav>
    </footer>
  );
}
