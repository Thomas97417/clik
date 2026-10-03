import { expect, type Page } from "@playwright/test";

const labels: Record<string, string> = {
  perspective: "Perspective",
  top: "Dessus",
  front: "Face",
  right: "Droite",
};

export async function selectCameraView(page: Page, view: string) {
  const label = labels[view];
  if (!label) throw Error(`Vue inconnue : ${view}`);
  const trigger = page.getByRole("combobox", { name: "Vue de la caméra" });
  await trigger.click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(trigger).toContainText(label);
}
