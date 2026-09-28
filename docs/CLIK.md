# Clik V1 — architecture et utilisation

Clik conserve TanStack Start / React 19, Better Auth et Convex. Le rendu interactif utilise React Three Fiber 9, Drei et Three.js. Zustand porte l’état de l’atelier, les sélections et un historique de 80 opérations validées. Les géométries sont générées et mutualisées ; chaque modèle visible correspond à un InstancedMesh, avec une table instance → pièce. La galerie charge uniquement des miniatures PNG.

## Démarrer

Les variables et services du README restent nécessaires. Depuis la racine :

```sh
bun install
bun run dev:server
# Dans un second terminal
bun run dev:web
```

Le serveur frontend utilise le port 3001. Après modification des fonctions ou du schéma, `bunx --bun convex dev --once` dans `packages/backend` synchronise le déploiement de développement configuré. Ne pas utiliser `convex deploy` pour cette opération.

## Parcours

- `/` : accueil et démonstration 3D manipulable.
- `/editor` : brouillon invité conservé dans IndexedDB ; connexion puis « Conserver dans mes projets » pour en créer une copie privée en ligne.
- `/editor/$projectId` : atelier d’un projet personnel et publication explicite.
- `/projects` : projets personnels et retrait des publications.
- `/gallery` : publications récentes, chargées par pages.
- `/creations/$publicationId` : version publique figée au début de la consultation, caméra et reprise privée avec attribution.

Une copie locale créée après un conflit est accessible par `/editor?draft=…`. Garder cette adresse pour retrouver la copie. Le brouillon initial est conservé.

## Manipuler

Glisser une pièce depuis la bibliothèque affiche un aperçu ; cliquer sur sa carte l’ajoute à l’origine. Le sol et les accroches des briques sont utilisés avec l’aimantation activée. Les points d’accroche sont calculés dans l’espace de la scène, après les rotations et les transformations des groupes. Les pièces peuvent flotter et se chevaucher. L’avertissement de chevauchement est conservateur : il compare des boîtes englobantes alignées sur les axes et peut donc signaler des rapprochements entre pièces tournées.

Sélectionner dans la scène ou l’arborescence. Maj-clic étend la sélection. Les poignées déplacent ou tournent la sélection entière ; les valeurs de propriétés concernent le premier élément sélectionné et sont relatives à son parent. Aucune mise à l’échelle n’est proposée.

Le menu de parent dans les propriétés et le glisser-déposer sur un groupe réorganisent la hiérarchie en conservant les positions mondiales. Déposer sur le fond de l’arborescence ramène à la racine. Masquage et verrouillage sont hérités des groupes.

Raccourcis : Supprimer / Retour arrière, Échap, F pour cadrer, Cmd/Ctrl-Z et Maj-Cmd/Ctrl-Z, Cmd/Ctrl-Y, Cmd/Ctrl-C/V/D, Cmd/Ctrl-G et Maj-Cmd/Ctrl-G. Les formulaires gardent leurs raccourcis de saisie.

## Modèle et sécurité

`packages/scene` définit `SceneDocument` version 1, catalogue `clik-1`, positions et rotations Euler XYZ en radians. Chaque nœud référence un parent ; les matrices locales sont composées dans l’ordre de la hiérarchie. Le validateur partagé contrôle les valeurs finies, couleurs, modèles, unicité des identifiants, existence des parents, absence de cycle, 500 pièces et 512 Kio en UTF-8. Les groupes sont limités par le plafond de 1 000 nœuds total.

Chaque lecture et mutation privée vérifie le propriétaire via Better Auth. Les sauvegardes utilisent une révision comparée atomiquement côté Convex. Aucun écrasement forcé n’est exposé. IndexedDB conserve les changements non envoyés et détecte les écritures concurrentes dans une transaction. BroadcastChannel informe les autres onglets.

Les tableaux Convex séparent `projects`, `publications`, `versions` et les associations propriétaires de `thumbnails`. Une publication capture une copie immuable du brouillon. Une reprise copie la version affichée, pas la version la plus récente au moment du clic. Le retrait cache toutes les versions de l’original aux visiteurs sans supprimer les projets dérivés ni leur attribution.

Les miniatures passent par une action authentifiée qui vérifie le projet, la signature PNG, les dimensions et la taille, puis utilise Convex Storage. L’enregistrement d’appartenance est interne ; un identifiant de fichier arbitraire ne permet pas de publier une miniature étrangère.

## Vérifications

```sh
bun run test
bun run check-types
bun run build
# Avec le serveur web et le backend de développement à jour :
bun run --cwd apps/web test:e2e
```

Les tests navigateur utilisent des contextes isolés et des brouillons locaux jetables. Le test de charge injecte 500 pièces dans IndexedDB ; il n’écrit pas dans les comptes ou la galerie réels. Les tests backend utilisent `convex-test` et une identité Better Auth simulée. Les tests de sauvegarde React simulent les réponses du backend ; les tests navigateur utilisent le vrai IndexedDB.

Les résultats, la machine et les limites de la validation sont documentés dans `VALIDATION.md`.
