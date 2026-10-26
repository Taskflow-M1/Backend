export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Centralized user-facing messages for easy customization
export const MESSAGES = {
  COMMON: {
    ROUTE_NOT_FOUND:
      "Oups, cette route n'existe pas dans notre univers rose ✨ Vérifie l'URL demandée.",
    RESOURCE_NOT_FOUND:
      "Impossible de mettre la main sur cet élément 🎀 Il n'existe pas ou n'est plus disponible.",
    INVALID_JSON:
      'Petit faux pas dans le JSON envoyé 💅 Le format de la requête est invalide.',
    PAYLOAD_TOO_LARGE:
      'Oulà, ce contenu est un peu trop volumineux pour notre sac rose 👜 Réduis la taille des données.',
    UNAUTHORIZED:
      "Halte là beauté 💖 Connecte-toi d'abord pour accéder à cet espace.",
    FORBIDDEN:
      "Désolée, tu n'as pas les paillettes d'autorisation nécessaires pour cette action ✨",
    INTERNAL_ERROR:
      'Oups, petit coup de chaud côté serveur 🌸 Réessaie dans un instant.',
  },
  VALIDATION: {
    INVALID_INPUT:
      'Petit souci de look dans les données envoyées 💅 Vérifie les champs fournis.',
    UNRECOGNIZED_KEYS:
      'Certains champs envoyés ne font pas partie de la tenue attendue 🎀 Retire les propriétés inconnues',
    EMPTY_UPDATE_BODY:
      'Tu nous as envoyé une enveloppe toute vide 💌 Indique au moins un champ à modifier.',
    INVALID_OBJECT_ID:
      "Cet identifiant n'a pas le bon format 💅 Vérifie l'id fourni dans l'URL.",
  },
} as const;

