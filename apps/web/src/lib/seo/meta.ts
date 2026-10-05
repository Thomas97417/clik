const configured = import.meta.env.VITE_SITE_URL;
if (import.meta.env.PROD && !configured)
  throw new Error("VITE_SITE_URL est obligatoire en production.");
export const SITE_URL = new URL(configured || "https://clik.io").origin;
export const INDEXABLE =
  import.meta.env.PROD && import.meta.env.VITE_SEO_INDEXABLE === "true";
export const absolute = (path: string) => new URL(path, SITE_URL).href;
export const description = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, 170);
export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function seo({
  title,
  text,
  path,
  image,
  imageWidth = 1200,
  imageHeight = 630,
  noindex = false,
  schema,
}: {
  title: string;
  text: string;
  path: string;
  image?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  noindex?: boolean;
  schema?: Record<string, unknown> | Record<string, unknown>[];
}) {
  const fullTitle = `${title} — Clik`,
    summary = description(text),
    url = absolute(path);
  const cover = absolute(image || "/og/clik.png");
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: summary },
      {
        name: "robots",
        content:
          noindex || !INDEXABLE
            ? "noindex, follow"
            : "index, follow, max-image-preview:large",
      },
      { property: "og:site_name", content: "Clik" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: summary },
      { property: "og:url", content: url },
      { property: "og:image", content: cover },
      {
        property: "og:image:width",
        content: String(image ? imageWidth : 1200),
      },
      {
        property: "og:image:height",
        content: String(image ? imageHeight : 630),
      },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: summary },
      { name: "twitter:image", content: cover },
      { name: "twitter:image:alt", content: title },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: schema
      ? [{ type: "application/ld+json", children: jsonLd(schema) }]
      : [],
  };
}
export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Accueil", path: "/" }, ...items].map(
    (item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    }),
  ),
});
export const collection = (name: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  url: absolute(path),
  inLanguage: "fr",
});
