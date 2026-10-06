import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Cloud, FolderHeart, Globe } from "lucide-react";

function StoryCube({
  x,
  y,
  tone = "blue",
  rotation = 0,
  scale = 1,
}: {
  x: number;
  y: number;
  tone?: "blue" | "sky" | "peach" | "cream";
  rotation?: number;
  scale?: number;
}) {
  return (
    <g
      className={`auth-cube auth-cube-${tone}`}
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
      strokeLinejoin="round"
    >
      <path className="auth-cube-left" d="M-32 0 0 18V56L-32 38Z" />
      <path className="auth-cube-right" d="M0 18 32 0V38L0 56Z" />
      <path className="auth-cube-top" d="m0-18 32 18-32 18-32-18Z" />
      <path
        d="M-32 0 0 18 32 0M0 18V56"
        fill="none"
        stroke="#fff"
        strokeOpacity=".2"
      />
      <path className="auth-cube-right" d="M-11-6V0a11 6 0 0 0 22 0V-6Z" />
      <ellipse
        className="auth-cube-top"
        cy="-6"
        rx="11"
        ry="6"
        stroke="#fff"
        strokeOpacity=".35"
      />
    </g>
  );
}

function StoryConstruction() {
  return (
    <svg
      className="auth-construction"
      viewBox="0 0 480 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* A small, unfinished assembly, with pieces still waiting to find a place. */}
      <ellipse
        cx="247"
        cy="253"
        rx="130"
        ry="35"
        fill="#356ae6"
        opacity=".045"
      />
      <g stroke="#c5d4ed" strokeWidth="1" strokeLinecap="round">
        <path
          d="m113 214 135 76 142-80M153 191l135 76M193 169l135 76M153 236l142-80M193 258l142-80"
          opacity=".65"
        />
        <path d="m88 116 5-3m-5 3 5 3m-5-3v6M387 105l5-3m-5 3 5 3m-5-3v6M352 284l5-3m-5 3 5 3m-5-3v6" />
      </g>
      <ellipse cx="94" cy="253" rx="33" ry="10" fill="#dce4f2" opacity=".6" />
      <ellipse cx="392" cy="246" rx="32" ry="10" fill="#dce4f2" opacity=".6" />
      <StoryCube x={132} y={115} tone="cream" rotation={-12} scale={0.66} />
      <StoryCube x={349} y={148} tone="sky" rotation={10} scale={0.75} />
      <StoryCube x={246} y={163} tone="sky" />
      <StoryCube x={214} y={181} />
      <StoryCube x={278} y={181} tone="sky" />
      <StoryCube x={246} y={199} tone="cream" />
      <StoryCube x={214} y={143} />
      <g
        stroke="#8ca9dc"
        strokeWidth="1.25"
        strokeDasharray="4 5"
        strokeLinejoin="round"
      >
        <path d="m278 125 32 18v38l-32 18-32-18v-38Zm-32 18 32 18 32-18m-32 18v38" />
        <path d="M246 106v24m64-24v24M278 124v24" opacity=".6" />
      </g>
      <StoryCube x={278} y={66} tone="peach" />
      <StoryCube x={91} y={204} tone="peach" rotation={-14} scale={0.8} />
      <StoryCube x={391} y={197} rotation={14} scale={0.78} />
    </svg>
  );
}

export default function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
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
          <h2>
            De petites briques.
            <br />
            <em>De grandes idées.</em>
          </h2>
          <p>
            Assemblez, recommencez, inventez. Votre prochain monde commence par
            une idée, et quelques briques.
          </p>
          <div className="auth-story-art">
            <StoryConstruction />
            <p className="auth-story-caption">
              Un peu d’imagination. Et tout prend forme.
            </p>
          </div>
          <ul className="auth-benefits">
            <li>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>Retrouvez</strong> vos créations partout
              </span>
            </li>
            <li>
              <FolderHeart size={18} aria-hidden="true" />
              <span>
                <strong>Explorez</strong> toutes vos idées
              </span>
            </li>
            <li>
              <Globe size={18} aria-hidden="true" />
              <span>
                <strong>Partagez</strong> votre univers
              </span>
            </li>
          </ul>
        </aside>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <h1 ref={heading} id="auth-title" tabIndex={-1}>
              {title}
              {!/[?!]$/.test(title) && <span>.</span>}
            </h1>
            <p>{description}</p>
          </div>
          {children}
          <nav
            className="auth-legal-links"
            aria-label="Informations sur vos données et vos droits"
          >
            <Link to="/privacy">Confidentialité</Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms">Conditions d’utilisation</Link>
          </nav>
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
