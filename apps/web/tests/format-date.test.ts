import { expect, it } from "vitest";
import { formatDate, formatDateTime } from "../src/lib/format-date";

it("affiche l’heure de Paris pour le commentaire à l’origine de l’erreur d’hydratation", () => {
  expect(formatDateTime(Date.parse("2026-10-09T15:06:02.134Z"))).toBe(
    "09/10/2026 17:06:02",
  );
});

it("respecte l’heure d’hiver de Paris", () => {
  expect(formatDateTime(Date.parse("2026-12-09T15:06:02.134Z"))).toBe(
    "09/12/2026 16:06:02",
  );
});

it("affiche le bon jour lorsque minuit à Paris précède minuit UTC", () => {
  const timestamp = Date.parse("2026-10-09T22:30:00Z");
  expect(formatDate(timestamp)).toBe("10 oct. 2026");
  expect(formatDate(timestamp, "long")).toBe("10 octobre 2026");
  expect(formatDateTime(timestamp)).toBe("10/10/2026 00:30:00");
});
