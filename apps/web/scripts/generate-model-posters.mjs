import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../public/models", import.meta.url).pathname;
await mkdir(root, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(process.env.CLIK_PREVIEW_URL || "http://127.0.0.1:3001/");
  const images = await page.evaluate(async () => {
    const { STARTER_MODELS, starterScene } =
      await import("/src/lib/clik/starter-models.ts");
    const { creationThumbnail } = await import("/src/lib/clik/thumbnail.ts");
    const out = [];
    for (const m of STARTER_MODELS)
      out.push([
        m.id,
        await creationThumbnail(
          starterScene(m.id, m.color),
          `seo:${m.id}`,
          () => true,
        ),
      ]);
    return out;
  });
  for (const [id, data] of images) {
    if (!data) throw Error(id);
    await writeFile(
      `${root}/${id}.png`,
      Buffer.from(data.split(",")[1], "base64"),
    );
  }
} finally {
  await browser.close();
}
