export const EDITOR_SHORTCUTS_TITLE = "Les raccourcis";
export const EDITOR_SHORTCUTS_DESCRIPTION =
  "Retrouvez les commandes de l’atelier, avec les touches de votre clavier.";

const keySymbols = {
  shift: { glyph: "⇧", label: "Majuscule" },
  left: { glyph: "←", label: "Flèche gauche" },
  right: { glyph: "→", label: "Flèche droite" },
  up: { glyph: "↑", label: "Flèche haut" },
  down: { glyph: "↓", label: "Flèche bas" },
  space: { glyph: "␣", label: "Espace" },
  escape: { glyph: "⎋", label: "Échap" },
  backspace: { glyph: "⌫", label: "Retour arrière" },
  delete: { glyph: "⌦", label: "Supprimer" },
  home: { glyph: "↖", label: "Début (Home)" },
  end: { glyph: "↘", label: "Fin (End)" },
  click: { glyph: "Clic", label: "Clic gauche" },
  drag: { glyph: "Glisser", label: "Clic gauche et glisser" },
  rightDrag: { glyph: "Clic droit", label: "Clic droit et glisser" },
  wheel: { glyph: "Molette", label: "Molette de la souris" },
  Z: { glyph: "Z", label: "Z" },
  A: { glyph: "A", label: "A" },
  Q: { glyph: "Q", label: "Q" },
  S: { glyph: "S", label: "S" },
  Y: { glyph: "Y", label: "Y" },
  C: { glyph: "C", label: "C" },
  V: { glyph: "V", label: "V" },
  D: { glyph: "D", label: "D" },
  G: { glyph: "G", label: "G" },
  R: { glyph: "R", label: "R" },
  F: { glyph: "F", label: "F" },
} as const;

export type ShortcutKey = keyof typeof keySymbols | "mod";
type Shortcut = {
  label: string;
  keys: readonly (readonly ShortcutKey[])[];
};
type ShortcutGroup = {
  title: string;
  context?: string;
  shortcuts: readonly Shortcut[];
};

export const EDITOR_SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: "Édition",
    shortcuts: [
      { label: "Annuler", keys: [["mod", "Z"]] },
      {
        label: "Rétablir",
        keys: [
          ["shift", "mod", "Z"],
          ["mod", "Y"],
        ],
      },
      { label: "Copier la sélection", keys: [["mod", "C"]] },
      { label: "Coller", keys: [["mod", "V"]] },
      { label: "Dupliquer la sélection", keys: [["mod", "D"]] },
      { label: "Supprimer la sélection", keys: [["backspace"], ["delete"]] },
      { label: "Annuler l’action en cours", keys: [["escape"]] },
    ],
  },
  {
    title: "Pièces et sélection",
    context:
      "Les flèches déplacent les pièces sélectionnées selon la vue, par pas de grille",
    shortcuts: [
      { label: "Tout sélectionner", keys: [["A"]] },
      {
        label: "Déplacer la sélection",
        keys: [["drag"], ["left"], ["up"], ["down"], ["right"]],
      },
      {
        label: "Changer sa hauteur",
        keys: [
          ["shift", "up"],
          ["shift", "down"],
        ],
      },
      { label: "Tourner de +90°", keys: [["R"]] },
      { label: "Tourner de −90°", keys: [["shift", "R"]] },
      { label: "Tourner une pièce tenue", keys: [["wheel"]] },
      { label: "Sélection multiple", keys: [["shift", "click"]] },
      { label: "Sélection par cadre sur le fond", keys: [["shift", "drag"]] },
      { label: "Grouper la sélection", keys: [["G"], ["mod", "G"]] },
      { label: "Dégrouper", keys: [["shift", "mod", "G"]] },
    ],
  },
  {
    title: "Caméra",
    context:
      "ZQSD déplace la caméra selon la vue. Les flèches font de même sans sélection",
    shortcuts: [
      { label: "Cadrer la sélection", keys: [["F"]] },
      { label: "Avancer", keys: [["Z"], ["up"]] },
      { label: "Aller à gauche", keys: [["Q"], ["left"]] },
      { label: "Reculer", keys: [["S"], ["down"]] },
      { label: "Aller à droite", keys: [["D"], ["right"]] },
      { label: "Tourner autour de la scène", keys: [["drag"]] },
      { label: "Déplacer la caméra", keys: [["space", "drag"], ["rightDrag"]] },
      { label: "Zoomer / dézoomer", keys: [["wheel"]] },
    ],
  },
  {
    title: "Panneaux",
    context: "Lorsque leur bordure est sélectionnée",
    shortcuts: [
      { label: "Ajuster la largeur", keys: [["left"], ["right"]] },
      {
        label: "Ajuster plus rapidement",
        keys: [
          ["shift", "left"],
          ["shift", "right"],
        ],
      },
      { label: "Largeur minimale", keys: [["home"]] },
      { label: "Largeur maximale", keys: [["end"]] },
    ],
  },
];

type KeyboardPlatform = {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
};

export function isMacKeyboard(
  source: KeyboardPlatform | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
) {
  const platform =
    source?.userAgentData?.platform ||
    source?.platform ||
    source?.userAgent ||
    "";
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function shortcutKeys(
  combination: readonly ShortcutKey[],
  mac: boolean,
) {
  const ordered =
    !mac && combination.includes("mod")
      ? ["mod" as const, ...combination.filter((key) => key !== "mod")]
      : combination;
  return ordered.map((key) =>
    key === "mod"
      ? { glyph: mac ? "⌘" : "Ctrl", label: mac ? "Commande" : "Contrôle" }
      : keySymbols[key],
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

/** Driver.js uses HTML; its rows share the same data and key formatting as React. */
export function editorShortcutsHtml(mac: boolean) {
  return (
    '<div class="editor-shortcuts-list" tabindex="0" role="region" aria-label="Liste des raccourcis">' +
    EDITOR_SHORTCUT_GROUPS.map(
      (group) =>
        '<section class="editor-shortcut-group"><h3>' +
        escapeHtml(group.title) +
        "</h3>" +
        (group.context
          ? '<p class="editor-shortcut-context">' +
            escapeHtml(group.context) +
            "</p>"
          : "") +
        group.shortcuts
          .map(
            (shortcut) =>
              '<div class="editor-shortcut-row"><span>' +
              escapeHtml(shortcut.label) +
              '</span><div class="editor-shortcut-keys">' +
              shortcut.keys
                .map((combination) => {
                  const keys = shortcutKeys(combination, mac);
                  const label = escapeHtml(
                    keys.map((key) => key.label).join(" + "),
                  );
                  return (
                    '<kbd title="' +
                    label +
                    '"><span class="sr-only">' +
                    label +
                    "</span>" +
                    keys
                      .map(
                        (key) =>
                          '<span aria-hidden="true">' +
                          escapeHtml(key.glyph) +
                          "</span>",
                      )
                      .join("") +
                    "</kbd>"
                  );
                })
                .join("") +
              "</div></div>",
          )
          .join("") +
        "</section>",
    ).join("") +
    "</div>"
  );
}
