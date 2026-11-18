import type { Page } from "@playwright/test";

export function pieceFamily(page: Page, name: string) {
  return page
    .getByRole("radiogroup", { name: "Familles de pièces", exact: true })
    .getByRole("radio", { name, exact: true });
}

export async function selectPieceFamily(page: Page, name: string) {
  await pieceFamily(page, name).click();
}
