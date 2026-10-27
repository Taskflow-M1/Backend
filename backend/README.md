# TaskFlow — API Backend

API REST complète, sécurisée et documentée du projet **TaskFlow**, réalisée en **Node.js**, **Express 5**, **TypeScript**, **MongoDB / Mongoose** et **JWT**.

Ce backend couvre deux espaces complémentaires :
1. **L'espace de tâches personnelles** (`/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/tasks`, `/api/tasks/:id`) avec cloisonnement strict des tâches par utilisateur, statuts HTTP exacts et enveloppe d'erreur normalisée.
2. **La plateforme collaborative de gestion de projets** (`/api/users*`, `/api/teams*`, `/api/projects*`, `/api/features*`, `/api/tickets*`, `/api/comments*`, `/api/dashboard`) intégrant gestion d'équipes par rôles, clés de tickets séquentielles (`TFW-1`), tableau Kanban à 4 colonnes, discussions, journal d'audit automatique et tableau de bord statistique.

---

## Sommaire

1. [Stack technique et versions](#1-stack-technique-et-versions)
2. [Prérequis système](#2-prérequis-système)
3. [Installation et configuration](#3-installation-et-configuration)
4. [Démarrage de MongoDB et lancement du projet](#4-démarrage-de-mongodb-et-lancement-du-projet)
5. [Commandes disponibles et URLs utiles](#5-commandes-disponibles-et-urls-utiles)
6. [Architecture en couches et cycle d'une requête](#6-architecture-en-couches-et-cycle-dune-requête)
7. [Rôles collaboratifs et workflow Kanban](#7-rôles-collaboratifs-et-workflow-kanban)
8. [Catalogue des endpoints REST](#8-catalogue-des-endpoints-rest)
9. [Guide d'intégration Frontend React](#9-guide-dintégration-frontend-react)
10. [Outils de build (Vite, Babel, Webpack) et pipeline CI/CD](#10-outils-de-build-vite-babel-webpack-et-pipeline-cicd)
11. [Sécurité, limites connues et pistes d'évolution](#11-sécurité-limites-connues-et-pistes-dévolution)

---

## 1. Stack technique et versions

| Briques | Technologie | Version | Rôle |
|---|---|---|---|
| Runtime | Node.js | `>= 20.0.0` (validé sur `v24.11.0`) | Exécution JavaScript/TypeScript serveur |
| Framework HTTP | Express | `^5.3.0` | Routage REST, middlewares et gestion native des promesses |
| Langage | TypeScript | `^5.9.0` | Typage statique strict (`strict: true`) |
| Base de données | MongoDB + Mongoose | `^9.11.4` | Modélisation ODM, indexation et requêtes |
| Validation | Zod | `^4.6.7` | Validation stricte des `body`, `params` et `query` |
| Authentification | `jsonwebtoken` + `bcrypt` | `^9.0.3` / `^6.0.0` | Jetons JWT signés (`HS256`) et hachage irréversible (`cost = 10`) |
| Sécurité HTTP | `helmet` + `cors` | `^8.3.0` / `^2.8.6` | En-têtes HTTP sécurisés et contrôle d'origine |
| Documentation | `swagger-ui-express` | `^5.0.1` | Documentation interactive OpenAPI `3.0.3` sur `/api/docs` |
| Qualité & Tests | ESLint + Jest + Supertest | `^10.13.0` / `^29.7.0` / `^7.1.0` | Analyse statique et tests d'intégration HTTP bout en bout |

---

## 2. Prérequis système

- **Node.js** `>= 20` et **npm** `>= 10`
- **MongoDB Community Server** (`>= 6.0` ou `7.x`/`8.x`) en écoute locale sur `127.0.0.1:27017` (ou conteneur Docker équivalent)

---

## 3. Installation et configuration

Depuis la racine du dépôt `TaskFlow` :

```bash
cd backend
npm install
cp .env.example .env
```

### Variables d'environnement (`.env.example`)

Aucun secret réel ne doit jamais être commité dans Git (`.env` est ignoré par `.gitignore`).

| Variable | Description | Défaut / Exemple |
|---|---|---|
| `NODE_ENV` | Environnement (`development`, `test`, `production`) | `development` |
| `PORT` | Port HTTP d'écoute du serveur Express | `3000` (ou `3030` selon votre `.env` local) |
| `CORS_ORIGIN` | Origine(s) Frontend autorisée(s), séparées par des virgules | `http://localhost:5173` |
| `MONGODB_URI` | URI MongoDB de développement ou de production | `mongodb://127.0.0.1:27017/taskflow` |
| `MONGODB_TEST_URI` | URI MongoDB isolée utilisée uniquement par `npm test` (`*_test`) | `mongodb://127.0.0.1:27017/taskflow_test` |
| `JWT_SECRET` | Clé secrète de signature JWT (`>= 32` caractères obligatoires en `production`) | `replace-with-a-random-secret-at-least-32-characters` |
| `JWT_EXPIRES_IN` | Durée de validité des jetons JWT émis | `24h` |

---

## 4. Démarrage de MongoDB et lancement du projet

### 4.1 Démarrer MongoDB

- **macOS (Homebrew)** :
  ```bash
  brew services start mongodb-community
  ```
- **Alternative universelle via Docker** :
  ```bash
  docker run -d --name taskflow-mongo -p 27017:27017 mongo:7
  ```

### 4.2 Démarrer le Backend

```bash
cd backend
npm run dev
```

### 4.3 Démarrer le Frontend React (en parallèle, dans un second terminal)

Lorsque la branche Frontend est présente dans le dossier correspondant (par défaut Vite écoute sur `http://localhost:5173`) :

```bash
cd frontend
npm install
npm run dev
```

Assurez-vous que `CORS_ORIGIN` dans `backend/.env` contient bien l'URL du serveur Vite (`http://localhost:5173`) et que le Frontend pointe vers le port configuré dans `backend/.env` (ex. `http://localhost:3000` ou `http://localhost:3030`).

---

## 5. Commandes disponibles et URLs utiles

Toutes les commandes ci-dessous s'exécutent depuis `backend/` (ou depuis la racine via `npm --prefix backend run <script>`) :

| Commande | Action |
|---|---|
| `npm run dev` | Démarre l'API en mode rechargement à chaud (`tsx watch src/server.ts`) |
| `npm run lint` | Vérifie la qualité du code avec ESLint sur `src/` et `tests/` (`0` warning toléré) |
| `npm run typecheck` | Vérifie le typage TypeScript strict (`tsconfig.json` + `tsconfig.test.json`) |
| `npm test` | Exécute les suites d'intégration Jest + Supertest sur la base isolée `taskflow_test` |
| `npm run build` | Compile le projet TypeScript vers `dist/` |
| `npm start` | Démarre le serveur compilé de production (`node dist/server.js`) |

### URLs principales (en remplaçant `<PORT>` par `3000` ou votre `PORT` local)

- **Healthcheck** : `http://localhost:<PORT>/api/health`
- **Documentation Swagger UI interactive** : `http://localhost:<PORT>/api/docs`
- **Spécification brute OpenAPI 3.0.3 (JSON)** : `http://localhost:<PORT>/api/docs.json`
- **Frontend React (Vite)** : `http://localhost:5173`

---

## 6. Architecture en couches et cycle d'une requête

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.ts             # Connexion/déconnexion Mongoose et masquage d'identifiants URI
│   │   ├── env.ts                  # Validation centralisée des variables d'environnement
│   │   └── swagger.ts              # Spécification complète OpenAPI 3.0.3
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # Vérification du Bearer JWT et hydratation de req.user
│   │   ├── error.middleware.ts     # Gestionnaire global d'erreurs et 404 uniforme
│   │   ├── rate-limit.middleware.ts# Protection anti-force brute (429 + Retry-After)
│   │   └── validate.middleware.ts  # Validation déclarative Zod (body, params, query)
│   ├── modules/
│   │   ├── auth/                   # Inscription et connexion (/api/auth)
│   │   ├── comments/               # Discussions sur les tickets (/api/comments)
│   │   ├── dashboard/              # Statistiques et vue consolidée (/api/dashboard)
│   │   ├── docs/                   # Exposition Swagger UI et /api/docs.json
│   │   ├── features/               # Fonctionnalités produit par projet (/api/features)
│   │   ├── health/                 # Sonde de disponibilité (/api/health)
│   │   ├── projects/               # Projets d'équipes et clés Jira (/api/projects)
│   │   ├── tasks/                  # CRUD privé des tâches personnelles (/api/tasks)
│   │   ├── teams/                  # Équipes, appartenances et rôles (/api/teams)
│   │   ├── tickets/                # Tickets collaboratifs, Kanban et audit (/api/tickets)
│   │   └── users/                  # Profil personnel, mot de passe et annuaire (/api/users)
│   ├── types/                      # Types génériques API et augmentation Express.Request
│   ├── utils/                      # AppError, constantes/messages, dates, regex, bcrypt, JWT
│   ├── routes.ts                   # Routeur racine monté sur /api
│   ├── app.ts                      # Application Express pure (testable sans port ouvert)
│   └── server.ts                   # Bootstrap MongoDB + serveur HTTP + arrêt gracieux
└── tests/                          # Suites d'intégration Jest + Supertest isolées sur taskflow_test
```

### Cycle de vie d'une requête HTTP

1. **Sécurité amont (`app.ts`)** : `helmet()`, filtrage `cors()`, limitation de taille JSON (`250kb`).
2. **Authentification (`requireAuth`)** : Extraction et vérification cryptographique du header `Authorization: Bearer <token>`, contrôle d'existence du compte en base et attachement de `req.user = { id, email }`.
3. **Validation (`validate`)** : Filtrage strict des entrées (`z.strictObject`) sur `req.params`, `req.query` et `req.body` avant toute exécution métier.
4. **Contrôleur (`*.controller.ts`)** : Adaptation HTTP (lecture de `req`, appel du service, choix du code HTTP `200` / `201` / `204`).
5. **Service métier (`*.service.ts`)** : Application des règles RBAC, transitions d'état, numérotation atomique, calcul de progression et journalisation d'audit.
6. **Modèle Mongoose (`*.model.ts`)** : Persistance MongoDB et transformation JSON propre (`_id` converti en `id`, suppression de `__v` et `passwordHash`).
7. **Gestion centralisée des erreurs (`errorMiddleware`)** : Toute erreur métier (`AppError`), erreur Zod, JSON malformé ou exception imprévue est convertie au format unique :
   ```json
   {
     "error": {
       "code": "INVALID_INPUT",
       "message": "Description lisible en français"
     }
   }
   ```

---

## 7. Rôles collaboratifs et workflow Kanban

Un utilisateur peut appartenir à plusieurs équipes avec un rôle spécifique par équipe (`TeamMembership`) :

| Rôle | Permissions principales dans l'équipe |
|---|---|
| `admin` | Gouvernance complète de l'équipe (modifier/supprimer l'équipe, inviter/retirer des membres, modifier les rôles avec protection du dernier admin) + tous les droits `project_manager`. |
| `project_manager` | Créer/modifier/archiver/supprimer les projets et les features, assigner librement tout ticket à un membre de l'équipe, supprimer des tickets, modérer les commentaires et piloter toutes les colonnes Kanban. |
| `developer` | Créer des tickets, s'auto-assigner un ticket libre, mettre à jour ses tickets/ceux qu'il a créés, faire progresser les tickets entre `todo`, `doing` et `testing`, commenter. **Ne peut pas valider directement un ticket en `done`.** |
| `tester` | Créer des tickets (ex. anomalies `bug`), s'auto-assigner un ticket libre, commenter, valider la recette (`testing` → `done`) ou rouvrir un ticket en anomalie (`testing`/`done` → `todo` ou `doing`). |

### Machine à états du tableau Kanban (4 colonnes)

```text
[ todo ] <---> [ doing ] ---> [ testing ] ---> [ done ]
   ^               ^               |              |
   +---------------+---------------+--------------+ (retour QA / réouverture)
```

---

## 8. Catalogue des endpoints REST

L'intégralité des schémas de requêtes/réponses est testable interactivement sur **`GET /api/docs`**.

### Santé, Authentification et Tâches personnelles

| Méthode | Route | Accès | Statuts principaux |
|---|---|---|---|
| `GET` | `/api/health` | Public | `200` (`{"status":"ok"}`) |
| `POST` | `/api/auth/register` | Public | `201`, `400 INVALID_INPUT`, `409 EMAIL_ALREADY_USED` |
| `POST` | `/api/auth/login` | Public | `200`, `400`, `401 UNAUTHORIZED`, `429 TOO_MANY_REQUESTS` |
| `GET` | `/api/tasks` | Bearer JWT | `200` (`{"items":[...]}`), `400`, `401` |
| `POST` | `/api/tasks` | Bearer JWT | `201`, `400`, `401` |
| `GET` | `/api/tasks/:id` | Bearer JWT | `200`, `400`, `401`, `404 NOT_FOUND` (isolation stricte) |
| `PATCH` | `/api/tasks/:id` | Bearer JWT | `200`, `400`, `401`, `404 NOT_FOUND` |
| `DELETE` | `/api/tasks/:id` | Bearer JWT | `204` (corps vide), `400`, `401`, `404 NOT_FOUND` |

### Extensions collaboratives Jira-like

| Domaine | Endpoints principaux |
|---|---|
| **Profil & Annuaire** | `GET /api/users/me`, `PATCH /api/users/me`, `PATCH /api/users/me/password`, `GET /api/users?search=` |
| **Équipes & Rôles** | `GET/POST /api/teams`, `GET/PATCH/DELETE /api/teams/:id`, `GET/POST /api/teams/:id/members`, `PATCH/DELETE /api/teams/:id/members/:userId`, `GET /api/teams/:id/activity` |
| **Projets** | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`, `GET /api/projects/:id/features`, `GET /api/projects/:id/tickets`, `GET /api/projects/:id/kanban` |
| **Features** | `GET/POST /api/features`, `GET/PATCH/DELETE /api/features/:id` |
| **Tickets & Kanban** | `GET/POST /api/tickets`, `GET /api/tickets/assigned/me`, `GET/PATCH/DELETE /api/tickets/:id`, `PATCH /api/tickets/:id/status`, `PATCH /api/tickets/:id/assign`, `GET /api/tickets/:id/history` |
| **Commentaires** | `GET/POST /api/tickets/:id/comments`, `PATCH /api/comments/:id`, `DELETE /api/comments/:id` |
| **Tableau de bord** | `GET /api/dashboard` (filtres optionnels `?teamId=` et `?projectId=`) |

---

## 9. Guide d'intégration Frontend React

Cette section résume les conventions exactes garanties pour l'application React :

1. **URL de base et CORS** :
   - Définir `VITE_API_URL=http://localhost:<PORT>/api` côté Frontend.
   - Vérifier que l'origine Vite (`http://localhost:5173`) figure dans `CORS_ORIGIN` côté `backend/.env`.
2. **Authentification Bearer JWT** :
   - `POST /api/auth/login` et `POST /api/auth/register` retournent `{ user, token }`.
   - Transmettre sur chaque appel privé l'en-tête :
     ```http
     Authorization: Bearer <token>
     Content-Type: application/json
     ```
   - Si l'API répond `401` (`error.code === "UNAUTHORIZED"`), purger le jeton local et rediriger vers `/login`.
3. **Gestion des suppressions (`204 No Content`)** :
   - Les routes `DELETE` renvoient un statut `204` **sans corps JSON**. Avec `fetch`, vérifier `if (res.status === 204) return null;` avant d'appeler `await res.json()`.
4. **Gestion uniforme des erreurs** :
   - Toutes les erreurs (`4xx` / `5xx`) respectent la forme `{ error: { code, message } }`.
   - Utiliser `error.code` (`EMAIL_ALREADY_USED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `CONFLICT`, `TOO_MANY_REQUESTS`) pour les branchements logiques, et `error.message` directement pour les notifications toast en français.
5. **Identifiants et dates** :
   - Tous les objets exposent `id` (chaîne de caractères) et jamais `_id`.
   - Les échéances métier (`dueDate`) utilisent le format calendaire `YYYY-MM-DD`, et les horodatages (`createdAt`, `updatedAt`) le format ISO 8601 UTC.
6. **Tableau Kanban prêt à afficher** :
   - `GET /api/projects/:id/kanban` retourne directement les 4 colonnes ordonnées (`columns: [{ status, label, count, items }]`) ainsi que les compteurs globaux (`counts`), évitant tout regroupement complexe côté client.

---

## 10. Outils de build (Vite, Babel, Webpack) et pipeline CI/CD

### 10.1 Rôle de Vite, Babel et Webpack

- **Babel** est un **transpileur syntaxique** : il transforme du code JavaScript moderne (`ESNext`), du **JSX** (React) ou du TypeScript vers une syntaxe JavaScript compatible avec des navigateurs ou environnements plus anciens, sans regrouper les modules à lui seul.
- **Webpack** est un **bundler historique** : au démarrage comme au build, il parcourt tout le graphe de dépendances de l'application, applique des *loaders* (dont souvent Babel et CSS) et assemble l'ensemble en un ou plusieurs *bundles* avant de servir l'application. Sur de gros projets, ce pré-bundling complet ralentit le démarrage à froid en développement.
- **Vite** est un **outil de build frontend de nouvelle génération** :
  - **En développement**, il s'appuie directement sur les **ES Modules natifs du navigateur** et pré-compile les dépendances avec `esbuild` (écrit en Go), offrant un démarrage quasi instantané et un *Hot Module Replacement (HMR)* ultra-rapide.
  - **En production** (`vite build`), il génère un bundle optimisé, minifié et découpé (*code-splitting*) prêt à être servi statiquement.

### 10.2 Où placer les tests automatisés dans une chaîne CI/CD ?

Dans un pipeline **CI/CD** (GitHub Actions, GitLab CI), les vérifications automatisées constituent un **verrou qualité bloquant (*Quality Gate*)** exécuté **à chaque `push` et sur chaque `Pull Request`**, **avant** toute fusion vers `main` et **avant** toute étape de déploiement (`CD`) :

```text
[ git push / Pull Request ]
        │
        ▼
1. Installation propre & reproductible (npm ci)
        │
        ▼
2. Analyse statique rapide : npm run lint  +  npm run typecheck
        │
        ▼
3. Tests d'intégration : npm test (avec conteneur service MongoDB éphémère taskflow_test)
        │
        ▼
4. Compilation de production : npm run build (vérifie la génération de dist/)
        │
        ▼
5. Déploiement continu (CD) uniquement si les étapes 1 à 4 ont réussi (code 0)
```

Ce positionnement garantit qu'aucune régression sur les contrats d'API, sur l'isolation des données utilisateurs ou sur les permissions collaboratives ne peut atteindre l'environnement partagé avec le Frontend ou la production.

---

## 11. Sécurité, limites connues et pistes d'évolution

### Mesures de sécurité actives
- Hachage systématique des mots de passe avec `bcrypt` (`10` tours de salage) et exclusion par défaut (`select: false` + `toJSON`) empêchant toute fuite de hash.
- Signature et vérification explicites des JWT avec algorithme imposé `HS256` (bloque l'attaque `alg: "none"`).
- Validation stricte de toutes les entrées via Zod (`z.strictObject`), échappement systématique des expressions régulières de recherche (anti-ReDoS / injection NoSQL) et filtrage des URI d'avatars (blocage de `javascript:` et `image/svg+xml`).
- Protection HTTP par `helmet`, désactivation de `X-Powered-By`, CORS restreint, limite JSON à `250kb` et limitation anti-force brute (`429` + `Retry-After`) sur `/api/auth/login`.

### Limites connues et évolutions possibles
- **Rate limiting distribué** : le compteur anti-force brute est stocké en mémoire du processus Node.js ; en déploiement multi-instances derrière un répartiteur de charge, un magasin partagé **Redis** permettrait de mutualiser les compteurs.
- **Révocation de session et Refresh Tokens** : l'authentification repose sur un jeton d'accès JWT stateless (`24h`) ; l'ajout d'un couple *Access Token court + Refresh Token révocable en cookie `HttpOnly`* renforcerait la gestion des sessions longues.
- **Temps réel** : l'intégration de **WebSockets (Socket.IO)** permettrait de répercuter instantanément les déplacements de cartes Kanban entre membres connectés sans rafraîchissement.
