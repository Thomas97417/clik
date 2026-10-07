import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import NotFoundArt from "./clik/not-found-art";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-layout">
        <div className="not-found-copy">
          <h1>
            Page introuvable<span>.</span>
          </h1>
          <p>
            Cette page n’existe pas ou n’est plus disponible. Votre prochaine
            idée vous attend ailleurs dans Clik.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="not-found-primary">
              <ArrowLeft size={17} aria-hidden="true" />
              Retour à l’accueil
            </Link>
            <Link to="/gallery" className="not-found-secondary">
              Explorer la galerie <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <NotFoundArt />
      </div>
    </main>
  );
}
