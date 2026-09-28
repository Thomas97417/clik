import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Box, Move3D, Sparkles } from "lucide-react";
import { makePart, emptyScene } from "@clik/scene";
import ClientScene from "@/components/clik/client-scene";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clik — Faites place à vos idées" },
      {
        name: "description",
        content:
          "Un atelier de construction 3D. Assemblez des briques, partagez vos créations et réinventez celles de la communauté.",
      },
    ],
  }),
  component: Home,
});
const demo = emptyScene();
const add = (
  type: Parameters<typeof makePart>[0],
  color: Parameters<typeof makePart>[1],
  p: Parameters<typeof makePart>[2],
) => {
  const part = makePart(type, color, p);
  part.id = `demo-${demo.nodes.length}`;
  demo.nodes.push(part);
};
for (let z = 0; z < 3; z++) add("plate-2x4", "#41a66b", [0, 0, z * 2 - 2]);
for (let y = 0; y < 3; y++) {
  add("brick-1x4", "#f8cc36", [0, 0.4 + y * 1.2, -2.5]);
  add("brick-1x2", "#f8cc36", [-1, 0.4 + y * 1.2, 2.5]);
  add("brick-1x2", "#f8cc36", [1, 0.4 + y * 1.2, 2.5]);
  for (const x of [-1.5, 1.5]) {
    add("brick-1x2", y === 1 ? "#29b8b2" : "#f8cc36", [
      x,
      0.4 + y * 1.2,
      -0.75,
    ]);
    add("brick-1x2", "#f8cc36", [x, 0.4 + y * 1.2, 1]);
  }
}
for (const z of [-2, 0, 2]) add("plate-2x4", "#ef4444", [0, 4, z]);
add("brick-2x2", "#ef4444", [0, 4.4, 0]);
add("brick-1x2", "#f5f5f3", [0.5, 5.6, 0]);
function Home() {
  return (
    <main className="home">
      <section className="home-intro">
        <div className="home-copy">
          <span className="eyebrow">
            <span /> Un espace pour votre imagination
          </span>
          <h1>
            Petites briques.
            <br />
            Grandes <em>idées.</em>
          </h1>
          <p>
            Assemblez, essayez, recommencez.
            <br />
            Votre prochain monde commence par un clik.
          </p>
          <div className="home-buttons">
            <Link to="/editor" className="primary-link">
              Ouvrir l’atelier <ArrowRight size={18} />
            </Link>
            <Link to="/gallery" className="secondary-link">
              Explorer la galerie
            </Link>
          </div>
          <span className="home-note">
            Gratuit · Sans compte pour commencer · Sur ordinateur
          </span>
        </div>
        <div className="home-scene">
          <ClientScene scene={demo} />
          <span className="demo-label">
            <Box size={15} /> Une maison, mille possibilités
          </span>
          <span className="demo-help">Psst… vous pouvez la faire tourner.</span>
        </div>
      </section>
      <section className="home-strip">
        <article>
          <Box />
          <div>
            <h2>Juste une brique pour commencer.</h2>
            <p>10 pièces, 12 couleurs, aucune règle imposée.</p>
          </div>
        </article>
        <article>
          <Move3D />
          <div>
            <h2>Faites de la place à vos idées.</h2>
            <p>Déplacez, tournez et assemblez librement.</p>
          </div>
        </article>
        <article>
          <Sparkles />
          <div>
            <h2>L’inspiration se construit ensemble.</h2>
            <p>Partagez une création. Inventez sa prochaine version.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
