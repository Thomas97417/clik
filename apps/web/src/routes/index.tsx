import { useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Castle,
  Check,
  ChevronRight,
  FolderOpen,
  GitBranch,
  House,
  TowerControl,
  Monitor,
  MousePointer2,
  Palette,
  Plus,
  Sparkles,
} from "lucide-react";
import { CATALOG, COLORS } from "@clik/scene";
import CreationPreview from "@/components/clik/creation-preview";
import { writeDraft } from "@/lib/clik/local";
import {
  STARTER_COLORS,
  STARTER_MODELS,
  starterScene,
  type StarterColor,
} from "@/lib/clik/starter-models";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clik — Faites place à vos idées" },
      {
        name: "description",
        content:
          "Votre atelier de construction 3D, directement dans le navigateur. Assemblez des briques, personnalisez un modèle et partagez vos créations.",
      },
    ],
  }),
  component: Home,
});
const modelIcons = [House, TowerControl, Castle];

function Home() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const [color, setColor] = useState<StarterColor>(STARTER_MODELS[0].color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const opening = useRef(false);
  const steps = useRef<HTMLElement>(null);
  const model = STARTER_MODELS[selected];
  const scene = useMemo(() => starterScene(model.id, color), [model.id, color]);
  const create = async (fromModel: boolean) => {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError(false);
    try {
      const id = crypto.randomUUID();
      if (fromModel) {
        await writeDraft(`guest:${id}`, {
          scene,
          title: `${model.name} · ma version`,
          stamp: crypto.randomUUID(),
          revision: 0,
          dirty: false,
        });
      }
      await navigate({ to: "/editor", search: { draft: id } });
    } catch {
      setError(true);
    } finally {
      opening.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <h1 id="home-title">
            Un petit clik<em>.</em>
            <br />
            Une <em>grande</em>
            <br /> <em>idée.</em>
          </h1>
          <p>
            Une maison, un phare, tout un château. Donnez forme à ce que vous
            avez en tête, brique après brique.
          </p>
          <div className="home-buttons home-desktop-actions">
            <button
              className="primary-link"
              disabled={busy}
              onClick={() => void create(false)}
            >
              <Plus size={18} aria-hidden="true" /> Créer une construction
            </button>
            <Link to="/gallery" className="home-text-link">
              Explorer la galerie <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-mobile-actions">
            <Link to="/gallery" className="primary-link">
              Explorer la galerie <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <p className="home-device-note">
            <Monitor size={15} aria-hidden="true" /> Pour construire, ouvrez
            l’atelier sur ordinateur.
          </p>
          <Link to="/projects" className="home-resume">
            <FolderOpen size={17} aria-hidden="true" /> Retrouver mes créations{" "}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-playground">
          <div className="home-model-viewer">
            <div
              className="home-model-options"
              role="group"
              aria-label="Choisir un modèle"
            >
              {STARTER_MODELS.map((item, index) => {
                const Icon = modelIcons[index];
                return (
                  <button
                    key={item.id}
                    aria-label={item.label}
                    aria-controls="home-model-preview"
                    aria-pressed={selected === index}
                    onClick={() => {
                      if (selected === index) return;
                      setSelected(index);
                      setColor(item.color);
                    }}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="home-model-stage" id="home-model-preview">
              <div className="home-model-halo" aria-hidden="true" />
              <CreationPreview
                interactive
                scene={scene}
                cacheKey={`starter-v3:${model.id}:${color}`}
                title={model.name}
              />
            </div>
          </div>
          <div className="home-palette-row">
            <span>Couleur d’accent</span>
            <div
              className="home-palette"
              role="group"
              aria-label="Couleur du modèle"
            >
              {STARTER_COLORS.map((swatch) => (
                <button
                  key={swatch.value}
                  style={{ "--swatch": swatch.value } as CSSProperties}
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.value}
                  title={swatch.name}
                  onClick={() => setColor(swatch.value)}
                >
                  {color === swatch.value && (
                    <Check size={17} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="home-model-details" aria-live="polite">
            <div>
              <h2>{model.name}</h2>
              <p>{model.description}</p>
            </div>
            <span className="home-model-count">
              <Blocks size={14} aria-hidden="true" /> {scene.nodes.length}{" "}
              pièces
            </span>
          </div>
          <div className="home-fork home-desktop-actions">
            <svg
              className="home-fork-path"
              viewBox="0 0 44 100"
              fill="none"
              aria-hidden="true"
            >
              <path className="home-fork-original" d="M8 9v80" />
              <path
                className="home-fork-branch"
                d="M8 9v18c0 24 28 12 28 36v12"
              />
              <circle cx="8" cy="9" r="4" />
              <circle className="home-fork-end" cx="36" cy="79" r="4" />
            </svg>
            <span className="home-fork-source">
              Le modèle est le point de départ.
            </span>
            <button
              className="home-model-start"
              aria-label={busy ? "Ouverture…" : "Créer ma version"}
              disabled={busy}
              onClick={() => void create(true)}
            >
              <span>
                <strong>
                  <GitBranch size={16} aria-hidden="true" />{" "}
                  {busy ? "Ouverture…" : "Créer ma version"}
                </strong>
                <span>Une copie à transformer. Une nouvelle direction.</span>
              </span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          </div>
          {error && (
            <p className="home-start-error" role="alert">
              Impossible d’ouvrir la création. Vérifiez que le stockage de votre
              navigateur est disponible, puis réessayez.
            </p>
          )}
        </div>
      </section>

      <div className="home-discover-bar">
        <span>
          <Blocks size={17} aria-hidden="true" /> {Object.keys(CATALOG).length}{" "}
          formes à assembler
        </span>
        <span>
          <Palette size={17} aria-hidden="true" /> {COLORS.length} couleurs à
          mélanger
        </span>
        <button
          onClick={() => {
            steps.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "start",
            });
            steps.current?.focus({ preventScroll: true });
          }}
        >
          Comment ça marche <ArrowDown size={16} aria-hidden="true" />
        </button>
      </div>

      <section
        ref={steps}
        tabIndex={-1}
        className="home-how"
        aria-labelledby="home-how-title"
      >
        <div className="home-section-heading">
          <div>
            <h2 id="home-how-title">
              Prenez le temps
              <br />
              de <em>jouer.</em>
            </h2>
          </div>
        </div>
        <div className="home-steps">
          <article>
            <div className="home-step-top">
              <span>01</span>
              <MousePointer2 size={25} aria-hidden="true" />
            </div>
            <h3>Posez la première pièce.</h3>
            <p>
              Glissez une forme dans l’atelier. Les pièces s’aimantent pour vous
              aider à les assembler.
            </p>
            <span className="home-step-label">
              <Blocks size={14} aria-hidden="true" /> Briques, plaques, pentes…
            </span>
          </article>
          <article>
            <div className="home-step-top">
              <span>02</span>
              <Palette size={25} aria-hidden="true" />
            </div>
            <h3>Faites-la à votre façon.</h3>
            <p>
              Changez les couleurs, tournez, dupliquez. Essayez une autre
              direction : vous pouvez toujours annuler.
            </p>
            <div className="home-step-colors" aria-hidden="true">
              {STARTER_COLORS.map((swatch) => (
                <span key={swatch.value} style={{ background: swatch.value }} />
              ))}
            </div>
          </article>
          <article>
            <div className="home-step-top">
              <span>03</span>
              <Sparkles size={25} aria-hidden="true" />
            </div>
            <h3>Gardez-la. Ou partagez-la.</h3>
            <p>
              Retrouvez votre création sur cet appareil. Avec un compte,
              conservez-la en ligne et publiez-la quand vous le souhaitez.
            </p>
            <span className="home-step-label">
              <Check size={14} aria-hidden="true" /> Vous choisissez ce qui est
              public.
            </span>
          </article>
        </div>
      </section>

      <section className="home-next" aria-label="Poursuivre l’aventure">
        <Link to="/gallery" className="home-gallery-link">
          <div>
            <span className="eyebrow">L’imagination se partage</span>
            <h2>
              Une idée en fait
              <br />
              naître une autre.
            </h2>
            <p>
              Explorez la galerie, ouvrez une création
              <br />
              et inventez sa prochaine version.
            </p>
            <span className="home-next-action">
              Découvrir la galerie <ArrowUpRight size={19} aria-hidden="true" />
            </span>
          </div>
          <div className="home-gallery-art" aria-hidden="true">
            <span className="home-art-brick brick-one">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="home-art-brick brick-two">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="home-art-brick brick-three">
              <i />
              <i />
            </span>
            <span className="home-art-spark">✳</span>
          </div>
        </Link>
        <Link to="/projects" className="home-projects-link">
          <span className="home-projects-icon">
            <FolderOpen size={28} aria-hidden="true" />
          </span>
          <h2>
            Vos idées ont
            <br />
            leur place ici.
          </h2>
          <p>
            Petites expériences et grandes constructions : retrouvez tout dans
            votre collection.
          </p>
          <span className="home-next-action">
            Mes créations <ArrowUpRight size={19} aria-hidden="true" />
          </span>
        </Link>
      </section>
      <footer className="home-footer">
        <Link to="/" aria-label="Clik, accueil">
          clik<span>.</span>
        </Link>
        <p>Un espace pour construire. Juste pour le plaisir.</p>
        <span>À vous de jouer.</span>
      </footer>
    </main>
  );
}
