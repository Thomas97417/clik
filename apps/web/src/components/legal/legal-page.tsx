import { cn } from "@/lib/utils";
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
  className,
}: {
  variant?: "inline" | "card";
  className?: string;
}) {
  return (
    <a
      href={`mailto:${legalPublisher.email}`}
      className={cn(
        "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
        "outline-offset-3",
        "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]",
        variant === "card"
          ? "legal-contact-link legal-contact-card group/legal-contact-link flex-wrap items-center text-[13px] font-[650] text-[#356ae6] wrap-anywhere hover:text-[#224fab] group/legal-contact-card px-3 py-2.75 gap-0.75 border border-solid border-[#ccdbf4] grid w-full min-h-15.5 rounded-[11px] bg-white [transition:background-color_150ms,border-color_150ms] hover:border-[#91afe5] hover:bg-[#f3f7ff] motion-reduce:transition-none motion-reduce:duration-0"
          : "legal-contact-link group/legal-contact-link gap-1.75 inline-flex flex-wrap items-center text-[13px] font-[650] text-[#356ae6] wrap-anywhere hover:text-[#224fab]",
        className,
      )}
    >
      {variant === "card" ? (
        <>
          <span className="legal-contact-card-label gap-2 flex items-center justify-between text-xs font-[750] leading-normal">
            Nous contacter{" "}
            <ArrowUpRight className="shrink-0" size={16} aria-hidden="true" />
          </span>
          <span className="legal-contact-card-email text-[#5c7090] text-[11px] font-medium leading-[1.6] wrap-anywhere">
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
    <ol className="m-0 p-0 list-none">
      {sections.map(({ id, title: sectionTitle }, index) => (
        <li key={id}>
          <a
            className={cn(
              "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
              "outline-offset-3",
              "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px] px-3 py-2.5 gap-2.5 flex items-baseline -ml-3 rounded-[9px] text-xs leading-[1.55] text-[#64758c] hover:text-[#356ae6] hover:bg-[#edf3fc]",
              mobile
                ? "[@media(width<=760px)]:px-0 [@media(width<=760px)]:py-2.25 [@media(width<=760px)]:m-0"
                : "aria-[current=location]:text-[#356ae6] aria-[current=location]:bg-[#eaf0fc] aria-[current=location]:font-[650]",
            )}
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
            <span
              className="text-[#8799b0] text-[10px] tabular-nums"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            {sectionTitle}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <main
      ref={root}
      className={cn(
        "legal-page px-12 mx-auto my-0 max-w-300 pt-9 pb-18 [--legal-accent:#356ae6] [--legal-tint:#f2f6ff] [--legal-open-border:#c0d2f0] [@media(width<=360px)]:px-4.5 [@media(width<=360px)]:pt-6 [@media(width<=360px)]:pb-12 [@media(360px<width<=760px)]:px-6 [@media(360px<width<=760px)]:pt-6 [@media(360px<width<=760px)]:pb-12 [@media(760px<width<=1000px)]:px-8 print:[&&]:p-0 print:[&&]:max-w-none",
        `legal-page-${kind}`,
      )}
    >
      <header className="legal-hero px-0 gap-8.5 grid grid-cols-[1.35fr_1fr] items-center pt-14 pb-9 [@media(width<=760px)]:gap-0 [@media(width<=760px)]:grid-cols-1 [@media(width<=760px)]:pt-9.5 [@media(width<=760px)]:pb-6 [@media(760px<width<=1000px)]:gap-3 print:[&&]:block print:[&&]:pt-0">
        <div>
          <h1 className="mx-0 my-5 text-[clamp(38px,_4.2vw,_58px)] tracking-[-2.4px] leading-[1.12] font-[850] text-[#243148] [@media(width<=360px)]:text-[32px] [@media(width<=360px)]:tracking-[-1.5px] [@media(360px<width<=760px)]:text-[clamp(33px,_7vw,_46px)] [@media(360px<width<=760px)]:tracking-[-1.5px] [@media(760px<width<=1000px)]:text-[46px] print:text-3xl print:[&&]:text-3xl">
            {title}
            <br />
            <em className="not-italic text-[var(--legal-accent)]">{accent}.</em>
          </h1>
          <p className="legal-intro m-0 max-w-120 text-[#65758e] text-[15px] leading-[1.85] [@media(width<=760px)]:text-sm">
            {description}
          </p>
          <p className="legal-updated gap-1.75 flex flex-wrap mt-5.75 text-[#687b95] text-[11px]">
            Dernière mise à jour <span aria-hidden="true">·</span>{" "}
            <time dateTime={legalUpdatedAt}>{legalUpdatedLabel}</time>
          </p>
        </div>
        <LegalArt kind={kind} />
      </header>
      <details
        ref={mobileContents}
        className="legal-mobile-contents hidden [@media(width<=760px)]:border [@media(width<=760px)]:border-solid [@media(width<=760px)]:border-[#dbe4f1] [@media(width<=760px)]:block [@media(width<=760px)]:mb-8 [@media(width<=760px)]:rounded-[12px] [@media(width<=760px)]:bg-[#fff8] print:[&&]:hidden! group/legal-mobile-contents"
      >
        <summary className="[@media(width<=760px)]:px-4.5 [@media(width<=760px)]:py-4 [@media(width<=760px)]:flex [@media(width<=760px)]:items-center [@media(width<=760px)]:justify-between [@media(width<=760px)]:list-none [@media(width<=760px)]:text-[#435d85] [@media(width<=760px)]:text-[13px] [@media(width<=760px)]:font-[650] [@media(width<=760px)]:cursor-pointer [@media(width<=760px)]:[&::-webkit-details-marker]:hidden [@media(width<=760px)]:focus-visible:outline-3 [@media(width<=760px)]:focus-visible:outline-solid [@media(width<=760px)]:focus-visible:outline-[#a7c0f2] [@media(width<=760px)]:focus-visible:outline-offset-3 [@media(width<=760px)]:focus-visible:rounded-[9px]">
          Dans cette page{" "}
          <ChevronDown
            className="[@media(width<=760px)]:group-open/legal-mobile-contents:transform-[rotate(180deg)]"
            size={16}
            aria-hidden="true"
          />
        </summary>
        <nav
          className="[@media(width<=760px)]:px-4.5 [@media(width<=760px)]:pt-0 [@media(width<=760px)]:pb-3.5"
          aria-label="Sommaire"
        >
          {contents(true)}
        </nav>
      </details>
      <div className="legal-body gap-16 grid grid-cols-[220px_minmax(0,1fr)] items-start mt-4 [@media(width<=760px)]:gap-8 [@media(width<=760px)]:block [@media(width<=760px)]:grid-cols-[200px_minmax(0,1fr)] [@media(760px<width<=1000px)]:gap-8 [@media(760px<width<=1000px)]:grid-cols-[200px_minmax(0,1fr)] print:[&&]:block">
        <aside className="legal-sidebar sticky top-7 [@media(width<=760px)]:hidden print:[&&]:hidden!">
          <nav className="legal-contents" aria-label="Sommaire">
            {contents()}
          </nav>
          <div className="legal-help p-4.5 border border-solid border-[#d2e0f5] mt-6 rounded-[18px] [background:linear-gradient(145deg,#edf4ff,#fff_75%)] [box-shadow:0_5px_20px_#254c8507]">
            <div className="legal-help-heading gap-3 flex items-center justify-between mb-3">
              <LegalHelpArt />
            </div>
            <h2 className="mx-0 mt-0 mb-2 text-[17px] leading-[1.4] font-[750] tracking-[-0.3px] text-[#2d4266]">
              Une question ?
            </h2>
            <p className="mx-0 mt-0 mb-4.5 text-[#5c7090] text-xs leading-[1.8]">
              Écrivez-nous pour parler de vos données ou de votre utilisation de
              Clik.
            </p>
            <LegalContact
              className="focus-visible:rounded-[11px] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#8cace8] focus-visible:outline-offset-3"
              variant="card"
            />
          </div>
        </aside>
        <div className="legal-document min-w-0">
          <Accordion
            data-legal-document
            className="legal-accordion gap-3"
            multiple
            hiddenUntilFound
            value={expanded}
            onValueChange={setExpanded}
          >
            {sections.map(({ id, title: sectionTitle, content }, index) => (
              <AccordionItem
                key={id}
                value={id}
                className="legal-section overflow-hidden border border-solid border-[#e0e7f1] rounded-[14px] bg-white [transition:border-color_150ms] data-open:border-[var(--legal-open-border)] data-open:[box-shadow:0_4px_14px_#20396206] motion-reduce:transition-none print:[&&]:mb-3.5 print:[&&]:[border-top-width:0] print:[&&]:border-t-[currentColor] print:[&&]:[border-right-width:0] print:[&&]:border-r-[currentColor] print:[&&]:border-b print:[&&]:border-solid print:[&&]:border-b-[#ddd] print:[&&]:[border-left-width:0] print:[&&]:border-l-[currentColor] print:[&&]:rounded-none print:[&&]:[box-shadow:none] print:data-open:[&&]:shadow-[0_4px_14px_#20396206] motion-reduce:duration-0 print:data-open:[&&]:border-b-[var(--legal-open-border)]"
              >
                <AccordionTrigger
                  iconClassName="p-1.25 rounded-[8px] text-[var(--legal-accent)] bg-[#f0f4fa] size-6.5"
                  id={id}
                  className="legal-section-trigger px-5 py-4.5 gap-3 border-0 border-none [&&]:border-current flex items-center min-h-18.5 text-[#2c3b53] text-base leading-normal font-bold tracking-[-0.3px] scroll-mt-7 [@media(width<=360px)]:p-3.5 [@media(width<=360px)]:gap-2 [@media(width<=360px)]:min-h-17.5 [@media(width<=360px)]:text-sm [@media(width<=360px)]:scroll-mt-6 [@media(360px<width<=760px)]:p-4 [@media(360px<width<=760px)]:gap-2.5 [@media(360px<width<=760px)]:min-h-17.5 [@media(360px<width<=760px)]:text-[15px] [@media(360px<width<=760px)]:scroll-mt-6 hover:bg-[var(--legal-tint)] hover:text-[var(--legal-accent)] hover:no-underline aria-expanded:bg-[var(--legal-tint)] aria-expanded:text-[var(--legal-accent)] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:-outline-offset-4 print:[&&]:px-0 print:[&&]:py-3 print:[&&]:min-h-0 print:[&&]:text-[#222] print:[&&]:bg-transparent group/legal-section-trigger print:aria-expanded:[&&]:bg-[var(--legal-tint)] print:aria-expanded:[&&]:text-[var(--legal-accent)]"
                >
                  <span
                    className="legal-section-number group/legal-section-number grid place-items-center shrink-0 rounded-[8px] text-[#6a83aa] bg-[#f0f4fa] text-[10px] font-bold tabular-nums [@media(width<=360px)]:text-[9px] size-7.5 [@media(width<=360px)]:size-6.25 group-aria-expanded/legal-section-trigger:text-white group-aria-expanded/legal-section-trigger:bg-[var(--legal-accent)]"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="legal-section-title flex-1 min-w-0">
                    {sectionTitle}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="legal-section-content px-5 pt-4.5 pb-5.5 border-t border-solid border-t-[#edf1f7] [@media(width<=760px)]:p-4 print:[&&]:px-0 print:[&&]:border-0 print:[&&]:border-none print:[&&]:border-current print:[&&]:pt-0 print:[&&]:pb-3">
                  <div className="legal-prose text-[#55677f] text-sm leading-[1.95] [@media(width<=760px)]:text-[13px] print:[&&]:text-[#222] print:[&&]:text-[11px]">
                    {content}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="legal-ending gap-4 flex justify-between items-center flex-wrap mt-7 text-xs leading-[inherit] [@media(width<=760px)]:gap-3 [@media(width<=760px)]:items-start [@media(width<=760px)]:flex-col print:[&&]:hidden!">
            <Link
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px] gap-1.5 inline-flex items-center text-[#356ae6] font-[650]"
              to={kind === "privacy" ? "/terms" : "/privacy"}
            >
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
