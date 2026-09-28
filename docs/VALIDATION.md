# Validation Clik V1

Date : 28 septembre 2026.

## Vérifications automatisées

- `bun run test` : 21 tests réussis (14 transformations/historique/aimantation, 3 sauvegarde React, 4 sécurité/publication Convex).
- `bun run check-types` : frontend et backend valides.
- `bun run build` : build client et serveur TanStack Start réussi. Vite signale un bundle principal important (environ 491 Ko gzip) ; la scène React Three Fiber et les aperçus sont chargés à la demande dans le navigateur.
- `git diff --check` : aucun problème d’espacement introduit.
- Fonctions et schéma synchronisés avec le déploiement Convex de développement déjà configuré. Aucun déploiement de production ni publication de contenu réel n’a été effectué.

Les 69 contrôles navigateur distincts sont validés dans Chrome for Testing / Chromium 153, Firefox 155 et WebKit 26.6. La suite complète de 66 contrôles est passée, puis les 36 tests de gestes ont été relancés avec succès après l’ajout de la protection du repère d’orientation (trois nouveaux contrôles).

Ils couvrent la construction, les couleurs, la récupération IndexedDB, les conflits et le fonctionnement hors ligne, ainsi que les gestes réels : sélection dès l’appui, seuil de 4 pixels, prise décentrée sans saut, déplacements sur le sol, empilement et surfaces tournées, groupes et sélection multiple, plots éclairés, bibliothèque, aimantation désactivée, anneaux de rotation, priorités caméra/pièce, Espace dans les formulaires, relâchement hors canvas, Échap, annulation du pointeur, perte de focus, verrouillage et historique. Les captures de déplacement, d’accroche et de rotation ont été inspectées : silhouette translucide, plots éclairés et absence de flèches de translation.


Le backend est testé avec `convex-test` : protection des projets privés, rejet d’un autre propriétaire, révision obsolète, validation des scènes, propriété des miniatures, stabilité d’une publication malgré une modification du brouillon, copie d’une ancienne version affichée, retrait et persistance de l’attribution. L’identité Better Auth est simulée dans ces tests, sans contourner les vérifications applicatives de propriétaire.

Les tests React vérifient l’envoi des modifications à la reconnexion, la conservation locale en cas de conflit serveur et la conversion du brouillon invité en nouveau projet sans effacement du brouillon original. Les tests navigateur n’écrivent pas dans les comptes ou publications réels.

## Mesure de charge

Machine : Apple M2 Pro, 16 Gio de mémoire, macOS. Fenêtre de 1 440 × 1 000 pixels. Serveur Vite en développement, rendu instancié, ombres et antialiasing actifs. Scène de 500 briques 2 × 4 réparties sur une grille et plusieurs niveaux, cinq couleurs. Sélection et cadrage d’une pièce en vue de dessus, puis déplacement réel avec aperçu d’aimantation actif pendant une fenêtre de mesure de trois secondes. Les événements du pointeur sont regroupés par image ; les transformations et couleurs des instances immobiles sont réutilisées, et l’arborescence reste stable pendant le geste.

| Moteur | Rendu graphique | Images rendues | Durée | Moyenne |
| --- | --- | ---: | ---: | ---: |
| Chromium 153, Chrome complet en mode headless | ANGLE Metal, Apple M2 Pro | 180 | 3001 ms | 60,0 images/s |
| Firefox 155 | GPU Apple, identité masquée par Firefox | 357 | 3001 ms | 119,0 images/s |
| WebKit 26.6 | GPU Apple | 173 | 3001 ms | 57,6 images/s |

Le compteur mesure les rendus effectifs de la scène, pas seulement les appels `requestAnimationFrame`. Le test accepte une moyenne arrondie à l’image/s, compte tenu de l’incertitude d’une image aux bornes de la fenêtre. Ces résultats vérifient la cible moyenne sur cette machine ; ils ne garantissent pas un minimum instantané de 30 images/s sur tout matériel.

Le Chromium « headless-shell » utilisait SwiftShader (rendu logiciel), mesuré à 3,6 images/s. La configuration Playwright sélectionne donc explicitement `channel: "chromium"` pour utiliser Chrome complet et l’accélération Metal. Un poste sans accélération graphique peut rester nettement plus lent.

## Limites et contrôles de recette restants

- WebKit est le moteur utilisé par Safari ; ce test ne remplace pas une recette dans l’application Safari réelle et sur un appareil iOS.
- Aucun compte utilisateur réel n’a été créé et aucun email n’a été envoyé. La connexion OAuth/email, la vérification Resend et le parcours complet authentifié dans le navigateur restent à tester avec des comptes de recette. Les mutations correspondantes, permissions et transitions de sauvegarde sont couvertes automatiquement.
- La coupure réseau est testée sur une page déjà chargée. Le chargement initial de toute l’application sans réseau n’est pas garanti : cette V1 n’est pas une PWA avec service worker.
- Les avertissements de chevauchement utilisent des boîtes englobantes conservatrices ; ils peuvent produire des faux positifs avec des pièces tournées et restent non bloquants.
- La mesure de performance est courte et effectuée en développement. Refaire une mesure prolongée sur l’ordinateur de référence final avant une diffusion large.

## Reproduire

```sh
bun install
bun run test
bun run check-types
bun run build
bun run dev:server
# Dans un autre terminal :
bun run dev:web
# Puis :
cd apps/web
bunx playwright install chromium firefox webkit
bun run test:e2e
```

Les traces d’échec sont écrites dans `apps/web/test-results` (ignoré par Git). Le test de charge produit les mesures JSON et des captures dans `/tmp/clik-performance-<moteur>.json` et `/tmp/clik-500-<moteur>.png`. Les gestes produisent `/tmp/clik-drag-preview-<moteur>.png`, `/tmp/clik-attachment-<moteur>.png` et `/tmp/clik-rotation-<moteur>.png`.
