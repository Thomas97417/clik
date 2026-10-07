import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import LegalArt from "./legal-art";
import LegalHelpArt from "./legal-help-art";
import { legalPublisher, legalUpdatedAt, legalUpdatedLabel } from "@/lib/legal";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalContact({
  variant = "inline",
}: {
  variant?: "inline" | "card";
}) {
  return (
    <a
      href={`mailto:${legalPublisher.email}`}
      className={
        variant === "card"
          ? "legal-contact-link legal-contact-card"
          : "legal-contact-link"
      }
    >
      {variant === "card" ? (
        <>
          <span className="legal-contact-card-label">
            Nous contacter <ArrowUpRight size={16} aria-hidden="true" />
          </span>
          <span className="legal-contact-card-email">
            {legalPublisher.email}
          </span>
        </>
      ) : (
        <>
          <Mail size={17} aria-hidden="true" /> {legalPublisher.email}
          <ArrowUpRight size={15} aria-hidden="true" />
        </>
      )}
    </a>
  );
}

export default function LegalPage({
  kind,
  title,
  accent,
  description,
  sections,
}: {
  kind: "privacy" | "terms";
  title: string;
  accent: string;
  description: string;
  sections: LegalSection[];
}) {
  const root = useRef<HTMLElement>(null);
  const mobileContents = useRef<HTMLDetailsElement>(null);
  const [active, setActive] = useState(sections[0].id);
  const [expanded, setExpanded] = useState<string[]>([sections[0].id]);
  const hash = useLocation({ select: (location) => location.hash });

  useEffect(() => {
    if (!sections.some(({ id }) => id === hash)) return;
    setExpanded((current) =>
      current.includes(hash) ? current : [...current, hash],
    );
    const frame = requestAnimationFrame(() =>
      document.getElementById(hash)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash, sections]);

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
              setExpanded((current) =>
                current.includes(id) ? current : [...current, id],
              );
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
      <details ref={mobileContents} className="legal-mobile-contents">
        <summary>
          Dans cette page <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <nav aria-label="Sommaire">{contents(true)}</nav>
      </details>
      <div className="legal-body">
        <aside className="legal-sidebar">
          <nav className="legal-contents" aria-label="Sommaire">
            {contents()}
          </nav>
          <div className="legal-help">
            <div className="legal-help-heading">
              <LegalHelpArt />
            </div>
            <h2>Une question ?</h2>
            <p>
              Écrivez-nous pour parler de vos données ou de votre utilisation de
              Clik.
            </p>
            <LegalContact variant="card" />
          </div>
        </aside>
        <div className="legal-document">
          <Accordion
            className="legal-accordion"
            multiple
            hiddenUntilFound
            value={expanded}
            onValueChange={setExpanded}
          >
            {sections.map(({ id, title: sectionTitle, content }, index) => (
              <AccordionItem key={id} value={id} className="legal-section">
                <AccordionTrigger id={id} className="legal-section-trigger">
                  <span className="legal-section-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="legal-section-title">{sectionTitle}</span>
                </AccordionTrigger>
                <AccordionContent className="legal-section-content">
                  <div className="legal-prose">{content}</div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="legal-ending">
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
