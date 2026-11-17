import { writeFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { emptyScene, makePart } from "@clik/scene";

vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const id = await ctx.auth.getUserIdentity();
      return id ? { _id: id.subject, name: "Auteur" } : null;
    },
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");

it("réduit d’au moins 98 % la réponse de liste pour douze créations de 500 pièces", async () => {
  const t = convexTest(schema, modules).withIdentity({ subject: "owner" });
  const scene = JSON.stringify({
    ...emptyScene(),
    nodes: Array.from({ length: 500 }, (_, i) => ({
      ...makePart("brick-2x4", "#4079e8", [
        (i % 20) * 5,
        0,
        Math.floor(i / 20) * 3,
      ]),
      id: `p${i}`,
    })),
  });
  for (let i = 0; i < 12; i++)
    await t.mutation(api.projects.create, { title: `Création ${i}`, scene });
  const args = { paginationOpts: { numItems: 12, cursor: null } };
  const full = await t.query(api.projects.list, args);
  const summary = await t.query(api.projects.list, {
    ...args,
    summaryOnly: true,
  });
  const bytes = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value)).length;
  const beforeBytes = bytes(full),
    afterBytes = bytes(summary);
  expect(summary.page.map((p) => p._id)).toEqual(full.page.map((p) => p._id));
  expect(afterBytes).toBeLessThan(beforeBytes * 0.02);
  if (process.env.CLIK_PERFORMANCE_REPORT)
    await writeFile(
      process.env.CLIK_PERFORMANCE_REPORT,
      JSON.stringify(
        {
          projects: 12,
          partsPerProject: 500,
          beforeBytes,
          afterBytes,
          reductionPercent: 100 * (1 - afterBytes / beforeBytes),
          scope:
            "JSON de la liste sans compression ; scènes et images chargées séparément pour les aperçus visibles.",
        },
        null,
        2,
      ),
    );
});
