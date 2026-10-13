export const EDITOR_SHORTCUTS_TITLE = "Les raccourcis à portée de main";
export const EDITOR_SHORTCUTS_DESCRIPTION =
  "La barre du bas garde les commandes utiles sous les yeux. Voici vos premiers repères :";
export const EDITOR_SHORTCUTS = [
  ["↑ ↓ ← →", "Déplacer une pièce"],
  ["Maj + ↑ / ↓", "Changer sa hauteur"],
  ["Espace + glisser / clic droit", "Déplacer la caméra"],
  ["Maj + clic", "Sélectionner plusieurs pièces"],
  ["D", "Dupliquer la sélection"],
  ["F", "Cadrer la sélection"],
  ["R / Maj + R", "Tourner de +90° / −90°"],
  ["Échap", "Annuler l’action en cours"],
] as const;
