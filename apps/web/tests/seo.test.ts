import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("métadonnées publiques", () => {
  it("produit des URL absolues, des métadonnées françaises et du JSON-LD sûr", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SITE_URL", "https://clik.io");
    vi.stubEnv("VITE_SEO_INDEXABLE", "true");
    const { seo, jsonLd } = await import("../src/lib/seo/meta");
    const result = seo({
      title: "Le phare",
      text: "Un  phare\nbleu.",
      path: "/creations/abc",
      schema: { name: "</script><script>alert(1)</script>" },
    });
    expect(result.links).toEqual([
      { rel: "canonical", href: "https://clik.io/creations/abc" },
    ]);
    expect(result.meta).toContainEqual({
      name: "description",
      content: "Un phare bleu.",
    });
    expect(result.meta).toContainEqual({
      name: "robots",
      content: "index, follow, max-image-preview:large",
    });
    expect(result.scripts[0].children).not.toContain("<");
    const fallback = seo({
      title: "Création",
      text: "Sans miniature",
      path: "/creations/abc",
      imageWidth: 640,
      imageHeight: 480,
    });
    expect(fallback.meta).toContainEqual({
      property: "og:image:width",
      content: "1200",
    });
    expect(fallback.meta).toContainEqual({
      property: "og:image:height",
      content: "630",
    });
    expect(JSON.parse(jsonLd({ text: "<script>&\u2028" }))).toEqual({
      text: "<script>&\u2028",
    });
  });
  it("exclut la préproduction et les espaces privés même dans un build de production", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SITE_URL", "https://clik.io");
    const { seo } = await import("../src/lib/seo/meta");
    expect(seo({ title: "Test", text: "Test", path: "/" }).meta).toContainEqual(
      { name: "robots", content: "noindex, follow" },
    );
    vi.resetModules();
    vi.stubEnv("VITE_SEO_INDEXABLE", "true");
    const production = await import("../src/lib/seo/meta");
    expect(
      production.seo({
        title: "Mes créations",
        text: "Compte",
        path: "/projects",
        noindex: true,
      }).meta,
    ).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
  it("exige une origine explicite pour le build de production", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SITE_URL", "");
    await expect(import("../src/lib/seo/meta")).rejects.toThrow(
      "VITE_SITE_URL",
    );
  });
});
