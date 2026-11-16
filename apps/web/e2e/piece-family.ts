import type { Page } from "@playwright/test";

export async function selectPieceFamily(page: Page, name: string) {
  await page
    .getByRole("combobox", { name: "Famille de pièces", exact: true })
    .click();
  await page.getByRole("option", { name, exact: true }).click();
}
