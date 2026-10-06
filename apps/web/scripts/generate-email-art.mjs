// Regenerate the SVG illustrations and their email-safe @2x PNG exports:
// bun apps/web/scripts/generate-email-art.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../public/emails/", import.meta.url);
const tones = {
  blue: ["#8cb2ff", "#5787eb", "#3866c7"],
  sky: ["#d7e7ff", "#a9c6f4", "#84a9e0"],
  peach: ["#ffd5bb", "#f3b18e", "#d88c6d"],
};

// The same isometric brick language as HomeStepArt and HomeNextArt.
function brick(x, y, tone = "blue", scale = 1, rotation = 0) {
  const [top, left, right] = tones[tone];
  return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})" stroke-linejoin="round">
    <path d="M-18 0 0 10v20l-18-10Z" fill="${left}" />
    <path d="m0 10 18-10v20L0 30Z" fill="${right}" />
    <path d="m0-10 18 10L0 10-18 0Z" fill="${top}" />
    <path d="M-6-4v4a6 3 0 0 0 12 0v-4Z" fill="${right}" />
    <ellipse cy="-4" rx="6" ry="3" fill="${top}" stroke="#fff" stroke-opacity=".45" />
    <path d="m-18 0 18 10L18 0M0 10v20" fill="none" stroke="#fff" stroke-opacity=".2" />
  </g>`;
}

function illustration(title, description, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="none" role="img" aria-labelledby="title description">
  <title id="title">${title}</title>
  <desc id="description">${description}</desc>
  <ellipse cx="160" cy="96" rx="119" ry="70" fill="#fff" fill-opacity=".45" />
  <ellipse cx="163" cy="156" rx="77" ry="9" fill="#cfdef4" fill-opacity=".6" />
  <g stroke="#c3d4f0" stroke-linecap="round">
    <path d="M41 122h8m-4-4v8M258 29h8m-4-4v8" />
    <circle cx="82" cy="27" r="2" fill="#c3d4f0" stroke="none" />
    <circle cx="274" cy="143" r="2" fill="#c3d4f0" stroke="none" />
  </g>
  ${content}
</svg>
`;
}

const illustrations = {
  "verify-email": illustration(
    "Une dernière brique pour rejoindre Clik",
    "Une carte de création en briques bleues et pêche, accompagnée d’une coche de confirmation.",
    `<path d="M74 116c0-44 29-81 76-88m83 58c15 9 25 25 25 45" stroke="#c3d4f0" stroke-width="1.5" stroke-dasharray="3 6" stroke-linecap="round" />
    ${brick(61, 75, "peach", 0.68, -12)}
    ${brick(258, 59, "sky", 0.7, 10)}
    <g transform="rotate(-7 160 93)">
      <rect x="99" y="27" width="122" height="131" rx="14" fill="#dce6f7" />
      <rect x="99" y="21" width="122" height="131" rx="14" fill="#fff" stroke="#d5e1f4" />
      <rect x="107" y="29" width="106" height="91" rx="9" fill="#edf3fd" />
      <ellipse cx="160" cy="107" rx="33" ry="6" fill="#dce6f7" />
      ${brick(149, 62, "blue", 1.4)}
      ${brick(182, 85, "peach", 0.8)}
      <path d="M113 131h47m-47 9h29" stroke="#b4c7e6" stroke-width="3" stroke-linecap="round" />
    </g>
    <circle cx="218" cy="134" r="23" fill="#e7f3ec" stroke="#fff" stroke-width="5" />
    <path d="m208 134 7 7 13-14" stroke="#65a181" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m258 103 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#e6c4a2" />`,
  ),
  "reset-password": illustration(
    "Retrouver les clés de son atelier Clik",
    "Un assemblage de briques bleues et pêche, entouré d’une flèche de retour et d’une petite clé.",
    `<path d="M89 120c-24-35-7-82 33-97 40-16 85 7 97 44" stroke="#9eb8e7" stroke-width="1.8" stroke-linecap="round" />
    <path d="m207 60 13 9 7-14" stroke="#9eb8e7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m108 138 53-30 58 31-54 29Z" fill="#dce6f7" stroke="#cbd9ee" stroke-linejoin="round" />
    ${brick(179, 93, "sky", 1.4)}
    ${brick(142, 114, "blue", 1.4)}
    <g stroke="#8ca9db" stroke-dasharray="3 4" stroke-linejoin="round">
      <path d="m142 86 25 14v28l-25 14-25-14v-28Zm-25 14 25 14 25-14m-25 14v28" />
      <path d="M117 79v12m50-12v12" />
    </g>
    ${brick(142, 49, "peach", 1.4)}
    ${brick(64, 75, "sky", 0.65, -12)}
    <circle cx="234" cy="130" r="23" fill="#fff" stroke="#d7e3f6" stroke-width="1.5" />
    <g stroke="#6789c5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="229" cy="125" r="6" />
      <path d="m233 129 11 11m-5-5 4-4m-7 1 4-4" />
    </g>
    <path d="m258 87 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#e6c4a2" />`,
  ),
};

await mkdir(root, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 320, height: 180 },
    deviceScaleFactor: 2,
  });
  for (const [name, svg] of Object.entries(illustrations)) {
    await writeFile(new URL(`${name}.svg`, root), svg);
    await page.setContent(
      `<style>body{margin:0;background:#eef4ff}svg{display:block}</style>${svg}`,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`${name}.png`, root)),
    });
  }
} finally {
  await browser.close();
}
