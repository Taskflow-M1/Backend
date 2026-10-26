# TaskFlow — Backend

API REST du projet **TaskFlow** (Node.js, Express, TypeScript).

## Prérequis

- Node.js `>= 20` (vérifié avec Node.js `v24.11.0`)
- npm

## Installation

Depuis la racine du dépôt, se placer dans le dossier `backend` puis installer les dépendances :

```bash
cd backend
npm install
```

## Configuration

Copier le fichier d'exemple pour créer la configuration locale :

```bash
cp .env.example .env
```

Variables disponibles :

| Variable | Description | Valeur par défaut |
|---|---|---|
| `NODE_ENV` | Environnement d'exécution (`development`, `test`, `production`) | `development` |
| `PORT` | Port d'écoute HTTP du serveur | `3000` |
| `CORS_ORIGIN` | Origine(s) Frontend autorisée(s), séparées par des virgules | `http://localhost:5173` |

## Commandes disponibles

Toutes les commandes s'exécutent depuis le dossier `backend/` :

- `npm run dev` : démarre le serveur en mode développement avec rechargement automatique (`tsx watch`).
- `npm run typecheck` : vérifie le typage TypeScript sans générer de fichiers.
- `npm run build` : compile le code TypeScript vers le dossier `dist/`.
- `npm start` : lance la version compilée (`dist/server.js`).

## Endpoints disponibles

| Méthode | Route | Accès | Réponse |
|---|---|---|---|
| `GET` | `/api/health` | Public | `200 OK` — `{"status":"ok"}` |

