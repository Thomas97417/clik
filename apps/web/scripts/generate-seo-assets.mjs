import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../public", import.meta.url).pathname;
await mkdir(`${root}/og`, { recursive: true });
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="40" fill="#edf3ff"/><path d="M110 49A50 50 0 1 0 110 131L93 106A20 20 0 1 1 93 74Z" fill="#202d44"/><circle cx="127" cy="123" r="16" fill="#356ae6"/></svg>`;
await writeFile(`${root}/favicon.svg`, favicon);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;background:#f5f7fc;color:#202d44;font-family:Arial,sans-serif}.logo{font-size:96px;font-weight:900;letter-spacing:-8px}.logo span{color:#356ae6}.content{padding:68px 78px;width:800px}h1{font-size:62px;line-height:1.1;letter-spacing:-2px;margin:32px 0 24px}p{font-size:24px;color:#62748d;line-height:1.45}svg{position:absolute;right:55px;top:132px;width:330px;height:355px}</style><div class="content"><div class="logo">clik<span>.</span></div><h1>De petites briques.<br>De grandes idées.</h1><p>Votre atelier de construction 3D en ligne.<br>Créez. Assemblez. Partagez.</p></div><svg viewBox="0 0 330 355" xmlns="http://www.w3.org/2000/svg"><path d="M15 221 153 153 305 224 166 298Z" fill="#bce6d2"/><path d="M15 221v45l151 78v-46Z" fill="#87c5a9"/><path d="M166 298v46l139-73v-47Z" fill="#63aa89"/><path d="M37 133 148 79 267 135 155 193Z" fill="#d7c5f5"/><path d="M37 133v45l118 60v-45Z" fill="#ac8edb"/><path d="M155 193v45l112-58v-45Z" fill="#8d6bc2"/><path d="M75 46 151 9 233 47 155 87Z" fill="#6290f5"/><path d="M75 46v47l80 42V87Z" fill="#356ae6"/><path d="M155 87v48l78-41V47Z" fill="#2654ba"/><ellipse cx="152" cy="31" rx="28" ry="13" fill="#92b1ff"/><path d="M124 31v12c0 18 56 18 56 0V31c0 17-56 17-56 0" fill="#7ca2fa"/></svg>`,
  );
  await page.screenshot({ path: `${root}/og/clik.png` });
  for (const [size, name] of [
    [32, "favicon-32.png"],
    [180, "apple-touch-icon.png"],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>body{margin:0}svg{width:100vw;height:100vh}</style>${favicon}`,
    );
    await page.screenshot({ path: `${root}/${name}` });
  }
} finally {
  await browser.close();
}
