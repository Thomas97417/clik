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
- `/projects` : projets personnels, publication et retrait des publications. Le badge « Privée » ouvre un menu « Publier », puis le même formulaire que dans l’atelier, prérempli avec le titre de la création et la dernière description publiée si elle existe. L’aperçu de la carte devient la miniature ; après confirmation, le statut et le lien de publication s’actualisent sur place. Le badge « Version publiée » utilise le même menu compact et propose « Passer en privé », à la place de l’ancien menu de retrait en bas de carte.
- `/gallery` : publications récentes, chargées par pages.
- `/challenges` : défi du jour, lot commun, participations et archives via `?date=AAAA-MM-JJ`.
- `/creations/$publicationId` : version publique, caméra, reprise privée avec attribution et commentaires. Les créations ordinaires restent figées au début de la consultation ; une participation à un défi suit sa dernière version publiée.

Une copie locale créée après un conflit est accessible par `/editor?draft=…`. Garder cette adresse pour retrouver la copie. Le brouillon initial est conservé.

## Manipuler

La bibliothèque garde ses catégories et sa palette visibles ; seule la liste des modèles défile. Les catégories sont disposées sur deux colonnes avec leur nombre de modèles. Changer de catégorie ramène la liste en haut. L’espace de la scrollbar est réservé pour conserver la largeur des cartes, et les aperçus occupent une zone de taille fixe pendant leur chargement.

Le catalogue comprend huit briques (dont 1 × 3 et 1 × 6), huit plaques (de 1 × 1 à 4 × 4), quatre pentes (2 × 1, 2 × 2, 2 × 3 et 3 × 2) et trois tuiles lisses (1 × 1, 1 × 2 et 2 × 2). La pente 3 × 2 possède une rampe plus longue. Les miniatures adaptent leur cadrage aux dimensions du modèle.

Glisser une pièce depuis la bibliothèque affiche son placement ; cliquer sur sa carte l’ajoute au sol, sur les cases proches de l’origine si elles sont libres ou sur le côté libre le plus proche. Ce placement évite les pièces existantes, même masquées, verrouillées ou groupées, que l’aimantation soit active ou non. En mode Déplacer, saisir directement une pièce : elle est sélectionnée dès l’appui et commence à suivre le pointeur après 4 pixels. Le point saisi reste sous le pointeur, la rotation est conservée et le bas de la sélection suit le sol ou les surfaces survolées. Un simple clic ne crée aucune opération dans l’historique.

La grille délimite des cases d’une unité. L’aimantation au sol tient compte des dimensions et de la rotation de la pièce : ses bords occupent des cases entières dans les orientations par quarts de tour. Un centre à 0,5 est donc normal pour une dimension impaire. L’ajout par clic utilise le même alignement ; les déplacements de groupes et les duplications gardent leur assemblage rigide. Les rotations libres restent possibles. Les scènes existantes ne sont pas repositionnées à l’ouverture : déplacer une pièce avec l’aimantation active utilise la nouvelle règle.

La grille reste visible au zoom, sans atténuation selon la distance, et se dessine des deux côtés du plan pour permettre l’inspection des dessous. Elle suit la caméra sans déplacer ses lignes dans le repère de la scène. Les plans de coupe suivent la distance de la caméra, et des mailles plus larges prennent le relais aux dézooms importants, sans changer la grille d’aimantation. La grille est dessinée en arrière-plan avant les pièces : les surfaces opaques la masquent complètement. Elle et le plan d’ombres n’écrivent pas dans le tampon de profondeur, ce qui évite leur scintillement mutuel. À l’horizon, les lignes trop fines sont filtrées selon leur empreinte à l’écran et convergent vers leur couverture moyenne : les petits mouvements résiduels de caméra ne produisent plus de motifs de moiré. Le quadrillage proche reste net et l’inertie de la caméra est conservée.

Avec l’aimantation, une silhouette translucide montre exactement la transformation appliquée au dépôt. Les plots compatibles de la cible s’éclairent, y compris sur une pièce tournée ; sans accroche, la silhouette suit la grille. Ces indications fonctionnent pour la bibliothèque, les sélections, les groupes et la rotation. Les chevauchements restent autorisés. L’avertissement de chevauchement compare des boîtes englobantes alignées sur les axes et peut signaler des rapprochements entre pièces tournées.

Les 23 modèles possèdent des logements creux sous chaque emplacement de plot, avec des parois et un plafond. Les plots pénètrent dans ces logements lors de l’aimantation : le bas de la pièce supérieure touche le dessus du corps de la pièce cible. Les hauteurs du catalogue restent inchangées (briques : 1,2 ; plaques : 0,4), sans espacement vertical ajouté. Les pentes ne portent des plots que sur leur rangée arrière plate. Les tuiles lisses (hauteur 0,4) ont des logements dessous et aucun plot ni accroche dessus. Cette géométrie est partagée par les pièces, les aperçus et les miniatures.

Sélectionner dans la scène ou l’arborescence. Maj-clic ajoute ou retire un élément sans démarrer de déplacement. Saisir un enfant d’un groupe sélectionné conserve le groupe ; saisir une pièce de la sélection déplace tout l’ensemble. Les éléments verrouillés restent sélectionnables ; un groupe contenant une branche verrouillée ne se déplace pas. Les anneaux apparaissent uniquement en mode Tourner. Les propriétés numériques concernent le premier élément sélectionné et sont relatives à son parent ; elles s’actualisent à la fin du geste. Aucune mise à l’échelle n’est proposée.

Cliquer dans le vide désélectionne, puis glisser permet d’orbiter. Clic droit ou Espace + glisser gauche déplace la caméra sans changer la sélection ; la molette zoome. En maintenant le clic gauche sur une pièce en mode Déplacer, chaque cran de molette tourne la sélection de 90° autour de l’axe vertical de la pièce saisie : vers le haut +90°, vers le bas −90°. Cela fonctionne dès la prise, même sans déplacement du pointeur, et reste inclus dans la même opération annuler/rétablir. Espace est réservé à la zone 3D, hors formulaires, contrôles et fenêtres modales. Le geste choisi à l’appui reste inchangé si Espace est pressé ou relâché en cours de route. Le déplacement capture le pointeur, y compris pour un dépôt hors du canvas. Échap, une annulation du pointeur ou la perte de focus restaurent la position initiale. Un geste terminé correspond à une seule opération annuler/rétablir.

Dupliquer place la copie sur le côté libre le plus proche, avec un espace entre les pièces. Les groupes et sélections multiples sont déplacés comme un ensemble, à la même hauteur, en conservant leur orientation et leurs positions relatives. Les autres pièces, même masquées ou verrouillées, sont prises en compte. Coller recherche également un emplacement libre si la position d’origine est occupée.

La flèche à gauche d’un groupe replie ou déplie ses enfants ; les groupes imbriqués conservent leur propre état. Les commandes « Tout replier » et « Tout déplier » agissent sur toute l’arborescence. Le compteur indique le nombre total de pièces du groupe, et un point bleu signale une sélection à l’intérieur d’une branche repliée. La sélection et la visibilité 3D sont conservées. Une nouvelle sélection dans la scène ouvre ses groupes parents ; déposer une pièce dans un groupe replié ouvre celui-ci. Les flèches sont utilisables avec Entrée ou Espace. Le repli est un état local de l’interface, sans sauvegarde ni opération annuler/rétablir.

Le menu de parent dans les propriétés et le glisser-déposer réorganisent la hiérarchie en conservant les positions mondiales. Pendant la prise, les lignes se déplacent pour prévisualiser l’ordre : viser le haut ou le bas d’une ligne insère avant ou après, viser le centre d’un groupe range dedans. Maintenir le survol d’un groupe replié l’ouvre ; approcher les bords de la liste la fait défiler. Déposer dans l’espace libre en bas de la liste place la sélection tout en bas, à la racine. Une pièce sélectionnée entraîne les autres branches sélectionnées, sauf celles verrouillées. Le dépôt crée une seule opération annuler/rétablir ; Échap, la perte de focus ou un relâchement hors de la liste annulent l’aperçu. Masquage et verrouillage sont hérités des groupes.

Raccourcis : Supprimer / Retour arrière, Échap, F pour cadrer, Cmd/Ctrl-Z et Maj-Cmd/Ctrl-Z, Cmd/Ctrl-Y, Cmd/Ctrl-C/V/D, Cmd/Ctrl-G et Maj-Cmd/Ctrl-G. Les formulaires gardent leurs raccourcis de saisie.

Les flèches déplacent la sélection d’une case sur les axes fixes du quadrillage : gauche/droite sur X, haut/bas sur Z. Maj + haut/bas monte ou descend de 1,2 unité, soit la hauteur d’une brique. Les groupes restent rigides et conservent leur rotation ; les branches verrouillées restent immobiles. Une destination occupée ou sous le sol est refusée sans créer d’historique. Chaque pas accepté s’annule normalement. Les flèches restent réservées à la saisie dans les champs, aux contrôles et aux fenêtres modales ; elles ne modifient pas une manipulation en cours.

## Modèle et sécurité

`packages/scene` définit `SceneDocument` version 1, catalogue `clik-1`, positions et rotations Euler XYZ en radians. Chaque nœud référence un parent ; les matrices locales sont composées dans l’ordre de la hiérarchie. Le validateur partagé contrôle les valeurs finies, couleurs, modèles, unicité des identifiants, existence des parents, absence de cycle, 500 pièces et 512 Kio en UTF-8. Les groupes sont limités par le plafond de 1 000 nœuds total.

Chaque lecture et mutation privée vérifie le propriétaire via Better Auth. Les sauvegardes utilisent une révision comparée atomiquement côté Convex. Aucun écrasement forcé n’est exposé. IndexedDB conserve les changements non envoyés et détecte les écritures concurrentes dans une transaction. BroadcastChannel informe les autres onglets.

Les tableaux Convex séparent `projects`, `publications`, `versions` et les associations propriétaires de `thumbnails`. Une publication capture une copie immuable du brouillon. Une reprise copie la version affichée, pas la version la plus récente au moment du clic. Le retrait cache toutes les versions de l’original aux visiteurs sans supprimer les projets dérivés ni leur attribution.

Les miniatures passent par une action authentifiée qui vérifie le projet, la signature PNG, les dimensions et la taille, puis utilise Convex Storage. L’enregistrement d’appartenance est interne ; un identifiant de fichier arbitraire ne permet pas de publier une miniature étrangère.

La publication depuis l’atelier et depuis « Mes créations » utilise le même rendu PNG de 640 × 480 : cadrage automatique sur toutes les pièces visibles, fond transparent, éclairage fixe et aucun quadrillage ni outil de sélection. La caméra et l’éclairage choisis dans l’atelier n’affectent pas la miniature. Les images déjà publiées sont renouvelées lors de la prochaine mise à jour de leur publication.

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

## Galeries des créateurs

Chaque compte dispose d’une page publique `/gallery/user/<identifiant du compte>`. Cet identifiant reste stable lorsque le nom change. La page affiche le nom et la photo actuels du compte, ou une initiale si la photo manque, puis ses publications actives par ordre de publication décroissant, par pages de 12. Les créations libres et les participations aux défis partagent la même grille ; les défis conservent leur badge. Les projets privés, publications retirées et anciennes versions n’y apparaissent pas.

Le nom de l’auteur ouvre cette page depuis la galerie, les défis, une création et ses commentaires. Le menu du compte propose aussi « Ma page publique ». La consultation ne demande pas de connexion. La requête d’identité publique renvoie uniquement l’identifiant, le nom et l’URL de la photo ; les informations privées du compte restent exclues. L’index `publications.by_owner_recent` permet la pagination par auteur sans parcourir toute la galerie.

## Le défi du jour

Chaque journée UTC propose un lot commun de 100 pièces réparties sur 12 modèles. Les couleurs sont libres et utiliser tout le stock n’est pas obligatoire. Le tirage est déterministe et versionné ; le lot enregistré ne change plus. Le cron Convex crée le défi à minuit UTC ; l’ouverture de la page initialise aussi celui du jour si nécessaire, sans créer d’archives rétroactives.

Un compte dispose d’un projet et d’une participation par défi. L’éditeur limite tous les ajouts, duplications, collages et annulations au stock disponible, y compris les pièces masquées et groupées. Convex contrôle aussi les quantités et la clôture lors de la publication. Une participation peut être mise à jour jusqu’à minuit UTC en conservant ses votes et commentaires. Après clôture, le projet devient consultable et peut être copié dans une création libre ; les modifications privées non publiées restent conservées.

Chaque compte peut soutenir trois créations par défi, retirer un vote pour changer de choix, et voter sur les journées précédentes sans partager leurs quotas. Voter pour sa propre création est interdit. Retirer une publication invalide ses votes et libère les quotas ; la republier ne restaure pas ces votes.

Toutes les créations publiques disposent de commentaires en texte simple (1 à 1 000 caractères), paginés par 20, du plus récent au plus ancien. La lecture est publique ; publier, voter et commenter demandent une connexion. Seul l’auteur peut modifier ou supprimer son commentaire.

Les tables `challenges`, `challengeVotes` et `comments` complètent les projets/publications existants. Aucun changement du format JSON des scènes n’est nécessaire. Synchroniser les fonctions et le schéma Convex en même temps que le frontend, avec le cron de `convex/crons.ts`.
