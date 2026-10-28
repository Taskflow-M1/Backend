# Documentation du code — Backend TaskFlow

Ce document explique le backend partie par partie. Il complète les commentaires placés dans les fichiers TypeScript et la documentation interactive Swagger disponible sur `/api/docs`.

## 1. Organisation générale

Le projet suit une architecture modulaire en couches :

- **Route** : déclare l’URL, la méthode HTTP et les middlewares.
- **Validation** : vérifie et normalise les données reçues avec Zod.
- **Contrôleur** : lit la requête, appelle le service et choisit le statut HTTP.
- **Service** : contient les règles métier et les contrôles d’autorisation.
- **Modèle** : décrit les documents MongoDB avec Mongoose.

Une requête suit généralement ce parcours :

```text
Client → Route → Authentification → Validation → Contrôleur → Service → Modèle MongoDB
                                                                    ↓
Client ← Gestion des erreurs ← Réponse JSON ←───────────────────────┘
```

Cette séparation évite de mélanger la logique HTTP, les règles métier et l’accès aux données.

## 2. Démarrage de l’application

### `src/server.ts`

Point d’entrée du processus Node.js. Il ouvre la connexion MongoDB, démarre le serveur HTTP et intercepte les signaux d’arrêt pour fermer proprement le serveur et la base de données.

### `src/app.ts`

Construit l’application Express sans ouvrir de port. Cette séparation permet aux tests d’utiliser directement l’application avec Supertest. Le fichier active Helmet, CORS, la lecture du JSON, les routes et le middleware global d’erreur.

### `src/routes.ts`

Regroupe tous les routeurs fonctionnels sous `/api`. Chaque domaine conserve ensuite ses propres routes dans son dossier.

## 3. Configuration

### `src/config/env.ts`

Charge le fichier `.env`, applique les valeurs par défaut et refuse les configurations dangereuses. Il centralise notamment MongoDB, JWT, CORS, Resend et la durée de vie du code e-mail.

### `src/config/database.ts`

Ouvre et ferme la connexion Mongoose. Les informations sensibles d’une URI MongoDB sont masquées avant toute écriture dans les journaux.

### `src/config/swagger.ts`

Décrit le contrat OpenAPI de l’API : routes, paramètres, corps des requêtes, réponses, erreurs et authentification Bearer. Cette spécification alimente `/api/docs` et `/api/docs.json`.

## 4. Middlewares communs

### `auth.middleware.ts`

Lit le header `Authorization: Bearer <token>`, vérifie le JWT, confirme que le compte existe encore puis ajoute `{ id, email }` dans `req.user`.

### `validate.middleware.ts`

Valide `body`, `params` et `query` avec les schémas Zod du module concerné. Les données nettoyées et normalisées remplacent les valeurs brutes avant l’appel du contrôleur.

### `rate-limit.middleware.ts`

Compte temporairement les requêtes par client afin de limiter les tentatives répétées sur la connexion, l’envoi du code et le changement de mot de passe.

### `error.middleware.ts`

Convertit les erreurs métier, Zod, Mongoose et JSON en une structure stable :

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Message compréhensible pour l’utilisateur"
  }
}
```

Les erreurs internes restent génériques en production afin de ne pas exposer de détails techniques.

## 5. Authentification et vérification e-mail

Le dossier `src/modules/auth` contient le parcours complet :

- `auth.routes.ts` déclare l’inscription, la vérification, le renvoi du code et la connexion.
- `auth.validation.ts` contrôle les e-mails, mots de passe, noms et codes à quatre chiffres.
- `auth.controller.ts` traduit les appels HTTP vers le service.
- `auth.service.ts` vérifie les doublons, hache les mots de passe, crée les comptes et signe les JWT.
- `email-verification.store.ts` garde uniquement l’empreinte du code en mémoire, avec expiration, délai de renvoi et limite d’essais.
- `verification-email.template.ts` génère le mail HTML et sa version texte selon la charte TaskFlow.
- `verification-email.service.ts` envoie le message avec Resend et joint le logo intégré.

### Parcours d’inscription

1. `POST /api/auth/register` valide le formulaire et envoie le code.
2. Aucun compte et aucun token ne sont créés à cette étape.
3. `POST /api/auth/send-verification-code` permet de renvoyer un nouveau code après le délai de sécurité.
4. `POST /api/auth/verify-email-code` consomme le code, crée le compte et retourne `{ user, token }`.
5. Un code correct ne peut être utilisé qu’une fois.

Le mot de passe du formulaire initial n’est pas conservé dans le stockage temporaire. Le client le renvoie avec le code, puis le service le hache avec bcrypt juste avant la création du compte.

## 6. Utilisateurs

Le module `src/modules/users` gère le profil personnel, l’annuaire et le changement de mot de passe.

- `user.model.ts` définit le compte MongoDB et les formes publiques sans `passwordHash`.
- `user.validation.ts` contrôle le profil, les avatars et les mots de passe.
- `user.service.ts` applique les recherches autorisées et vérifie l’ancien mot de passe avant son remplacement.
- `user.controller.ts` et `user.routes.ts` exposent ces opérations en HTTP.

La recherche d’utilisateurs est limitée au besoin d’administration des équipes. Les saisies utilisées dans une expression régulière sont échappées pour éviter une interprétation indésirable.

## 7. Tâches personnelles

Le module `src/modules/tasks` fournit un CRUD simple pour les tâches privées.

- `task.model.ts` définit le titre, la description, le statut, l’échéance et le propriétaire.
- `task.validation.ts` vérifie les champs et refuse les dates calendaires impossibles.
- `task.service.ts` ajoute systématiquement `ownerId` aux recherches, modifications et suppressions.
- `task.controller.ts` et `task.routes.ts` exposent le CRUD authentifié.

Le filtrage par propriétaire garantit qu’un utilisateur ne peut pas lire ou modifier la tâche d’un autre utilisateur, même s’il connaît son identifiant MongoDB.

## 8. Équipes et rôles

Le module `src/modules/teams` gère les espaces collaboratifs.

- `team.model.ts` décrit une équipe.
- `team-membership.model.ts` relie un utilisateur à une équipe avec un rôle.
- `team.validation.ts` contrôle les équipes, invitations et changements de rôle.
- `team.service.ts` centralise les autorisations, l’ajout et le retrait des membres.
- `team.controller.ts` et `team.routes.ts` exposent les endpoints.

Les rôles disponibles sont `admin`, `project_manager`, `developer` et `tester`. Le service empêche la suppression ou la rétrogradation du dernier administrateur d’une équipe.

## 9. Projets

Le module `src/modules/projects` organise le travail d’une équipe.

- `project.model.ts` stocke le nom, la clé courte, l’équipe et le compteur de tickets.
- `project.validation.ts` contrôle les clés de projet et la pagination.
- `project.service.ts` vérifie l’appartenance à l’équipe et réserve les écritures sensibles aux responsables.
- `project.controller.ts` et `project.routes.ts` exposent le CRUD ainsi que les vues tickets, fonctionnalités et Kanban.

Lorsqu’un projet est supprimé, ses fonctionnalités, tickets, commentaires et historiques dépendants sont également nettoyés.

## 10. Fonctionnalités

Le module `src/modules/features` regroupe les tickets par fonctionnalité métier.

- `feature.model.ts` rattache une fonctionnalité à un projet.
- `feature.validation.ts` valide ses champs et ses filtres.
- `feature.service.ts` réutilise les contrôles d’accès du projet.
- `feature.controller.ts` et `feature.routes.ts` exposent le CRUD.

Une fonctionnalité ne peut être consultée ou modifiée que dans un projet accessible à l’utilisateur.

## 11. Tickets et Kanban

Le module `src/modules/tickets` porte le cœur Jira-like de l’application.

- `ticket.model.ts` définit le type, la priorité, le statut, l’assignation et la clé lisible du ticket.
- `ticket.validation.ts` contrôle les champs, filtres, assignations et changements de statut.
- `ticket.service.ts` applique les droits, les transitions Kanban, la pagination et l’enrichissement des réponses.
- `ticket.controller.ts` et `ticket.routes.ts` exposent les opérations HTTP.
- `ticket-history.model.ts` conserve les événements d’audit.
- `ticket-history.service.ts` écrit et formate cet historique.

La clé d’un ticket combine la clé du projet et un compteur atomique, par exemple `TFW-42`. Le tableau Kanban utilise quatre états : `todo`, `doing`, `testing` et `done`. Les transitions autorisées dépendent du rôle de l’utilisateur et de l’état actuel.

## 12. Commentaires

Le module `src/modules/comments` gère les discussions associées aux tickets.

- `comment.model.ts` enregistre le ticket, l’auteur et le contenu.
- `comment.validation.ts` contrôle le texte envoyé.
- `comment.service.ts` vérifie l’accès au projet et les droits de modification.
- `comment.controller.ts` et `comment.routes.ts` exposent les opérations HTTP.

Un auteur peut gérer son propre commentaire. Les rôles de pilotage peuvent également intervenir dans le cadre de leurs permissions.

## 13. Tableau de bord

Le module `src/modules/dashboard` agrège les données accessibles à l’utilisateur.

- `dashboard.validation.ts` contrôle les filtres par équipe et projet.
- `dashboard.service.ts` calcule les indicateurs, répartitions, échéances et activités récentes.
- `dashboard.controller.ts` et `dashboard.routes.ts` servent les résultats au frontend.

Les agrégations partent toujours des appartenances de l’utilisateur afin de ne jamais inclure les données d’une équipe extérieure.

## 14. Santé et documentation HTTP

- `src/modules/health` fournit `GET /api/health` pour confirmer que le processus répond.
- `src/modules/docs/docs.routes.ts` expose Swagger UI sur `/api/docs` et le JSON OpenAPI sur `/api/docs.json`.

## 15. Types et utilitaires

- `types/api.types.ts` contient les réponses d’erreur, listes et paginations communes.
- `types/auth.types.ts` étend `Express.Request` avec l’utilisateur authentifié.
- `utils/app-error.ts` représente une erreur métier contrôlée.
- `utils/constants.ts` centralise les codes et messages publics.
- `utils/date.ts` valide les dates calendaires et produit la date du jour.
- `utils/jwt.ts` signe et vérifie les jetons.
- `utils/password.ts` hache et compare les mots de passe avec bcrypt.
- `utils/regex.ts` neutralise les caractères spéciaux avant une recherche MongoDB par expression régulière.

## 16. Tests

Les tests d’intégration se trouvent dans `tests` et utilisent Jest, Supertest et une base MongoDB dédiée se terminant par `_test`.

- `auth-and-personal-tasks.test.ts` couvre la santé, la connexion et l’isolation des tâches.
- `email-verification.test.ts` couvre le mail graphique, les codes, l’expiration, les essais et le renvoi.
- `users-teams-projects.test.ts` couvre les profils, équipes, rôles et projets.
- `tickets-kanban-audit-dashboard.test.ts` couvre le workflow collaboratif principal.
- `security.test.ts` couvre plusieurs cas d’entrées et de jetons invalides.
- `docs.test.ts` vérifie la présence de la documentation OpenAPI.
- `helpers/test-db.ts` protège la base réelle et fournit les comptes nécessaires aux scénarios.

Les commandes de contrôle sont :

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
