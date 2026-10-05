# Clik

Application TypeScript avec React, TanStack Start et Convex.

L’atelier 3D et la galerie Clik sont documentés dans [le guide V1](docs/CLIK.md), avec les résultats dans [le rapport de validation](docs/VALIDATION.md).

Le boilerplate inclut l’authentification Better Auth, la vérification d’email et la réinitialisation du mot de passe via Resend, les connexions Google et GitHub, le stockage de fichiers avec Cloudflare R2 et les analytics PostHog. L’interface utilise Tailwind CSS et shadcn/ui ; le monorepo utilise Bun et Turborepo.

## Prérequis

- Bun : le projet déclare la version `1.3.0` dans `package.json`.
- Un compte Convex pour créer le backend de Clik.
- Un compte Resend et une adresse d’expédition configurée pour tester l’inscription par email.
- OpenSSL pour générer le secret d’authentification avec la commande ci-dessous.

## Installation et premier démarrage

Exécuter les commandes à la racine du dépôt, sauf indication contraire.

### 1. Installer les dépendances et initialiser Convex

```bash
bun install
bun run dev:setup
```

Suivre les instructions pour se connecter à Convex et créer un **nouveau projet pour Clik**. Le fichier `packages/backend/.env.local` contient ensuite la configuration du déploiement utilisé par la CLI Convex, notamment `CONVEX_DEPLOYMENT`.

### 2. Configurer les URL du frontend

Créer `apps/web/.env` :

```dotenv
VITE_CONVEX_URL=https://ton-deploiement.convex.cloud
VITE_CONVEX_SITE_URL=https://ton-deploiement.convex.site
```

Remplacer `ton-deploiement` par le nom du déploiement de développement créé à l’étape précédente. Les URL sont disponibles dans Convex :

- `VITE_CONVEX_URL` termine en `.cloud` et permet de communiquer avec le backend.
- `VITE_CONVEX_SITE_URL` termine en `.site` et permet d’appeler ses routes HTTP, notamment celles de l’authentification.

Si Convex génère une variable nommée `CONVEX_URL` dans le fichier du backend, utiliser sa valeur pour `VITE_CONVEX_URL` dans le frontend.

### 3. Configurer l’authentification sur Convex

**Les variables ajoutées dans un fichier `.env` local ne sont pas automatiquement transférées au déploiement Convex.** Les fonctions du backend lisent les variables configurées sur ce déploiement, via la CLI ou le dashboard Convex.

Depuis le dossier backend :

```bash
cd packages/backend
bunx --bun convex env set SITE_URL http://localhost:3001
bunx --bun convex env set BETTER_AUTH_URL http://localhost:3001
bunx --bun convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
cd ../..
```

`SITE_URL` définit l’origine autorisée de l’application. `BETTER_AUTH_URL` définit son URL de base pour l’authentification. Ces valeurs correspondent ici au serveur de développement local ; utiliser l’URL publique de l’application sur un déploiement de production.

Générer `BETTER_AUTH_SECRET` une seule fois lors de la configuration initiale et conserver cette valeur lors des démarrages suivants.

Les exemples utilisent `bunx --bun` pour exécuter la CLI avec Bun.

### 4. Configurer les emails sur Convex

La vérification d’email est activée dans ce boilerplate. **Resend doit être configuré pour terminer une inscription par email**, ainsi que pour réinitialiser un mot de passe.

Dans les paramètres du déploiement Convex de développement, ajouter :

| Variable         | Valeur à renseigner                                                             |
| ---------------- | ------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | La clé API du compte Resend utilisé par Clik                                    |
| `EMAIL_FROM`     | L’expéditeur configuré dans Resend, par exemple `Clik <bonjour@ton-domaine.fr>` |

Ces variables peuvent aussi être définies avec `bunx --bun convex env set NOM_VARIABLE 'valeur'`, depuis `packages/backend`.

### 5. Lancer l’application

Depuis la racine du dépôt :

```bash
bun run dev
```

Cette commande lance le frontend et le backend Convex en mode développement. Ouvrir **[http://localhost:3001](http://localhost:3001)**.

Pour les démarrages suivants, `bun run dev` suffit si la configuration est déjà en place. Après une modification de `apps/web/.env`, redémarrer le serveur frontend.

## Où configurer les variables ?

| Emplacement                     | Usage                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/backend/.env.local`   | Configuration locale de la CLI, notamment le déploiement ciblé par `CONVEX_DEPLOYMENT` |
| `apps/web/.env`                 | Variables du frontend : URL Convex et configuration publique PostHog                   |
| Variables du déploiement Convex | Configuration des fonctions backend : authentification, Resend, OAuth et R2            |

Ne pas copier tout le fichier du backend dans celui du frontend. Ajouter uniquement les variables nécessaires à chaque emplacement. Les variables préfixées par `VITE_` sont accessibles au navigateur : elles ne doivent pas contenir de secrets. Les fichiers `.env` locaux sont ignorés par Git.

## Services complémentaires

Ces services sont nécessaires pour utiliser les fonctionnalités correspondantes.

### Connexion Google et GitHub

Créer les applications OAuth auprès des fournisseurs concernés, puis ajouter leurs identifiants dans les **variables du déploiement Convex** :

| Fournisseur | Variables                                  |
| ----------- | ------------------------------------------ |
| Google      | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub      | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

Configurer également les URL de retour OAuth chez chaque fournisseur en fonction de l’URL de l’application.

### Fichiers et avatars avec Cloudflare R2

Configurer le bucket et ses accès dans Cloudflare, puis ajouter les variables suivantes dans **Convex** :

```text
R2_BUCKET
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### Analytics avec PostHog

Ajouter les valeurs du projet PostHog dans **`apps/web/.env`** :

```dotenv
VITE_PUBLIC_POSTHOG_KEY=cle_publique_du_projet
VITE_PUBLIC_POSTHOG_HOST=https://hote-indique-par-posthog
```

Utiliser la clé publique du projet destinée au SDK web et l’hôte indiqué par PostHog.

## Dépannage

### « A provided trusted origin is invalid »

Vérifier que `SITE_URL` est définie **sur le déploiement Convex utilisé par l’application**, et pas seulement dans un fichier local :

```bash
cd packages/backend
bunx --bun convex env get SITE_URL
bunx --bun convex env set SITE_URL http://localhost:3001
cd ../..
```

Rafraîchir ensuite l’application à l’adresse `http://localhost:3001`.

### « Object is missing the required field from » lors de l’inscription

L’expéditeur transmis à l’action d’envoi provient de `EMAIL_FROM`. Vérifier que cette variable est renseignée sur Convex, ainsi que `RESEND_API_KEY`. Le champ `from` doit rester obligatoire.

Une fois la configuration corrigée, utiliser la page `/verify-email` pour demander un nouvel email de vérification si le compte a déjà été créé.

### « Could not find a declaration file for module react/jsx-runtime »

Le backend utilise du JSX pour les emails. Il déclare donc `@types/react` dans ses dépendances de développement. Relancer `bun install` à la racine si ces types ne sont pas installés.

Pour vérifier uniquement le TypeScript du backend, depuis la racine :

```bash
bunx --bun tsc --project packages/backend/convex/tsconfig.json --noEmit
```

## Structure du projet

```text
clik/
├── apps/web/             # Frontend React + TanStack Start
├── packages/backend/    # Fonctions, authentification et schéma Convex
├── packages/config/     # Configuration TypeScript partagée
└── packages/env/        # Validation des variables du frontend
```

## Commandes utiles

À exécuter depuis la racine du dépôt :

| Commande             | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `bun install`        | Installer les dépendances du monorepo                        |
| `bun run dev:setup`  | Configurer le projet Convex lors de la première installation |
| `bun run dev`        | Lancer le frontend et le backend en développement            |
| `bun run dev:web`    | Lancer uniquement le frontend                                |
| `bun run dev:server` | Lancer uniquement le backend Convex en développement         |
| `bun run build`      | Construire l’application pour la production                  |

## Documentation

- [Convex et Better Auth avec TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start)
- [Variables d’environnement Convex](https://docs.convex.dev/production/environment-variables)

## Référencement et production

Les pages publiques sont rendues côté serveur : accueil, galerie, profils ayant des
publications, créations publiques et archives des défis. Titres, descriptions,
URL canoniques, Open Graph, Twitter Cards et JSON-LD sont générés par route. Les
espaces personnels, l’atelier et les pages d’authentification restent en `noindex`.
Les publications retirées et les identifiants inconnus renvoient une vraie 404.

Configurer ces variables **au moment du build** :

```dotenv
VITE_SITE_URL=https://clik.io
VITE_SEO_INDEXABLE=true
```

`VITE_SITE_URL` est obligatoire en production. Adapter cette valeur si le domaine
final change. En développement, et tant que `VITE_SEO_INDEXABLE` n’est pas
explicitement `true`, le site reste en `noindex` et `robots.txt` interdit le crawl.
Garder `false` pour les aperçus de déploiement et la préproduction.

Le serveur TanStack Start doit être déployé avec les fichiers `dist/client` : un
hébergement qui sert uniquement une SPA statique ne suffit plus. Le point d’entrée
est `apps/web/src/server.ts`. Il exclut les erreurs de l’indexation et interdit la
mise en cache partagée du HTML pouvant contenir une session. Configurer HTTPS, la
compression et le cache long des assets hachés sur la plateforme choisie. Les
requêtes GET/HEAD sur l’hôte canonique en HTTP ou sa variante `www` sont redirigées
vers l’origine configurée ; conserver également cette redirection au niveau CDN.

Déployer les nouvelles fonctions Convex (`projects.sitemapPage`,
`challenges.sitemapPage`, `challenges.publicNeighbors`) **avant le frontend**.
Aucune migration de schéma n’est nécessaire. Le serveur lit Convex anonymement
pour les données publiques : les projets privés et les brouillons ne sont jamais
utilisés pour le référencement. Les interactions authentifiées conservent leurs
abonnements temps réel.

- `/robots.txt` annonce `/sitemap.xml` sur la production indexable.
- `/sitemap.xml` indexe des fichiers `/sitemaps/0.xml`, etc., de 10 000 URL au plus.
- Les données sont lues par lots de 250, avec un cache serveur de cinq minutes.
  Une publication retirée disparaît du sitemap au prochain renouvellement ; son
  URL répond immédiatement 404. Les erreurs backend ne produisent pas de sitemap
  vide : le serveur répond 503 et invite à réessayer.
- Les tris partagent l’URL canonique de leur collection ; les pages à curseur sont
  `noindex, follow` et possèdent de vrais liens de pagination.
- Les archives de défis disposent de liens précédent/suivant et d’une URL par date.

Après mise en ligne, vérifier le domaine dans Google Search Console et soumettre
`https://clik.io/sitemap.xml`. Inspecter une création, un profil et un défi archivé,
puis valider leurs données structurées. Ces opérations nécessitent l’accès au
DNS et à Search Console et ne sont pas effectuées par le code.

### Performances et vérifications SEO

Les modèles de l’accueil possèdent des images statiques dans `public/models` ;
leur manipulation 3D démarre lorsqu’ils approchent de la zone visible. Les créations
publiques affichent leur miniature pendant le chargement du canvas. L’image de
partage par défaut est `public/og/clik.png` (1200 × 630).

Si PostHog est configuré, les événements `web_vital` mesurent LCP, INP et CLS en
production. Les routes sont normalisées, sans identifiants de projets ni paramètres
d’URL. Suivre le 75e percentile mobile et bureau : LCP ≤ 2,5 s, INP ≤ 200 ms,
CLS ≤ 0,1. Les mesures locales ne remplacent pas les données réelles de production.

Les tests navigateur publics emploient un backend HTTP de test sur le port 3219
pour les loaders SSR et des WebSockets simulés pour les interactions. Lancer un
serveur dédié (sans aucun utilisateur ni publication créés à distance) :

```bash
cd apps/web
CLIK_VITE_CACHE_DIR=node_modules/.vite-e2e VITE_CONVEX_URL=http://127.0.0.1:3219 VITE_SITE_URL=https://clik.io bun run dev --host 127.0.0.1 --port 3001 --strictPort
# Dans un autre terminal :
bun run test:e2e seo.spec.ts gallery.spec.ts creators.spec.ts challenges.spec.ts remixes.spec.ts creation-view-controls.spec.ts
```

Les assertions couvrent le HTML sans JavaScript, les métadonnées après navigation,
les URL canoniques, les 404, l’exclusion des données privées, les sitemaps et les
interactions publiques sur Chromium, Firefox et WebKit.

PostHog est chargé après le chargement initial, pendant un créneau libre du
navigateur, et uniquement en production. Le moteur de rendu Three est séparé des
modules mathématiques utilisés par les pages publiques. Les paramètres `VITE_*`
font partie de la clé du cache de build Turbo, pour éviter de réutiliser les
métadonnées d’un autre environnement.

Pour régénérer les visuels de référencement et les aperçus des modèles, depuis
`apps/web` (la seconde commande requiert le serveur Vite local) :

```bash
bun scripts/generate-seo-assets.mjs
bun scripts/generate-model-posters.mjs
```

Références : [SEO JavaScript et rendu serveur](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[validation des sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Audit local du build de production : **SEO 100/100**, accessibilité 96/100,
performance mobile 76/100. Le JavaScript initial transféré passe de 518 Ko à
287 Ko (environ −45 %). Le LCP mobile simulé reste autour de 3,5 s : il faut
continuer à surveiller le coût du rendu/hydratation sur les appareils réels, sans
assimiler le score SEO à un score de performance. Les mesures détaillées et leurs
conditions figurent dans [le rapport Lighthouse](apps/web/reports/seo-audit.json).
