# Validation Clik V1

Date : 28 septembre 2026.

## Le défi du jour — 30 septembre 2026

- `bun run test` : 498 tests réussis (482 web/scène et 16 backend).
- `bun run check-types` et `git diff --check` : réussis.
- `bun run build` avec Node 22 : client et serveur construits ; l’avertissement existant sur la taille du bundle principal reste présent (496 Ko gzip).
- 12 contrôles Playwright réussis : quatre parcours sur Chromium, Firefox et WebKit. Ils couvrent la participation et sa mise à jour, les 100 pièces du lot, le calendrier, les archives, la navigation mobile jusqu’à 320 px, les limites dans l’éditeur, l’annulation, la clôture, les trois votes et leur réattribution, puis l’ajout/modification/suppression de commentaires.
- Les fonctions Convex réelles sont testées avec `convex-test` : date UTC, unicité du projet, quotas de pièces y compris masquées/groupées, publication vide ou tardive, concurrence de quatre votes, neuf votes sur trois journées, auto-vote interdit, retrait/republication, classement, commentaires et permissions. Les mises à jour préservent votes et commentaires.
- Les parcours connectés dans le navigateur utilisent un transport Convex et une session simulés, sans créer de comptes ni de publications distantes. Le parcours public consulte le backend de développement. Les captures ordinateur/mobile, du stock et des commentaires ont été inspectées.
- Schéma, fonctions et cron quotidien synchronisés sur Convex de développement. Aucun déploiement de production.

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

## Rotation à la molette pendant la prise

Neuf contrôles supplémentaires (trois scénarios sur Chromium, Firefox et WebKit) sont validés : +90°/−90° sans déplacement préalable du pointeur, rotations successives en une opération annuler/rétablir, déplacement combiné à la rotation, Échap, verrouillage, rotation rigide d’un groupe, absence de zoom pendant la prise et zoom conservé après relâchement. TypeScript, les 21 tests unitaires et le build ont également été relancés avec succès.

## Duplication sans chevauchement

La duplication et le collage cherchent un emplacement libre à la même hauteur. Cinq tests unitaires supplémentaires couvrent les copies successives, les obstacles masqués/verrouillés, les groupes imbriqués tournés, la sélection multiple, le collage et les limites de coordonnées, ainsi que l’historique. Les 26 tests automatisés, TypeScript et le build passent. Six contrôles navigateur ciblés passent dans Chromium, Firefox et WebKit : duplication d’une pièce et d’un groupe, absence de chevauchement, annuler/rétablir et conservation du brouillon. La capture Chromium confirme visuellement l’espace entre l’original et sa copie.

## Dessous creux et contact des pièces

Les dix géométries possèdent des logements ouverts sous les plots, avec parois intérieures et plafond. Vingt-trois tests géométriques supplémentaires vérifient par lancer de rayons les ouvertures, les parois, la profondeur disponible, les dimensions et le contact après aimantation sur une brique, une plaque et une pente tournées. Les 49 tests automatisés, TypeScript et le build passent.

Les 54 scénarios navigateur ciblés (six nouveaux contrôles visuels, 45 contrôles de gestes, trois mesures de charge) sont validés sous Chromium, Firefox et WebKit. Les nouveaux tests ont été corrigés pour distinguer la carte de bibliothèque du bouton d’arborescence et attendre la taille définitive du canvas ; les six passent ensemble. Un cas de relâchement hors canvas sous WebKit a échoué au premier passage et réussi à la relance ciblée, sans modification du code de manipulation. Les captures des dessous et de l’empilement ont été inspectées : logements visibles et absence d’espace entre les corps emboîtés.

Avec les nouvelles géométries, la mesure de déplacement avec aperçu sur 500 pièces donne 60,0 images/s sous Chromium, 119,3 sous Firefox et 59,6 sous WebKit, dans les mêmes conditions que ci-dessous. Les géométries restent mutualisées et instanciées. Captures : `/tmp/clik-undersides-<moteur>.png` et `/tmp/clik-fitted-stack-<moteur>.png`.

## Ajout par clic sans chevauchement

L’ajout depuis une carte de bibliothèque réutilise la recherche d’emplacement libre des duplications. Quatre tests automatisés supplémentaires couvrent les dix formes avec et sans aimantation, le maintien au sol, la couleur et la sélection, l’historique, les obstacles groupés/tournés/masqués/verrouillés et le refus de dépasser 500 pièces sans modification du document. Les 53 tests automatisés, TypeScript et le build passent.

Les 87 contrôles des suites éditeur, gestes et géométrie passent en une exécution sous Chromium, Firefox et WebKit. Le nouveau scénario vérifie les ajouts successifs, l’absence de chevauchement, l’annulation/rétablissement et les positions après rechargement. Les scènes de test d’empilement fixent désormais explicitement la position des pièces ajoutées, puisque le clic ne les superpose plus automatiquement à l’origine.

## Arborescence repliable

Les groupes peuvent être repliés individuellement ou en bloc, avec compteur de pièces et indication d’une sélection masquée par le repli. Quatre scénarios navigateur supplémentaires (12 contrôles) vérifient les groupes imbriqués, la conservation de la sélection, Entrée/Espace, les commandes globales, l’absence d’historique de repli, l’ouverture des parents depuis une sélection 3D, le dépôt dans un groupe fermé, les groupes verrouillés/vides et l’indépendance du masquage. Les captures à 1 100 px ont été inspectées ; la barre d’actions reste contenue dans le panneau.

Les 93 contrôles distincts éditeur/gestes/arborescence sont validés sous Chromium, Firefox et WebKit. La première exécution a donné 80 réussites ; les nouveaux tests ont ensuite été corrigés pour compter aussi les groupes dans le diagnostic de scène et cibler le sélecteur de parent par son rôle accessible. Les 12 nouveaux contrôles et les trois contrôles de sélection multiple passent ensemble. Le contrôle de sélection multiple WebKit, en échec au premier passage, passe à la relance sans modification du code des gestes. Les 53 tests automatisés, TypeScript et le build passent. Captures : `/tmp/clik-collapsed-tree-<moteur>.png`.

## Bibliothèque stable au défilement

La bibliothèque sépare les catégories fixes, la liste défilante avec `scrollbar-gutter: stable` et la palette fixe. Les deux nouveaux scénarios (six contrôles) comparent les dimensions des cartes, du titre, de la palette et du canvas avant/après filtrage d’une liste longue vers une liste courte, puis lors d’un affichage forcé de scrollbar. Ils vérifient aussi le défilement réel à la molette, l’absence de débordement horizontal à 1 100 × 760 px, le retour en haut après filtrage, les compteurs, l’accès aux couleurs et l’ajout d’une pièce dans la couleur choisie.

Les 21 contrôles ciblés bibliothèque/ajout/dépôt/empilement passent ensemble sous Chromium, Firefox et WebKit. Les captures ont été inspectées : catégories et palette accessibles, cartes stables. Les 53 tests automatisés, TypeScript et le build passent. Captures : `/tmp/clik-library-stable-<moteur>.png` et `/tmp/clik-library-palette-<moteur>.png`.

## Catalogue étendu à 23 modèles

Treize modèles supplémentaires : briques 1 × 3 et 1 × 6 ; plaques 1 × 1, 1 × 3, 1 × 4, 2 × 3 et 4 × 4 ; pentes 2 × 1, 2 × 3 et 3 × 2 ; tuiles lisses 1 × 1, 1 × 2 et 2 × 2 dans une nouvelle catégorie. Les anciens identifiants, dimensions et le format des scènes restent compatibles.

Les 127 tests automatisés passent : logements ouverts de chaque modèle, profondeur des plafonds sous les rampes, contact sans vide après rotation, accroches uniquement sur les plots existants, fixation des tuiles par dessous, ajout sans chevauchement et sauvegarde côté serveur des 23 modèles. TypeScript et le build passent.

Les 15 contrôles navigateur des suites catalogue, bibliothèque et géométrie passent sous Chromium, Firefox et WebKit. Le nouveau scénario ajoute chacun des 23 modèles et les retrouve après rechargement ; il inspecte les pixels de chaque miniature pour vérifier un rendu visible sans découpe aux bords. Les contrôles de largeur stable, de défilement et d’empilement restent valides. Les captures des pentes et tuiles ont été inspectées visuellement. Captures : `/tmp/clik-catalog-<famille>-<moteur>.png`.

## Alignement sur les cases et grille persistante

L’aimantation de grille utilise un coin inférieur transformé au lieu d’arrondir le centre. Les 23 modèles sont vérifiés dans les quatre orientations par quarts de tour, aux coordonnées positives et négatives : bords entiers, opération idempotente, rotation conservée et déplacement libre lorsque l’aimantation est désactivée. L’ajout de chaque modèle, l’emboîtement entre largeurs paires et impaires, les groupes rigides et leurs copies sont également vérifiés. Les 152 tests automatisés (147 web, 5 backend), TypeScript et le build passent.

Les 93 contrôles distincts éditeur, gestes, géométrie et grille sont validés sous Chromium, Firefox et WebKit. Le premier passage a donné 88 réussites ; les trois attentes de coordonnées après dissociation ont été actualisées pour la brique 1 × 1 désormais centrée à 0,5, et deux gestes WebKit attendent maintenant le rendu de leur aperçu avant le relâchement synthétique. Les 15 contrôles ciblés passent ensuite ensemble. Les nouveaux scénarios contrôlent les pixels de la grille dans une scène vide après 30 crans de zoom, au-dessus et en dessous du sol, ainsi que le déplacement et la rotation à la molette d’une pièce impaire avec annulation. Captures inspectées : `/tmp/clik-grid-close-<moteur>.png`, `/tmp/clik-grid-below-<moteur>.png`, `/tmp/clik-grid-footprint-<moteur>.png`.

## Grille stable au zoom et masquée par les pièces

Le rendu de la grille précède celui des pièces opaques, avec mélange alpha pour conserver l’anticrénelage et sans lecture/écriture de profondeur. Cela évite de comparer la profondeur interpolée d’un immense plan avec celle des petites surfaces des pièces. Le plan d’ombres conserve son test de profondeur mais n’y écrit plus. Les limites de caméra suivent le zoom ; les mailles affichées deviennent plus larges à grande distance, avec des seuils distincts à l’aller et au retour pour éviter les basculements répétés. L’aimantation conserve son unité.

Deux régressions navigateur contrôlent les images successives pendant les mouvements. La première enregistre les pixels du sol vide pendant 120 crans de dézoom puis 120 crans de zoom, dans trois vues. La seconde observe une zone intérieure d’une tuile rouge pendant le zoom sous trois angles : avant correction, jusqu’à 77 pixels sur 400 perdaient la couleur de la pièce en vue rasante ; après correction, aucun. Les captures ont été inspectées. Les 18 contrôles ciblés grille/occlusion/géométrie passent ensemble sous Chromium, Firefox et WebKit. Les 152 tests automatisés, TypeScript et le build passent.

Captures : `/tmp/clik-grid-far-<vue>-<moteur>.png`, `/tmp/clik-grid-sweep-<vue>-<moteur>.png` et `/tmp/clik-grid-occlusion-<vue>-<moteur>.png`.

## Filtrage du quadrillage à l’horizon

Le quadrillage utilise désormais un shader dédié qui intègre la couverture des lignes sur l’empreinte du pixel. Les motifs trop serrés convergent vers leur couverture moyenne avant de devenir non résolubles, au lieu d’alterner entre lignes et espaces avec les petits mouvements de caméra. Le dessin en arrière-plan, les ombres, l’alignement mondial et les niveaux de détail du zoom restent conservés.

Un nouveau scénario suit pendant 2,2 secondes une bande à l’horizon après une rotation horizontale en vue rasante. Il mesure le 95e percentile des variations de luminance entre images, borne les pics pendant le mouvement et vérifie leur stabilisation après 1,2 seconde. Le temps réel est utilisé pour tenir compte des cadences différentes de Chromium, Firefox et WebKit. Les trois contrôles passent, ainsi que les 12 contrôles de grille, zoom et masquage sous les pièces. Les captures `/tmp/clik-grid-horizon-<moteur>.png` ont été inspectées. Les 152 tests automatisés, TypeScript et le build passent.

## Mesure de charge

Machine : Apple M2 Pro, 16 Gio de mémoire, macOS. Fenêtre de 1 440 × 1 000 pixels. Serveur Vite en développement, rendu instancié, ombres et antialiasing actifs. Scène de 500 briques 2 × 4 réparties sur une grille et plusieurs niveaux, cinq couleurs. Sélection et cadrage d’une pièce en vue de dessus, puis déplacement réel avec aperçu d’aimantation actif pendant une fenêtre de mesure de trois secondes. Les événements du pointeur sont regroupés par image ; les transformations et couleurs des instances immobiles sont réutilisées, et l’arborescence reste stable pendant le geste.

| Moteur | Rendu graphique | Images rendues | Durée | Moyenne |
| --- | --- | ---: | ---: | ---: |
| Chromium 153, Chrome complet en mode headless | ANGLE Metal, Apple M2 Pro | 180 | 3001 ms | 60,0 images/s |
| Firefox 155 | GPU Apple, identité masquée par Firefox | 357 | 3001 ms | 119,0 images/s |
| WebKit 26.6 | GPU Apple | 173 | 3001 ms | 57,6 images/s |

Le compteur mesure les rendus effectifs de la scène, pas seulement les appels `requestAnimationFrame`. Le test accepte une moyenne arrondie à l’image/s, compte tenu de l’incertitude d’une image aux bornes de la fenêtre. Ces résultats vérifient la cible moyenne sur cette machine ; ils ne garantissent pas un minimum instantané de 30 images/s sur tout matériel.

Le Chromium « headless-shell » utilisait SwiftShader (rendu logiciel), mesuré à 3,6 images/s. La configuration Playwright sélectionne donc explicitement `channel: "chromium"` pour utiliser Chrome complet et l’accélération Metal. Un poste sans accélération graphique peut rester nettement plus lent.

## Rangement interactif de l’arborescence

Le déplacement affiche l’ordre provisoire pendant la prise, avec animation des lignes, emplacement réservé et destination explicite. Les tests couvrent les insertions avant/après, le dépôt tout en bas, le défilement automatique, les sélections multiples, les groupes complets, l’ouverture au survol, les branches verrouillées et l’annulation (Échap, sortie de liste, perte de focus). L’aperçu ne modifie pas la scène ; le dépôt conserve les transformations mondiales et crée une seule opération d’historique. Un dépôt qui ne change pas l’ordre n’en crée aucune.

Les 509 tests automatisés, TypeScript et le build passent. Les 42 contrôles navigateur ciblés (arborescence et panneaux latéraux) passent sur Chromium, Firefox et WebKit. Les captures d’aperçu et du panneau étroit ont été inspectées : `/tmp/clik-tree-order-<moteur>.png` et `/tmp/clik-tree-group-<moteur>.png`.

## Publication depuis Mes créations

Le badge « Privée » ouvre un menu d’action puis le formulaire partagé avec l’éditeur. Les tests vérifient le titre et la dernière description préremplis, l’annulation sans publication, le focus clavier, le rendu mobile, le refus des défis terminés, la miniature PNG, la révision envoyée, la conservation de la saisie après erreur et l’actualisation du statut après succès. Le transport Convex est simulé dans le navigateur ; aucune publication réelle n’est créée. Les fonctions Convex sont aussi testées directement, notamment la récupération de la description après retrait.

Les 509 tests automatisés, TypeScript et le build passent. Les 18 contrôles navigateur ciblés passent sur Chromium, Firefox et WebKit, incluant la publication et sa mise à jour depuis l’éditeur. Captures inspectées : `/tmp/clik-project-visibility-<moteur>.png` et `/tmp/clik-project-publish-<moteur>.png`.

## Galeries publiques des créateurs

Les tests backend vérifient la pagination par auteur, les participations aux défis, l’exclusion des projets privés et anciennes versions, le retrait puis la republication, ainsi que les seuls champs exposés par l’identité publique. Ils couvrent aussi les comptes inexistants, les identifiants mal formés et les avatars absents ou indisponibles.

Les scénarios navigateur couvrent l’accès anonyme direct, les liens d’auteur depuis la galerie, les défis, les créations et les commentaires, le lien « Ma page publique », le chargement de 12 puis 15 créations, le retrait réactif, le changement de nom sans changement d’adresse et les états vides ou introuvables. Le transport Convex est simulé ; aucune création ni aucun compte réel n’est ajouté. Captures : `/tmp/clik-creator-<moteur>.png` et `/tmp/clik-creator-mobile-<moteur>.png`.

Les 513 tests automatisés, TypeScript et le build passent. Les 27 contrôles navigateur ciblés (créateurs, défis et navigation) sont validés sur Chromium, Firefox et WebKit après adaptation du sélecteur du test des commentaires au lien d’auteur séparé. Les captures ordinateur et mobile ont été inspectées. La synchronisation Convex reste assurée par le processus de développement habituel.

## Miniatures de publication uniformes

La publication depuis l’atelier utilise le même générateur que « Mes créations ». Le test de participation vérifie le PNG envoyé (640 × 480, fond transparent et pièces visibles), puis compare les deux images après changement de caméra, d’éclairage et de visibilité du quadrillage : elles sont identiques. Les six contrôles ciblés de publication passent sur Chromium, Firefox et WebKit, ainsi que les 513 tests automatisés, TypeScript et le build.

## Aperçu manipulable de l’accueil

Les tests comparent les pixels de l’aperçu après rotation à la souris, zoom, rotation au clavier et réinitialisation. Les commandes tactiles de zoom passent sur les trois navigateurs ; un glissement tactile réel est aussi vérifié sous Chromium. Les captures sur ordinateur et mobile ont été inspectées : `/tmp/clik-home-preview-<moteur>.png` et `/tmp/clik-home-preview-mobile-<moteur>.png`.

Les parcours existants vérifient que les cartes de « Mes créations » restent statiques, que la copie créée après manipulation conserve exactement les pièces du modèle et que les publications conservent leur miniature automatique. Les 33 contrôles ciblés passent sous Chromium, Firefox et WebKit, ainsi que les 496 tests du frontend, TypeScript et le build.

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
