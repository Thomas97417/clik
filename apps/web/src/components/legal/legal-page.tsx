import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Mail, type LucideIcon } from "lucide-react";
import LegalArt from "./legal-art";
import { legalPublisher, legalUpdatedAt, legalUpdatedLabel } from "@/lib/legal";

export type LegalSection = { id: string; title: string; content: ReactNode };
type Summary = {
  title: string;
  text: string;
  section: string;
  icon: LucideIcon;
};

export function LegalContact() {
  return (
    <a href={`mailto:${legalPublisher.email}`} className="legal-contact-link">
      <Mail size={17} aria-hidden="true" /> {legalPublisher.email}
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}

export default function LegalPage({
  kind,
  title,
  accent,
  description,
  summaries,
  sections,
}: {
  kind: "privacy" | "terms";
  title: string;
  accent: string;
  description: string;
  summaries: Summary[];
  sections: LegalSection[];
}) {
  const root = useRef<HTMLElement>(null);
  const mobileContents = useRef<HTMLDetailsElement>(null);
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    const scroll = root.current?.closest(".page-scroll");
    if (!scroll) return;
    let frame = 0;
    const update = () => {
      const top = scroll.getBoundingClientRect().top + 120;
      const current = sections
        .filter(({ id }) => {
          const heading = document.getElementById(id);
          return heading && heading.getBoundingClientRect().top <= top;
        })
        .at(-1);
      setActive(current?.id ?? sections[0].id);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  const contents = (mobile = false) => (
    <ol>
      {sections.map(({ id, title: sectionTitle }, index) => (
        <li key={id}>
          <a
            href={`#${id}`}
            aria-current={active === id ? "location" : undefined}
            onClick={() => {
              if (mobile && mobileContents.current)
                mobileContents.current.open = false;
            }}
          >
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {sectionTitle}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <main ref={root} className={`legal-page legal-page-${kind}`}>
      <header className="legal-hero">
        <div>
          <h1>
            {title}
            <br />
            <em>{accent}.</em>
          </h1>
          <p className="legal-intro">{description}</p>
          <p className="legal-updated">
            Dernière mise à jour <span aria-hidden="true">·</span>{" "}
            <time dateTime={legalUpdatedAt}>{legalUpdatedLabel}</time>
          </p>
        </div>
        <LegalArt kind={kind} />
      </header>
      <div className="legal-summaries" aria-label="Les points à retenir">
        {summaries.map(
          ({ title: summaryTitle, text, section, icon: Icon }, index) => (
            <a
              className={`legal-summary legal-summary-${index + 1}`}
              href={`#${section}`}
              key={summaryTitle}
            >
              <span className="legal-summary-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <h2>{summaryTitle}</h2>
                <p>{text}</p>
              </div>
              <ArrowUpRight
                className="legal-summary-arrow"
                size={16}
                aria-hidden="true"
              />
            </a>
          ),
        )}
      </div>
      <details ref={mobileContents} className="legal-mobile-contents">
        <summary>
          Dans cette page <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <nav aria-label="Sommaire">{contents(true)}</nav>
      </details>
      <div className="legal-body">
        <aside className="legal-sidebar">
          <nav className="legal-contents" aria-label="Sommaire">
            <p>Dans cette page</p>
            {contents()}
          </nav>
          <div className="legal-help">
            <span className="legal-help-icon">
              <Mail size={19} aria-hidden="true" />
            </span>
            <h2>Une question ?</h2>
            <p>
              Écrivez-nous pour parler de vos données ou de votre utilisation de
              Clik.
            </p>
            <LegalContact />
          </div>
        </aside>
        <div className="legal-document">
          {sections.map(({ id, title: sectionTitle, content }, index) => (
            <section key={id} aria-labelledby={id} className="legal-section">
              <div className="legal-section-heading">
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 id={id} tabIndex={-1}>
                  {sectionTitle}
                </h2>
              </div>
              <div className="legal-prose">{content}</div>
            </section>
          ))}
          <div className="legal-ending">
            <p>Merci de faire partie de l’atelier.</p>
            <Link to={kind === "privacy" ? "/terms" : "/privacy"}>
              {kind === "privacy"
                ? "Lire les conditions d’utilisation"
                : "Lire la politique de confidentialité"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
