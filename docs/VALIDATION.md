# Validation Clik V1

Date : 28 septembre 2026.

## Vérifications automatisées

- `bun run test` : 17 tests réussis (10 transformations/historique, 3 sauvegarde React, 4 sécurité/publication Convex).
- `bun run check-types` : frontend et backend valides.
- `bun run build` : build client et serveur TanStack Start réussi. Vite signale un bundle principal important (environ 491 Ko gzip) ; la scène React Three Fiber et les aperçus sont chargés à la demande dans le navigateur.
- `git diff --check` : aucun problème d’espacement introduit.
- Fonctions et schéma synchronisés avec le déploiement Convex de développement déjà configuré. Aucun déploiement de production ni publication de contenu réel n’a été effectué.

Les 33 contrôles navigateur passent (27 contrôles de la suite principale et 6 contrôles supplémentaires de l’accueil et de l’absence de WebGL) dans Chrome for Testing / Chromium 153, Firefox 155 et WebKit 26.6 : construction, recoloration, annuler/rétablir, récupération IndexedDB, respect des formulaires, conflit entre deux onglets, copie locale indépendante, interruption réseau, affichage mobile, dépôt depuis la bibliothèque, Échap, groupement, propriétés numériques, dissociation et charge de 500 pièces.

Le backend est testé avec `convex-test` : protection des projets privés, rejet d’un autre propriétaire, révision obsolète, validation des scènes, propriété des miniatures, stabilité d’une publication malgré une modification du brouillon, copie d’une ancienne version affichée, retrait et persistance de l’attribution. L’identité Better Auth est simulée dans ces tests, sans contourner les vérifications applicatives de propriétaire.

Les tests React vérifient l’envoi des modifications à la reconnexion, la conservation locale en cas de conflit serveur et la conversion du brouillon invité en nouveau projet sans effacement du brouillon original. Les tests navigateur n’écrivent pas dans les comptes ou publications réels.

## Mesure de charge

Machine : Apple M2 Pro, 16 Gio de mémoire, macOS. Fenêtre de 1 440 × 1 000 pixels. Serveur Vite en développement, rendu instancié, ombres et antialiasing actifs. Scène de 500 briques 2 × 4 réparties sur une grille et plusieurs niveaux, cinq couleurs. Sélection d’une pièce et déplacement de caméra pendant une fenêtre de mesure de trois secondes.

| Moteur | Rendu graphique | Images rendues | Durée | Moyenne |
| --- | --- | ---: | ---: | ---: |
| Chromium 153, Chrome complet en mode headless | ANGLE Metal, Apple M2 Pro | 161 | 3 011 ms | 53,5 images/s |
| Firefox 155 | GPU Apple, identité masquée par Firefox | 339 | 3 007 ms | 112,7 images/s |
| WebKit 26.6 | GPU Apple | 92 | 3 001 ms | 30,7 images/s |

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

Les traces d’échec sont écrites dans `apps/web/test-results` (ignoré par Git). Le test de charge produit les mesures JSON et des captures dans `/tmp/clik-performance-<moteur>.json` et `/tmp/clik-500-<moteur>.png`.
