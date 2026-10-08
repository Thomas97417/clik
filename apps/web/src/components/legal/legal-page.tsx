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
}: {
  variant?: "inline" | "card";
}) {
  return (
    <a
      href={`mailto:${legalPublisher.email}`}
      className={cn(
        variant === "card"
          ? "legal-contact-link legal-contact-card group/legal-contact-link gap-[7px] inline-flex flex-wrap items-center [font-size:13px] font-[650] text-[color:#356ae6] [overflow-wrap:anywhere] [&:hover]:text-[color:#224fab] group/legal-contact-card px-[12px] py-[11px] gap-[3px] border-[length:1px] border-solid border-[color:#ccdbf4] grid w-[100%] min-h-[62px] rounded-[11px] bg-[#fff] [transition:background-color_150ms,_border-color_150ms] [&:hover]:border-[color:#91afe5] [&:hover]:bg-[#f3f7ff] motion-reduce:[transition:none]"
          : "legal-contact-link group/legal-contact-link gap-[7px] inline-flex flex-wrap items-center [font-size:13px] font-[650] text-[color:#356ae6] [overflow-wrap:anywhere] [&:hover]:text-[color:#224fab]",
      )}
    >
      {variant === "card" ? (
        <>
          <span
            className={cn(
              "legal-contact-card-label gap-[8px] flex items-center justify-between [font-size:12px] font-[750] leading-[1.5] [&_>_svg]:shrink-[0]",
            )}
          >
            Nous contacter <ArrowUpRight size={16} aria-hidden="true" />
          </span>
          <span
            className={cn(
              "legal-contact-card-email text-[color:#5c7090] [font-size:11px] font-[500] leading-[1.6] [overflow-wrap:anywhere]",
            )}
          >
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
    <main
      ref={root}
      className={cn(
        "legal-page px-[48px] mx-[auto] my-[0] max-w-[1200px] pt-[36px] pb-[72px] [--legal-accent:#356ae6] [--legal-tint:#f2f6ff] [--legal-open-border:#c0d2f0] [@media(width<=360px)]:px-[18px] [@media(width<=360px)]:pt-[24px] [@media(width<=360px)]:pb-[48px] [@media(360px<width<=760px)]:px-[24px] [@media(360px<width<=760px)]:pt-[24px] [@media(360px<width<=760px)]:pb-[48px] [@media(760px<width<=1000px)]:px-[32px] [&_a:focus-visible]:[outline:3px_solid_#a7c0f2] [&_a:focus-visible]:[outline-offset:4px] [&_a:focus-visible]:rounded-[5px] print:[&&]:p-[0] print:[&&]:max-w-[none]",
        `legal-page-${kind}`,
      )}
    >
      <header
        className={cn(
          "legal-hero px-[0] gap-[34px] grid grid-cols-[1.35fr_1fr] items-center pt-[56px] pb-[36px] [@media(width<=760px)]:gap-[0] [@media(width<=760px)]:grid-cols-[1fr] [@media(width<=760px)]:pt-[38px] [@media(width<=760px)]:pb-[24px] [@media(760px<width<=1000px)]:gap-[12px] [&_h1]:mx-[0] [&_h1]:my-[20px] [&_h1]:[font-size:clamp(38px,_4.2vw,_58px)] [&_h1]:tracking-[-2.4px] [&_h1]:leading-[1.12] [&_h1]:font-[850] [&_h1]:text-[color:#243148] [@media(width<=360px)]:[&_h1]:[font-size:32px] [@media(width<=360px)]:[&_h1]:tracking-[-1.5px] [@media(360px<width<=760px)]:[&_h1]:[font-size:clamp(33px,_7vw,_46px)] [@media(360px<width<=760px)]:[&_h1]:tracking-[-1.5px] [@media(760px<width<=1000px)]:[&_h1]:[font-size:46px] [&_h1_em]:not-italic [&_h1_em]:text-[color:var(--legal-accent)] print:[&&]:block print:[&&]:pt-[0] print:[&&]:[&_h1]:[font-size:30px]",
        )}
      >
        <div>
          <h1>
            {title}
            <br />
            <em>{accent}.</em>
          </h1>
          <p
            className={cn(
              "legal-intro m-[0] max-w-[480px] text-[color:#65758e] [font-size:15px] leading-[1.85] [@media(width<=760px)]:[font-size:14px]",
            )}
          >
            {description}
          </p>
          <p
            className={cn(
              "legal-updated gap-[7px] flex flex-wrap mt-[23px] text-[color:#687b95] [font-size:11px]",
            )}
          >
            Dernière mise à jour <span aria-hidden="true">·</span>{" "}
            <time dateTime={legalUpdatedAt}>{legalUpdatedLabel}</time>
          </p>
        </div>
        <LegalArt kind={kind} />
      </header>
      <details
        ref={mobileContents}
        className={cn(
          "legal-mobile-contents [&_ol]:p-[0] [&_ol]:m-[0] [&_ol]:list-none [&_a]:px-[12px] [&_a]:py-[10px] [&_a]:gap-[10px] [&_a]:flex [&_a]:items-baseline [&_a]:ml-[-12px] [&_a]:rounded-[9px] [&_a]:[font-size:12px] [&_a]:leading-[1.55] [&_a]:text-[color:#64758c] [@media(width<=760px)]:[&_a]:px-[0] [@media(width<=760px)]:[&_a]:py-[9px] [@media(width<=760px)]:[&_a]:m-[0] [&_a_>_span]:text-[color:#8799b0] [&_a_>_span]:[font-size:10px] [&_a_>_span]:tabular-nums [&_a:hover]:text-[color:#356ae6] [&_a:hover]:bg-[#edf3fc] hidden [@media(width<=760px)]:border-[length:1px] [@media(width<=760px)]:border-solid [@media(width<=760px)]:border-[color:#dbe4f1] [@media(width<=760px)]:block [@media(width<=760px)]:mb-[32px] [@media(width<=760px)]:rounded-[12px] [@media(width<=760px)]:bg-[#fff8] [@media(width<=760px)]:[&_summary]:px-[18px] [@media(width<=760px)]:[&_summary]:py-[16px] [@media(width<=760px)]:[&_summary]:flex [@media(width<=760px)]:[&_summary]:items-center [@media(width<=760px)]:[&_summary]:justify-between [@media(width<=760px)]:[&_summary]:list-none [@media(width<=760px)]:[&_summary]:text-[color:#435d85] [@media(width<=760px)]:[&_summary]:[font-size:13px] [@media(width<=760px)]:[&_summary]:font-[650] [@media(width<=760px)]:[&_summary]:cursor-[pointer] [@media(width<=760px)]:[&_summary::-webkit-details-marker]:hidden [@media(width<=760px)]:[&[open]_summary_>_svg]:[transform:rotate(180deg)] [@media(width<=760px)]:[&_nav]:px-[18px] [@media(width<=760px)]:[&_nav]:pt-[0] [@media(width<=760px)]:[&_nav]:pb-[14px] [@media(width<=760px)]:[&_summary:focus-visible]:[outline:3px_solid_#a7c0f2] [@media(width<=760px)]:[&_summary:focus-visible]:[outline-offset:3px] [@media(width<=760px)]:[&_summary:focus-visible]:rounded-[9px] print:[&&]:hidden!",
        )}
      >
        <summary>
          Dans cette page <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <nav aria-label="Sommaire">{contents(true)}</nav>
      </details>
      <div
        className={cn(
          "legal-body gap-[64px] grid grid-cols-[220px_minmax(0,_1fr)] [align-items:start] mt-[16px] [@media(width<=760px)]:gap-[32px] [@media(width<=760px)]:block [@media(width<=760px)]:grid-cols-[200px_minmax(0,_1fr)] [@media(760px<width<=1000px)]:gap-[32px] [@media(760px<width<=1000px)]:grid-cols-[200px_minmax(0,_1fr)] print:[&&]:block",
        )}
      >
        <aside
          className={cn(
            "legal-sidebar sticky top-[28px] [@media(width<=760px)]:hidden print:[&&]:hidden!",
          )}
        >
          <nav
            className={cn(
              "legal-contents [&_>_p]:mx-[0] [&_>_p]:mt-[0] [&_>_p]:mb-[16px] [&_>_p]:[font-size:10px] [&_>_p]:font-[750] [&_>_p]:text-[color:#63758d] [&_>_p]:uppercase [&_>_p]:tracking-[1.5px] [&_ol]:p-[0] [&_ol]:m-[0] [&_ol]:list-none [&_a]:px-[12px] [&_a]:py-[10px] [&_a]:gap-[10px] [&_a]:flex [&_a]:items-baseline [&_a]:ml-[-12px] [&_a]:rounded-[9px] [&_a]:[font-size:12px] [&_a]:leading-[1.55] [&_a]:text-[color:#64758c] [&_a_>_span]:text-[color:#8799b0] [&_a_>_span]:[font-size:10px] [&_a_>_span]:tabular-nums [&_a:hover]:text-[color:#356ae6] [&_a:hover]:bg-[#edf3fc] [&_a[aria-current='location']]:text-[color:#356ae6] [&_a[aria-current='location']]:bg-[#eaf0fc] [&_a[aria-current='location']]:font-[650]",
            )}
            aria-label="Sommaire"
          >
            {contents()}
          </nav>
          <div
            className={cn(
              "legal-help p-[18px] border-[length:1px] border-solid border-[color:#d2e0f5] mt-[24px] rounded-[18px] [background:linear-gradient(145deg,_#edf4ff,_#fff_75%)] [box-shadow:0_5px_20px_#254c8507] [&_h2]:mx-[0] [&_h2]:mt-[0] [&_h2]:mb-[8px] [&_h2]:[font-size:17px] [&_h2]:leading-[1.4] [&_h2]:font-[750] [&_h2]:tracking-[-0.3px] [&_h2]:text-[color:#2d4266] [&_p]:mx-[0] [&_p]:mt-[0] [&_p]:mb-[18px] [&_p]:text-[color:#5c7090] [&_p]:[font-size:12px] [&_p]:leading-[1.8] [&_[class~='group/legal-contact-card']:focus-visible]:rounded-[11px] [&_[class~='group/legal-contact-card']:focus-visible]:[outline:3px_solid_#8cace8] [&_[class~='group/legal-contact-card']:focus-visible]:[outline-offset:3px]",
            )}
          >
            <div
              className={cn(
                "legal-help-heading gap-[12px] flex items-center justify-between mb-[12px]",
              )}
            >
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
        <div className={cn("legal-document min-w-[0]")}>
          <Accordion
            data-legal-document
            className={cn("legal-accordion gap-[12px]")}
            multiple
            hiddenUntilFound
            value={expanded}
            onValueChange={setExpanded}
          >
            {sections.map(({ id, title: sectionTitle, content }, index) => (
              <AccordionItem
                key={id}
                value={id}
                className={cn(
                  "legal-section overflow-hidden border-[length:1px] border-solid border-[color:#e0e7f1] rounded-[14px] bg-[#fff] [transition:border-color_150ms] [&[data-open]]:border-[color:var(--legal-open-border)] [&[data-open]]:[box-shadow:0_4px_14px_#20396206] [&_h2]:m-[0] motion-reduce:[transition:none] print:[&&]:[&_h2]:[break-after:avoid] print:[&&]:mb-[14px] print:[&&]:[border-top-width:0] print:[&&]:[border-top-style:none] print:[&&]:[border-top-color:currentColor] print:[&&]:[border-right-width:0] print:[&&]:[border-right-style:none] print:[&&]:[border-right-color:currentColor] print:[&&]:[border-bottom-width:1px] print:[&&]:[border-bottom-style:solid] print:[&&]:[border-bottom-color:#ddd] print:[&&]:[border-left-width:0] print:[&&]:[border-left-style:none] print:[&&]:[border-left-color:currentColor] print:[&&]:rounded-[0] print:[&&]:[box-shadow:none]",
                )}
              >
                <AccordionTrigger
                  id={id}
                  className={cn(
                    "legal-section-trigger px-[20px] py-[18px] gap-[12px] border-[length:0] border-none [&&]:border-[color:currentColor] flex items-center min-h-[74px] text-[color:#2c3b53] [font-size:16px] leading-[1.5] font-[700] tracking-[-0.3px] [scroll-margin-top:28px] [@media(width<=360px)]:p-[14px] [@media(width<=360px)]:gap-[8px] [@media(width<=360px)]:min-h-[70px] [@media(width<=360px)]:[font-size:14px] [@media(width<=360px)]:[scroll-margin-top:24px] [@media(360px<width<=760px)]:p-[16px] [@media(360px<width<=760px)]:gap-[10px] [@media(360px<width<=760px)]:min-h-[70px] [@media(360px<width<=760px)]:[font-size:15px] [@media(360px<width<=760px)]:[scroll-margin-top:24px] [&:hover]:bg-[var(--legal-tint)] [&:hover]:text-[color:var(--legal-accent)] [&:hover]:[text-decoration:none] [&[aria-expanded='true']]:bg-[var(--legal-tint)] [&[aria-expanded='true']]:text-[color:var(--legal-accent)] [&:focus-visible]:[outline:3px_solid_#a7c0f2] [&:focus-visible]:[outline-offset:-4px] [&[aria-expanded='true']_[class~='group/legal-section-number']]:text-[color:#fff] [&[aria-expanded='true']_[class~='group/legal-section-number']]:bg-[var(--legal-accent)] [&_[data-slot='accordion-trigger-icon']]:p-[5px] [&_[data-slot='accordion-trigger-icon']]:w-[26px] [&_[data-slot='accordion-trigger-icon']]:h-[26px] [&_[data-slot='accordion-trigger-icon']]:rounded-[8px] [&_[data-slot='accordion-trigger-icon']]:text-[color:var(--legal-accent)] [&_[data-slot='accordion-trigger-icon']]:bg-[#f0f4fa] print:[&&]:px-[0] print:[&&]:py-[12px] print:[&&]:min-h-[0] print:[&&]:text-[color:#222] print:[&&]:bg-[transparent]",
                  )}
                >
                  <span
                    className={cn(
                      "legal-section-number group/legal-section-number grid [place-items:center] shrink-[0] w-[30px] h-[30px] rounded-[8px] text-[color:#6a83aa] bg-[#f0f4fa] [font-size:10px] font-[700] tabular-nums [@media(width<=360px)]:w-[25px] [@media(width<=360px)]:h-[25px] [@media(width<=360px)]:[font-size:9px]",
                    )}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn("legal-section-title flex-[1] min-w-[0]")}
                  >
                    {sectionTitle}
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    "legal-section-content px-[20px] pt-[18px] pb-[22px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1f7] [@media(width<=760px)]:p-[16px] print:[&&]:px-[0] print:[&&]:border-[length:0] print:[&&]:border-none print:[&&]:border-[color:currentColor] print:[&&]:pt-[0] print:[&&]:pb-[12px]",
                  )}
                >
                  <div
                    className={cn(
                      "legal-prose text-[color:#55677f] [font-size:14px] leading-[1.95] [@media(width<=760px)]:[font-size:13px] [&_>_p]:mx-[0] [&_>_p]:mt-[0] [&_>_p]:mb-[15px] [&_>_:last-child]:mb-[0] [&_strong]:font-[650] [&_strong]:text-[color:#384a64] [&_a]:text-[color:#2e61cf] [&_a]:[text-decoration:underline] [&_a]:underline-offset-[3px] [&_a]:[text-decoration-color:#b9cef6] [&_a]:[overflow-wrap:anywhere] [&_a:hover]:[text-decoration-color:#356ae6] [&_ul]:mx-[0] [&_ul]:pl-[20px] [&_ul]:mt-[0] [&_ul]:mb-[17px] [&_ul]:list-disc [&_li]:pl-[4px] [&_li]:mb-[12px] [&_li::marker]:text-[color:#86a6db] [&_code]:px-[5px] [&_code]:py-[2px] [&_code]:bg-[#ecf1f8] [&_code]:rounded-[5px] [&_code]:[font-size:12px] [&_code]:text-[color:#44618b] [&_[class~='group/legal-contact-link']]:mx-[0] [&_[class~='group/legal-contact-link']]:mt-[0] [&_[class~='group/legal-contact-link']]:mb-[15px] [&_[class~='group/legal-contact-link']]:[text-decoration:none] print:[&&]:text-[color:#222] print:[&&]:[font-size:11px]",
                    )}
                  >
                    {content}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div
            className={cn(
              "legal-ending gap-[16px] flex justify-between items-center flex-wrap mt-[28px] [font-size:12px] [@media(width<=760px)]:gap-[12px] [@media(width<=760px)]:items-start [@media(width<=760px)]:flex-col [&_p]:m-[0] [&_p]:text-[color:#677990] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650] print:[&&]:hidden!",
            )}
          >
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
