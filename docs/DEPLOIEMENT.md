# Déployer Clik sur Convex, Cloudflare Workers et Resend

Guide établi le 6 octobre 2026 à partir de la configuration du dépôt et des étapes de mise en ligne. Il reprend les commandes, les réglages à conserver et les erreurs rencontrées.

Le domaine acheté pour l’application est **clik.build**, chez Cloudflare Registrar. L’adresse initialement fournie par Cloudflare est **https://clik.throuquette.workers.dev**. Les exemples précédents utilisant `clik.io` doivent être remplacés par `clik.build` pour cette installation.

## 1. Comprendre les trois services

| Service                    | Ce qu’il héberge ou réalise                                                      | Configuration du projet      |
| -------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| Cloudflare Workers         | Frontend React, serveur TanStack Start, routes `/api/auth/*` et fichiers publics | `apps/web`                   |
| Convex                     | Fonctions backend, base de données, stockage Convex et Better Auth               | `packages/backend/convex`    |
| Resend                     | Envoi des emails de vérification et de réinitialisation du mot de passe          | Appelé par le backend Convex |
| Cloudflare Registrar / DNS | Domaine `clik.build` et enregistrements du site et des emails                    | Tableau de bord Cloudflare   |

Le frontend appelle Convex avec deux URL : `.convex.cloud` pour les requêtes backend et `.convex.site` pour les routes HTTP utilisées notamment par l’authentification.

Le déploiement du frontend et celui de Convex sont deux opérations distinctes. La commande Wrangler ne déploie pas le backend Convex.

## 2. Préparer l’environnement local

« Localement » signifie **dans le terminal de son ordinateur, à l’intérieur du dépôt**. Un fichier `.env.local` est un fichier de configuration sur cet ordinateur ; ses valeurs ne sont pas automatiquement transférées aux services.

Depuis la racine du dépôt :

```bash
bun --version
node --version
bun install --frozen-lockfile
```

Le projet déclare Bun **1.3.0**. Les versions installées lors de la préparation demandent :

- Wrangler : Node.js 22 minimum.
- TanStack Start : Node.js **22.12 minimum**.

Utiliser Node.js 22 à jour, ou une version plus récente compatible. Le terminal utilisé pour une vérification lançait Node.js `20.10.0`, ce qui empêchait Wrangler de démarrer. Vérifier la version dans le terminal où les commandes seront exécutées.

Si le projet Convex n’est pas encore configuré, lancer depuis la racine :

```bash
bun run dev:setup
```

La CLI associe le dépôt à un projet Convex et écrit sa configuration dans `packages/backend/.env.local`. Pour un projet déjà associé, conserver cette configuration.

## 3. Préparer TanStack Start pour Cloudflare

Ces modifications sont déjà présentes dans le dépôt. Pour une nouvelle installation, elles constituent les fichiers à vérifier.

### Installer les outils dans le frontend

Depuis la racine :

```bash
cd apps/web
bun add -D @cloudflare/vite-plugin wrangler
cd ../..
```

Wrangler est l’outil en ligne de commande de Cloudflare. `bunx` permet de lancer cet outil ; `wrangler login` authentifie le terminal et `wrangler deploy` publie le Worker.

### Ajouter le plugin Vite

Dans `apps/web/vite.config.ts`, importer :

```ts
import { cloudflare } from "@cloudflare/vite-plugin";
```

Puis placer ce plugin avant `tanstackStart`, en conservant les autres plugins et réglages du fichier :

```ts
cloudflare({ viteEnvironment: { name: "ssr" } }),
tanstackStart({
  server: { entry: "server.ts" },
  router: { quoteStyle: "double", semicolons: true },
}),
```

### Ajouter la configuration Wrangler

Le fichier `apps/web/wrangler.jsonc` contient :

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "clik",
  "compatibility_date": "2026-10-06",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts",
  "observability": {
    "enabled": true,
  },
}
```

Le point d’entrée est `src/server.ts` : Clik possède un serveur TanStack Start personnalisé. La date de compatibilité concerne le comportement du runtime Workers ; elle ne remplace pas la version de Node.js utilisée pour compiler.

### Ajouter les scripts du frontend

Dans `apps/web/package.json`, conserver les scripts existants et disposer de :

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "bun run build && wrangler deploy",
    "cf-typegen": "wrangler types"
  }
}
```

`bun run deploy` compile puis publie. Avec `&&`, une compilation qui échoue empêche la publication. `cf-typegen` génère les types de la configuration Worker ; ce script est utile pour les bindings Cloudflare, mais n’est pas obligatoire pour déployer.

Les fichiers Vite, Wrangler, `apps/web/package.json` et le `bun.lock` à la racine doivent être commités pour être disponibles dans les builds distants. [Guide Cloudflare pour TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)

## 4. Relier clik.build au Worker

Créer ou sélectionner le Worker **clik** dans Cloudflare. Le nom correspond au champ `name` du fichier Wrangler.

Dans **Workers & Pages → clik → Settings → Domains & Routes** :

1. Cliquer sur **Add → Custom Domain**.
2. Saisir exactement `clik.build`, sans `https://` et sans chemin.
3. Valider avec **Add Custom Domain**.

Un sous-domaine comme `app.clik.build` n’est pas nécessaire : le site peut être directement accessible sur **https://clik.build**. Cloudflare crée les enregistrements DNS et le certificat HTTPS pour ce domaine personnalisé.

`www.clik.build` est un autre nom d’hôte. S’il doit aussi fonctionner, le configurer séparément, par exemple avec une redirection vers `https://clik.build`. [Domaines personnalisés Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 5. Configurer Resend pour tous les utilisateurs

### Vérifier le domaine d’envoi

Dans **Resend → Domains → Add Domain**, ajouter :

```text
clik.build
```

Le domaine d’envoi doit être contrôlé par le propriétaire du compte. L’adresse `.workers.dev` ne donne pas accès aux DNS nécessaires à cette vérification.

La configuration retenue utilise le domaine racine `clik.build`. Resend permet aussi de vérifier un sous-domaine d’envoi ; dans ce cas, l’adresse d’expédition doit utiliser ce sous-domaine. [Domaines vérifiés Resend](https://resend.com/docs/dashboard/domains/introduction)

Pour les DNS, suivre l’une des méthodes proposées par Resend :

1. **Configuration automatique** : utiliser **Sign in to Cloudflare** et autoriser l’ajout des DNS pour le domaine choisi.
2. **Configuration manuelle** : ouvrir **Cloudflare → clik.build → DNS → Records** et recopier les enregistrements DKIM et SPF demandés par Resend, y compris le MX d’envoi s’il est affiché.

Copier les valeurs, noms et priorités fournis par Resend : ils dépendent de la configuration et de la région. Pour les enregistrements qui proposent un statut de proxy, utiliser **DNS only**. Les TXT et MX ne sont pas proxifiés. Activer la réception d’emails uniquement si elle est souhaitée.

Cliquer sur la vérification DNS dans Resend et attendre que l’envoi soit validé. Les enregistrements tels que `send` ou `resend._domainkey` servent aux emails ; ils n’imposent pas de sous-domaine pour le site. [Configurer Resend avec Cloudflare](https://resend.com/docs/knowledge-base/cloudflare)

### Définir l’expéditeur et la clé API

Créer une clé API Resend pour l’envoi. Dans les variables du déploiement **Convex de production**, renseigner :

| Nom              | Valeur                                 |
| ---------------- | -------------------------------------- |
| `RESEND_API_KEY` | Clé API Resend utilisée par le backend |
| `EMAIL_FROM`     | `Clik <bonjour@clik.build>`            |

Dans le champ de valeur du tableau de bord Convex, coller seulement `Clik <bonjour@clik.build>`, sans `EMAIL_FROM=` et sans guillemets.

Le domaine doit être vérifié avant d’utiliser cet expéditeur. Il n’est pas nécessaire de créer une boîte mail `bonjour@clik.build` pour envoyer avec Resend ; une boîte ou un service de réception est nécessaire si l’on veut lire les réponses.

### Pourquoi l’expéditeur de test ne suffit pas

`Clik <onboarding@resend.dev>` permet de tester l’envoi vers l’adresse associée au compte Resend. Cet expéditeur ne convient pas aux emails d’inscription de tous les utilisateurs.

La valeur initiale `Clik <bonjour@clik.io>` était également à remplacer : ce domaine n’était pas possédé ni vérifié pour cette installation. [Restriction du domaine de test Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)

## 6. Configurer et déployer Convex en production

### Choisir le bon déploiement

Dans le tableau de bord Convex, sélectionner le projet associé au dépôt, puis son déploiement **Production**.

`packages/backend/.env.local` peut conserver une valeur `CONVEX_DEPLOYMENT=dev:...`. Elle associe la CLI au projet. Dans cette configuration, `convex dev` cible le développement et `convex deploy` cible normalement la production du même projet.

Si `CONVEX_DEPLOY_KEY` est définie dans le terminal ou la CI, vérifier également le déploiement associé à cette clé. Contrôler la cible indiquée par la CLI avant de valider la publication. [Commande convex deploy](https://docs.convex.dev/cli/reference/deploy)

### Renseigner les variables backend

Ouvrir **Convex → Production → Settings → Environment Variables** :

| Variable               | Valeur pour Clik                              |
| ---------------------- | --------------------------------------------- |
| `SITE_URL`             | `https://clik.build`                          |
| `BETTER_AUTH_URL`      | `https://clik.build`                          |
| `BETTER_AUTH_SECRET`   | Secret aléatoire conservé pour ce déploiement |
| `RESEND_API_KEY`       | Clé API Resend                                |
| `EMAIL_FROM`           | `Clik <bonjour@clik.build>`                   |
| `GOOGLE_CLIENT_ID`     | Identifiant OAuth Google de production        |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google de production             |
| `GITHUB_CLIENT_ID`     | Identifiant OAuth GitHub de production        |
| `GITHUB_CLIENT_SECRET` | Secret OAuth GitHub de production             |

Google et GitHub sont configurés dans `packages/backend/convex/auth.ts`. Renseigner leurs identifiants pour utiliser ces connexions.

Pour la première configuration du secret d’authentification, générer une valeur dans son terminal :

```bash
openssl rand -base64 32
```

Copier le résultat dans `BETTER_AUTH_SECRET` sur Convex et le conserver pour les déploiements suivants.

Les variables sont propres à chaque déploiement. Celles du développement ou d’un fichier local ne sont pas copiées automatiquement vers la production. [Variables d’environnement Convex](https://docs.convex.dev/production/environment-variables)

### Déployer le backend

Depuis la racine du dépôt :

```bash
cd packages/backend
bunx --bun convex deploy
cd ../..
```

Pour modifier des valeurs publiques depuis le terminal, la CLI accepte aussi :

```bash
# Depuis packages/backend
bunx --bun convex env set --prod SITE_URL 'https://clik.build'
bunx --bun convex env set --prod BETTER_AUTH_URL 'https://clik.build'
bunx --bun convex env set --prod EMAIL_FROM 'Clik <bonjour@clik.build>'
```

### Récupérer les deux URL de production

Dans les paramètres du déploiement Convex **Production**, récupérer :

| URL                                              | Utilisation dans Cloudflare |
| ------------------------------------------------ | --------------------------- |
| `https://<nom-du-deploiement-prod>.convex.cloud` | `VITE_CONVEX_URL`           |
| `https://<nom-du-deploiement-prod>.convex.site`  | `VITE_CONVEX_SITE_URL`      |

Remplacer `<nom-du-deploiement-prod>` par les valeurs réellement affichées par Convex. Les deux URL doivent appartenir au même déploiement de production.

## 7. Configurer le build Cloudflare du monorepo

Connecter le dépôt Git au Worker **clik**, puis ouvrir **Settings → Build → Build Configuration**.

Les réglages retenus pour que Bun installe les workspaces à la racine et que Wrangler soit exécuté dans le frontend sont :

| Réglage           | Valeur                                                          |
| ----------------- | --------------------------------------------------------------- |
| Root directory    | `/` — racine du dépôt                                           |
| Build command     | `bun install --frozen-lockfile && bun run --cwd apps/web build` |
| Deploy command    | `cd apps/web && bunx wrangler deploy`                           |
| Production branch | Branche Git choisie pour la production                          |

La commande de build travaille depuis la racine, où se trouve `bun.lock`. La commande de publication entre explicitement dans `apps/web`, où se trouvent Wrangler et sa configuration.

La connexion `wrangler login` sur l’ordinateur authentifie le terminal local. Les builds Cloudflare utilisent leur propre token, configuré dans les paramètres de build. [Configuration Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

### Variables de l’outil de build

Dans **Settings → Build → Build variables and secrets**, ajouter en type texte :

| Variable       | Valeur  | Utilité                                    |
| -------------- | ------- | ------------------------------------------ |
| `BUN_VERSION`  | `1.3.0` | Version déclarée par le projet             |
| `NODE_VERSION` | `22`    | Utiliser Node.js 22 à jour, au moins 22.12 |

Optionnel : ajouter `SKIP_DEPENDENCY_INSTALL=1` pour désactiver l’installation automatique Cloudflare et conserver seulement le `bun install` déjà présent dans la commande de build. [Versions et installation des outils de build](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)

### Variables du frontend

Dans la même section **Build variables and secrets**, ajouter ces valeurs publiques en type **Text**, sans guillemets :

| Variable                   | Valeur                                                | Statut                                                                     |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `VITE_SITE_URL`            | `https://clik.build`                                  | Obligatoire en production                                                  |
| `VITE_CONVEX_URL`          | URL Convex de production terminant en `.convex.cloud` | Obligatoire                                                                |
| `VITE_CONVEX_SITE_URL`     | URL du même déploiement terminant en `.convex.site`   | Obligatoire                                                                |
| `VITE_SEO_INDEXABLE`       | `true`                                                | Pour autoriser le référencement du site public ; `false` pendant les tests |
| `VITE_PUBLIC_POSTHOG_KEY`  | Clé publique du projet PostHog                        | Optionnel                                                                  |
| `VITE_PUBLIC_POSTHOG_HOST` | URL fournie par PostHog                               | Optionnel, avec la clé                                                     |

Clik lit ces variables via Vite pendant la compilation. Les modifier nécessite donc de relancer un **build complet**. La section **Settings → Variables & Secrets** configure les variables du Worker à l’exécution ; pour les `VITE_*` actuelles, utiliser la section **Build**.

Les `VITE_*` sont intégrées au code du frontend. Les secrets Resend, Better Auth et OAuth sont utilisés par Convex et restent configurés sur son déploiement. [Variables et modes Vite](https://vite.dev/guide/env-and-mode)

## 8. Mettre à jour les connexions Google et GitHub

Après le passage de `.workers.dev` à `clik.build`, ajuster les applications OAuth :

| Fournisseur | Réglage                                   | Valeur                                        |
| ----------- | ----------------------------------------- | --------------------------------------------- |
| Google      | Authorized JavaScript origins, si utilisé | `https://clik.build`                          |
| Google      | Authorized redirect URIs                  | `https://clik.build/api/auth/callback/google` |
| GitHub      | Homepage URL                              | `https://clik.build`                          |
| GitHub      | Authorization callback URL                | `https://clik.build/api/auth/callback/github` |

Les callbacks passent par le frontend Clik. Les identifiants et secrets correspondants sont enregistrés sur Convex Production. [Google avec Better Auth](https://better-auth.com/docs/authentication/google), [GitHub avec Better Auth](https://better-auth.com/docs/authentication/github)

## 9. Publier et redéployer

### Depuis le dépôt Git connecté à Cloudflare

1. Déployer Convex si le backend a changé.
2. Commiter les changements et pousser vers la branche de production configurée dans Cloudflare.
3. Suivre le build et la publication dans le tableau de bord du Worker.

Pour relancer un échec : **Workers & Pages → clik → Deployments → View Build History → build concerné → Retry build**.

Un retry applique les réglages de build actuels au commit sélectionné. Si les fichiers ont changé depuis ce commit, pousser les corrections et utiliser le nouveau build. [Relancer un build Cloudflare](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/), [Application des réglages de build](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

### Depuis le terminal local avec Wrangler

Depuis la racine :

```bash
cd apps/web
bunx wrangler login
```

Le navigateur ouvre une demande d’autorisation Cloudflare. Si elle suit cette commande et correspond au bon compte, cliquer sur **Authorize**, puis attendre la confirmation de connexion dans le terminal. [Authentification Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/general/#login)

Le terminal local doit aussi fournir les variables de production. Les variables enregistrées dans les builds Cloudflare ne sont pas automatiquement disponibles sur l’ordinateur.

Depuis `apps/web`, remplacer les deux URL ci-dessous par celles de Convex Production, puis exécuter :

```bash
(
  export VITE_CONVEX_URL='https://<nom-du-deploiement-prod>.convex.cloud'
  export VITE_CONVEX_SITE_URL='https://<nom-du-deploiement-prod>.convex.site'
  export VITE_SITE_URL='https://clik.build'
  export VITE_SEO_INDEXABLE='true'
  bun run deploy
)
cd ../..
```

Les parenthèses limitent ces variables à cette commande. Pour activer PostHog lors d’une publication locale, fournir également ses deux variables publiques dans ce bloc.

`bun run deploy` équivaut à lancer `bun run build`, puis `bunx wrangler deploy` depuis le frontend. Le login peut être réutilisé pour les publications suivantes tant qu’il reste valide.

## 10. Dépannage et erreurs rencontrées

Les échecs observés ont été l’absence de Wrangler lors de la publication, la version Node.js incompatible lors d’une vérification locale et l’absence de `VITE_SITE_URL` dans le build. Les autres lignes aident à diagnostiquer les réglages des services.

| Erreur ou symptôme                                                       | Cause ou diagnostic                                                                                               | Correction                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Build réussi, puis `sh: 1: wrangler: not found`                          | Wrangler était déclaré dans `apps/web` ; le dossier de publication et la résolution de l’outil étaient à corriger | Installer à la racine avec Bun, puis publier avec `cd apps/web && bunx wrangler deploy` |
| Wrangler exige Node.js 22, mais le terminal utilise `20.10.0`            | Version locale incompatible                                                                                       | Utiliser Node.js 22.12 ou supérieur et vérifier `node --version`                        |
| `VITE_SITE_URL est obligatoire en production`, erreur Cloudflare `10021` | Le Worker lançait un bundle compilé sans l’URL du site                                                            | Ajouter `VITE_SITE_URL=https://clik.build` aux variables de **build** et reconstruire   |
| L’application utilise le backend de développement                        | URL Convex de développement fournie au frontend                                                                   | Utiliser les deux URL du même déploiement **Production**, puis reconstruire             |
| Envoi depuis `bonjour@clik.io` refusé                                    | Domaine d’exemple non possédé et non vérifié                                                                      | Vérifier `clik.build` dans Resend et utiliser `Clik <bonjour@clik.build>`               |
| Les emails de test arrivent seulement à l’adresse du compte Resend       | Restriction de l’expéditeur `onboarding@resend.dev`                                                               | Utiliser l’expéditeur du domaine vérifié                                                |
| Connexion Google/GitHub refusée après le changement de domaine           | Callback OAuth ou URL Better Auth restés sur l’ancienne adresse                                                   | Mettre à jour les callbacks, `SITE_URL` et `BETTER_AUTH_URL`                            |
| Nouvelle configuration absente après un retry                            | Le retry porte sur un ancien commit                                                                               | Pousser le commit contenant les corrections et déployer celui-ci                        |

## 11. Contrôler la mise en ligne

- [ ] Le domaine personnalisé `clik.build` est relié au Worker et HTTPS fonctionne.
- [ ] Le Worker et Convex utilisent les versions de code attendues.
- [ ] `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL` pointent vers le même backend de production.
- [ ] `VITE_SITE_URL`, `SITE_URL` et `BETTER_AUTH_URL` valent `https://clik.build`.
- [ ] Resend confirme que `clik.build` est vérifié pour l’envoi.
- [ ] `EMAIL_FROM` vaut `Clik <bonjour@clik.build>` sur Convex Production.
- [ ] Une inscription de test, avec une adresse différente de celle du compte Resend, reçoit son email et le lien permet de vérifier le compte.
- [ ] La réinitialisation du mot de passe fonctionne et son lien revient sur `clik.build`.
- [ ] Les connexions Google et GitHub fonctionnent si elles sont proposées.
- [ ] Les illustrations `https://clik.build/emails/verify-email.png` et `https://clik.build/emails/reset-password.png` sont accessibles.
- [ ] Les liens et images des emails utilisent le bon domaine.
- [ ] `VITE_SEO_INDEXABLE=true` est activé pour le site public final.

Les illustrations des emails sont servies par le frontend depuis `apps/web/public/emails`. Après une modification de ces fichiers, publier aussi le frontend ; un déploiement Convex seul ne met pas ces images à jour.

## 12. Pour les prochaines publications

Si le domaine, les secrets et les intégrations ne changent pas, leur configuration initiale n’est pas à refaire.

Pour une évolution du backend, depuis la racine :

```bash
cd packages/backend
bunx --bun convex deploy
cd ../..
```

Puis pousser le commit du frontend sur la branche reliée à Cloudflare, ou utiliser la publication locale décrite plus haut. Pour une modification du frontend uniquement, un déploiement Cloudflare suffit.

Après un changement de domaine, modifier les trois URL de l’application, les callbacks OAuth et, si le domaine d’envoi change également, la vérification Resend et `EMAIL_FROM`. Après un changement de variable `VITE_*`, reconstruire le frontend.
