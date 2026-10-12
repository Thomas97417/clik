import { describe, expect, it } from "vitest";
import { nextCreationName } from "../src/lib/clik/creation-name";

describe("Noms par défaut des créations", () => {
  it("réserve Ma première création uniquement pour le premier atelier", () => {
    expect(nextCreationName([])).toEqual({
      title: "Ma première création",
      number: 0,
    });
    expect(nextCreationName([], 0)).toEqual({
      title: "Nouvelle création",
      number: 1,
    });
  });

  it("commence Nouvelle création après une création au nom personnalisé", () => {
    expect(nextCreationName(["Mon phare"])).toEqual({
      title: "Nouvelle création",
      number: 1,
    });
  });

  it.each([
    [["Ma première création", "Nouvelle création"], 2],
    [["Nouvelle création", "Nouvelle création 3"], 4],
    [["Nouvelle création 3"], 4],
    [["Nouvelle Création 11", "Nouvelle création 2"], 12],
    [["  Nouvelle création 7  "], 8],
  ])("continue après le plus grand numéro de %j", (titles, number) => {
    expect(nextCreationName(titles)).toEqual({
      title: `Nouvelle création ${number}`,
      number,
    });
  });

  it("conserve le dernier numéro quand les créations sont renommées ou supprimées", () => {
    expect(nextCreationName(["Mon phare", "Nouvelle création 2"], 4)).toEqual({
      title: "Nouvelle création 5",
      number: 5,
    });
    expect(nextCreationName([], 4).title).toBe("Nouvelle création 5");
  });

  it("ne confond pas les copies ni les noms personnalisés avec les noms numérotés", () => {
    expect(
      nextCreationName([
        "Nouvelle création 9 · copie",
        "Une nouvelle création 20",
        "Nouvelle création 02",
      ]).title,
    ).toBe("Nouvelle création");
  });
});
