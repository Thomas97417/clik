import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./editor-tour.css";

const shortcuts = [
  ["↑ ↓ ← →", "Déplacer une pièce"],
  ["Maj + ↑ / ↓", "Changer sa hauteur"],
  ["Espace + glisser / clic droit", "Déplacer la caméra"],
  ["Maj + clic", "Sélectionner plusieurs pièces"],
  ["D", "Dupliquer la sélection"],
  ["F", "Cadrer la sélection"],
  ["R / Maj + R", "Tourner de +90° / −90°"],
  ["Échap", "Annuler l’action en cours"],
];

export function startEditorTour(onClose: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onClose();
  };
  const close = () => {
    tour.destroy();
    finish();
  };
  const tour = driver({
    animate: false,
    overlayColor: "#23334d",
    overlayOpacity: 0.28,
    stagePadding: 5,
    stageRadius: 8,
    popoverOffset: 14,
    popoverClass: "editor-tour-popover",
    disableActiveInteraction: true,
    allowScroll: false,
    allowClose: true,
    overlayClickBehavior: "close",
    showProgress: true,
    progressText: "Étape {{current}} sur {{total}}",
    nextBtnText: "Suivant",
    prevBtnText: "Précédent",
    doneBtnText: "Terminer",
    closeBtnLabel: "Quitter la visite",
    onPopoverRender: ({ wrapper, title, description, closeButton }) => {
      wrapper.setAttribute("role", "dialog");
      wrapper.setAttribute("aria-modal", "true");
      wrapper.setAttribute("aria-labelledby", title.id);
      wrapper.setAttribute("aria-describedby", description.id);
      closeButton.setAttribute("title", "Quitter la visite");
      const label = document.createElement("p");
      label.className = "editor-tour-eyebrow";
      label.textContent = "LES REPÈRES DE L’ATELIER";
      title.before(label);
    },
    onHighlighted: (_element, _step, { state }) => {
      // The editor panels are inert: keep keyboard focus in the tour's controls.
      state.popover?.nextButton.focus();
    },
    onDestroyStarted: close,
    onDestroyed: finish,
    steps: [
      {
        element: '[data-editor-tour="library"]',
        popover: {
          title: "Les pièces et leurs couleurs",
          description:
            "<p>Le panneau de gauche rassemble les modèles, classés par catégories, et la palette de couleurs.</p>" +
            "<p>Vous pouvez le replier ou agrandir la bibliothèque en tirant sa bordure vers la scène.</p>",
          side: "right",
          align: "center",
        },
      },
      {
        element: '[data-editor-tour="inspector"]',
        popover: {
          title: "Votre construction, en détail",
          description:
            "<p>À droite, retrouvez les pièces et les groupes de votre construction.</p>" +
            "<p>Les propriétés affichent le nom, la position et la rotation de la sélection. Ce panneau se replie et se redimensionne aussi.</p>",
          side: "left",
          align: "center",
        },
      },
      {
        element: '[data-editor-tour="shortcuts"]',
        popover: {
          title: "Les raccourcis à portée de main",
          description:
            "<p>La barre du bas garde les commandes utiles sous les yeux. Voici vos premiers repères :</p>" +
            '<div class="editor-tour-shortcuts">' +
            shortcuts
              .map(
                ([key, label]) =>
                  `<div><kbd>${key}</kbd><span>${label}</span></div>`,
              )
              .join("") +
            "</div>",
          side: "top",
          align: "end",
        },
      },
    ],
  });
  try {
    tour.drive();
    return close;
  } catch (error) {
    close();
    throw error;
  }
}
