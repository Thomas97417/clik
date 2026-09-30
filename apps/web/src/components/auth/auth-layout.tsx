import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Cloud,
  FolderHeart,
  Globe,
  type LucideIcon,
} from "lucide-react";
import CreationPreview from "@/components/clik/creation-preview";
import { starterScene } from "@/lib/clik/starter-models";

const scene = starterScene("house", "#4079e8");

export default function AuthLayout({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previousTitle = useRef(title);
  useEffect(() => {
    if (previousTitle.current !== title) heading.current?.focus();
    previousTitle.current = title;
  }, [title]);
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-story" aria-label="Votre espace Clik">
          <span className="eyebrow">
            <span className="auth-dot" /> L’atelier de vos idées
          </span>
          <h2>
            Vos idées.
            <br />
            <em>Un monde à vous.</em>
          </h2>
          <p>
            Un petit clik pour retrouver vos constructions et leur donner une
            nouvelle dimension.
          </p>
          <div className="auth-model" aria-hidden="true">
            <div className="auth-model-heading">
              <span className="auth-dot" /> Tout commence par une brique
            </div>
            <div className="auth-model-stage">
              <CreationPreview
                scene={scene}
                cacheKey="auth-house-v1"
                title="Votre prochaine idée"
              />
            </div>
            <span className="auth-model-caption">
              À construire. À transformer. À partager.
            </span>
          </div>
          <ul className="auth-benefits">
            <li>
              <Cloud size={18} aria-hidden="true" />
              <span>Vos créations, d’un appareil à l’autre.</span>
            </li>
            <li>
              <FolderHeart size={18} aria-hidden="true" />
              <span>Un espace pour toutes vos idées.</span>
            </li>
            <li>
              <Globe size={18} aria-hidden="true" />
              <span>Une galerie pour les partager.</span>
            </li>
          </ul>
        </aside>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <span className="auth-icon">
              <Icon size={23} aria-hidden="true" />
            </span>
            <span className="eyebrow">{eyebrow}</span>
            <h1 ref={heading} id="auth-title" tabIndex={-1}>
              {title}
              {!/[?!]$/.test(title) && <span>.</span>}
            </h1>
            <p>{description}</p>
          </div>
          {children}
        </section>
      </div>
      <div className="auth-page-footer">
        <Link to="/">
          <ArrowLeft size={15} aria-hidden="true" /> Retour à l’accueil
        </Link>
        <span>
          Juste envie d’essayer ?{" "}
          <Link to="/editor">Ouvrir l’atelier sans compte</Link>
        </span>
      </div>
    </main>
  );
}
