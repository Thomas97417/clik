import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./editor-tour.css";
import "./editor-shortcuts.css";
import {
  EDITOR_SHORTCUTS_DESCRIPTION,
  EDITOR_SHORTCUTS_TITLE,
  editorShortcutsHtml,
  isMacKeyboard,
} from "@/lib/clik/editor-shortcuts";

const actionIconSources: Record<string, string> = {
  select: '[aria-label="Tout sélectionner"]',
  group: '[title="Grouper"], [title="Nouveau groupe"]',
  ungroup: '[title="Dissocier"]',
  duplicate: '[aria-label="Dupliquer"]',
  remove: '[title="Supprimer"]',
  collapse: '[aria-label="Tout replier"]',
  expand: '[aria-label="Tout déplier"]',
};

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
      // Driver sets display:block inline; flex keeps the navigation outside scrolling text.
      wrapper.style.display = "flex";
      wrapper.setAttribute("role", "dialog");
      wrapper.setAttribute("aria-modal", "true");
      wrapper.setAttribute("aria-labelledby", title.id);
      wrapper.setAttribute("aria-describedby", description.id);
      description.tabIndex = 0;
      closeButton.setAttribute("title", "Quitter la visite");
      const label = document.createElement("p");
      label.className = "editor-tour-eyebrow";
      label.textContent = "LES REPÈRES DE L’ATELIER";
      title.before(label);
      // Reuse the toolbar's SVGs so the guide always shows the same icons.
      const toolbar = document.querySelector(
        '[data-editor-tour="construction-actions"]',
      );
      for (const placeholder of description.querySelectorAll<HTMLElement>(
        "[data-editor-tour-icon]",
      )) {
        const selector = actionIconSources[placeholder.dataset.editorTourIcon!];
        const icon = toolbar?.querySelector(selector)?.querySelector("svg");
        if (icon) placeholder.appendChild(icon.cloneNode(true));
      }
    },
    onHighlighted: (_element, _step, { state }) => {
      // Focus the scrollable shortcuts so the whole list is reachable by keyboard.
      const popover = state.popover;
      if (!popover) return;
      const list = popover.wrapper.querySelector<HTMLElement>(
        ".editor-shortcuts-list",
      );
      const description = popover.description;
      (
        list ??
        (description.scrollHeight > description.clientHeight
          ? description
          : popover.nextButton)
      ).focus();
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
            "<p>La liste de droite rassemble les pièces et les groupes de votre création. Sélectionnez un élément ici pour le retrouver sur la scène.</p>" +
            "<p>Les flèches ouvrent les groupes. Les icônes d’œil et de cadenas permettent de masquer ou de verrouiller un élément.</p>" +
            "<p>Vous pouvez replier ce panneau ou l’élargir en tirant sa bordure vers la scène.</p>",
          side: "left",
          align: "center",
        },
      },
      {
        element: '[data-editor-tour="construction-actions"]',
        popover: {
          title: "Les actions de construction",
          description:
            "<p>Cette barre agit sur votre sélection et organise la liste.</p>" +
            '<ul class="editor-tour-actions">' +
            '<li><strong><span class="editor-tour-action-name"><span data-editor-tour-icon="select" aria-hidden="true"></span>Tout sélectionner</span></strong><span>Sélectionne toutes les pièces et tous les groupes d’un seul clic.</span></li>' +
            '<li><strong><span class="editor-tour-action-name"><span data-editor-tour-icon="group" aria-hidden="true"></span>Grouper / Nouveau groupe</span></strong><span>Réunit la sélection pour la déplacer ensemble. Sans sélection, crée un groupe vide.</span></li>' +
            '<li><strong><span class="editor-tour-action-name"><span data-editor-tour-icon="ungroup" aria-hidden="true"></span>Dissocier</span></strong><span>Sépare les éléments d’un groupe en conservant ses pièces.</span></li>' +
            '<li><strong><span class="editor-tour-action-name"><span data-editor-tour-icon="duplicate" aria-hidden="true"></span>Dupliquer</span> / <span class="editor-tour-action-name"><span data-editor-tour-icon="remove" aria-hidden="true"></span>Supprimer</span></strong><span>Crée une copie de la sélection, ou la retire de la création.</span></li>' +
            '<li><strong><span class="editor-tour-action-name"><span data-editor-tour-icon="collapse" aria-hidden="true"></span>Tout replier</span> / <span class="editor-tour-action-name"><span data-editor-tour-icon="expand" aria-hidden="true"></span>Tout déplier</span></strong><span>Masque ou affiche le contenu des groupes dans la liste.</span></li>' +
            "</ul>",
          side: "left",
          align: "start",
        },
      },
      {
        element: '[data-editor-tour="properties"]',
        popover: {
          title: "Les propriétés de la sélection",
          description:
            "<p>Après avoir sélectionné une pièce ou un groupe, retrouvez ici son nom, son groupe parent, sa position et sa rotation.</p>" +
            "<p>Modifiez les valeurs X, Y et Z pour des réglages précis. Vous pouvez replier cette section pour agrandir la liste de construction.</p>",
          side: "left",
          align: "center",
        },
      },
      {
        element: '[data-editor-tour="shortcuts"]',
        popover: {
          title: EDITOR_SHORTCUTS_TITLE,
          description:
            `<p>${EDITOR_SHORTCUTS_DESCRIPTION}</p>` +
            editorShortcutsHtml(isMacKeyboard()),
          popoverClass: "editor-tour-popover editor-tour-shortcuts-popover",
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
