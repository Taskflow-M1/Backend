export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
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
  AUTH: {
    EMAIL_INVALID:
      "Cette adresse e-mail n'a pas un look valide 💌 Vérifie son format (ex. alice@example.com).",
    EMAIL_ALREADY_USED:
      'Cette adresse e-mail fait déjà partie du club rose 💖 Essaie de te connecter à la place.',
    PASSWORD_TOO_SHORT:
      'Ton mot de passe est un peu trop court 💅 Il doit contenir au moins 8 caractères.',
    PASSWORD_TOO_LONG:
      'Ton mot de passe dépasse la limite autorisée 🎀 Maximum 128 caractères.',
    PASSWORD_REQUIRED:
      "N'oublie pas ton mot de passe secret 🔑 Ce champ est obligatoire.",
    FIRST_NAME_INVALID:
      'Le prénom doit contenir entre 1 et 60 caractères ✨',
    LAST_NAME_INVALID:
      'Le nom doit contenir entre 1 et 60 caractères ✨',
    INVALID_CREDENTIALS:
      'Combinaison e-mail ou mot de passe incorrecte 💔 Vérifie tes identifiants.',
    TOKEN_MISSING:
      "Halte là beauté 💖 Un jeton Bearer d'authentification est requis pour continuer.",
    TOKEN_INVALID:
      'Ton pass VIP (jeton JWT) est invalide ou a expiré ✨ Reconnecte-toi.',
    TOO_MANY_LOGIN_ATTEMPTS:
      'Doucement sur les essais de connexion 🌸 Patiente quelques minutes avant de réessayer.',
    VERIFICATION_CODE_INVALID:
      'Ce code est incorrect ou a expiré 💌 Demande un nouveau code pour continuer.',
    VERIFICATION_CODE_TOO_MANY_ATTEMPTS:
      "Ce code a fait l'objet de trop d'essais 🌸 Demande un nouveau code pour continuer.",
    VERIFICATION_CODE_COOLDOWN:
      'Ton papillon est déjà en route 💌 Patiente une minute avant de demander un nouveau code.',
    VERIFICATION_CODE_SENT:
      'Ton code de vérification vient de prendre son envol 💌 Consulte ta boîte e-mail.',
    VERIFICATION_EMAIL_FAILED:
      "Le papillon n'a pas réussi à livrer ton e-mail 🌸 Réessaie dans un instant.",
    TOO_MANY_VERIFICATION_REQUESTS:
      "Trop de demandes d'un seul coup 🌸 Patiente une minute avant de réessayer.",
  },
  TASKS: {
    NOT_FOUND:
      "Cette tâche est introuvable dans ton carnet rose 🎀 Vérifie l'identifiant demandé.",
    TITLE_REQUIRED:
      "Ta tâche a besoin d'un petit titre ✨ Entre 1 et 120 caractères après nettoyage.",
    TITLE_TOO_LONG:
      'Ce titre déborde du carnet 💅 Maximum 120 caractères autorisés.',
    STATUS_INVALID:
      'Statut non reconnu 🌸 Choisis uniquement parmi : todo, doing ou done.',
    DESCRIPTION_TOO_LONG:
      'La description est un peu trop bavarde 💌 Maximum 1000 caractères.',
    DUE_DATE_INVALID:
      'Cette date limite est impossible 📅 Utilise une vraie date au format YYYY-MM-DD (ou null).',
  },
  USERS: {
    NOT_FOUND:
      'Profil introuvable dans notre dressing rose 🎀 Ce compte ne semble plus exister.',
    FIRST_NAME_TOO_LONG:
      'Le prénom est un peu trop long 💅 Maximum 60 caractères.',
    LAST_NAME_TOO_LONG:
      'Le nom est un peu trop long 💅 Maximum 60 caractères.',
    AVATAR_INVALID:
      'Photo de profil invalide 📸 Utilise une URL http(s) ou une image PNG, JPEG, WEBP ou GIF.',
    AVATAR_TOO_LARGE:
      'Ta photo de profil est un peu trop lourde 📸 Choisis une image plus légère (max ~100 Ko).',
    CURRENT_PASSWORD_INCORRECT:
      'Ton mot de passe actuel ne correspond pas 💔 Vérifie ta saisie.',
    PASSWORD_SAME_AS_OLD:
      "Ce nouveau mot de passe est identique à l'ancien 🌸 Choisis-en un différent.",
    PASSWORD_CONFIRM_MISMATCH:
      'La confirmation du nouveau mot de passe ne correspond pas 💌 Vérifie les deux champs.',
    PASSWORD_UPDATED:
      'Mot de passe mis à jour avec succès 💖 Ton compte brille de sécurité !',
    SEARCH_ADMIN_ONLY:
      "Seul un administrateur d'équipe peut rechercher dans l'annuaire des membres 👑",
  },
  TEAMS: {
    NOT_FOUND:
      "Cette équipe est introuvable dans notre royaume rose 🎀 Vérifie l'identifiant demandé.",
    ACCESS_DENIED:
      'Accès réservé aux membres de cette équipe 💖 Tu ne fais pas partie de ce groupe.',
    ADMIN_REQUIRED:
      "Seul un administrateur de l'équipe peut effectuer cette action 👑",
    NAME_REQUIRED:
      'Donne un joli nom à ton équipe ✨ Entre 1 et 100 caractères.',
    NAME_TOO_LONG:
      "Ce nom d'équipe est un peu trop long 💅 Maximum 100 caractères.",
    DESCRIPTION_TOO_LONG:
      'La description de cette équipe dépasse la limite 💌 Maximum 500 caractères.',
    ROLE_INVALID:
      'Rôle inconnu 🌸 Choisis parmi : admin, project_manager, developer ou tester.',
    MEMBER_IDENTIFIER_REQUIRED:
      'Indique soit userId soit email (un seul des deux) pour ajouter un membre 💌',
    MEMBER_ALREADY_EXISTS:
      'Cette personne fait déjà partie de cette équipe 💖',
    MEMBER_NOT_FOUND:
      "Cette personne n'est pas membre de cette équipe 🎀",
    LAST_ADMIN_REQUIRED:
      "Impossible ! L'équipe doit conserver au moins un administrateur à sa tête 👑",
  },
  PROJECTS: {
    NOT_FOUND:
      "Ce projet est introuvable dans l'atelier rose 🎀 Vérifie l'identifiant demandé.",
    MANAGE_FORBIDDEN:
      "Seul un administrateur ou un chef de projet de l'équipe peut gérer les projets 👑",
    NAME_REQUIRED:
      'Ton projet mérite un nom ✨ Entre 1 et 100 caractères.',
    NAME_TOO_LONG:
      'Le nom du projet est un peu trop long 💅 Maximum 100 caractères.',
    KEY_INVALID:
      'Clé de projet invalide 🏷️ Utilise 2 à 10 caractères alphanumériques commençant par une lettre (ex. TF, BACK1).',
    KEY_ALREADY_USED:
      'Cette clé de projet brille déjà sur un autre projet de cette équipe 💖 Choisis-en une autre.',
    DESCRIPTION_TOO_LONG:
      'La description du projet est un peu trop longue 💌 Maximum 1000 caractères.',
  },
  FEATURES: {
    NOT_FOUND:
      "Cette feature est introuvable dans le projet 🎀 Vérifie l'identifiant demandé.",
    MANAGE_FORBIDDEN:
      "Seul un administrateur ou un chef de projet de l'équipe peut gérer les features 👑",
    TITLE_REQUIRED:
      'Donne un titre clair à cette feature ✨ Entre 1 et 120 caractères.',
    TITLE_TOO_LONG:
      'Le titre de la feature est un peu trop long 💅 Maximum 120 caractères.',
    DESCRIPTION_TOO_LONG:
      'La description de la feature dépasse la limite 💌 Maximum 1000 caractères.',
  },
  TICKETS: {
    NOT_FOUND:
      "Ce ticket est introuvable sur le tableau rose 🎀 Vérifie l'identifiant demandé.",
    DELETE_FORBIDDEN:
      'Seul un administrateur ou un chef de projet peut supprimer un ticket 👑',
    EDIT_FORBIDDEN:
      'Désolée beauté, tu ne peux modifier les détails complets que des tickets dont tu es créatrice ou responsable (sauf admin / chef de projet) ✨',
    ASSIGN_FORBIDDEN:
      "Seul un administrateur ou un chef de projet peut réassigner ce ticket (tu peux seulement t'attribuer un ticket libre) 💖",
    ASSIGNEE_NOT_IN_TEAM:
      "Impossible d'attribuer ce ticket 🎀 La personne choisie ne fait pas partie de l'équipe du projet.",
    FEATURE_PROJECT_MISMATCH:
      "Cette feature n'appartient pas au même projet que le ticket 🌸 Vérifie le rattachement.",
    TITLE_REQUIRED:
      'Ton ticket a besoin d’un joli titre ✨ Entre 1 et 120 caractères.',
    TITLE_TOO_LONG:
      'Le titre du ticket est un peu trop long 💅 Maximum 120 caractères.',
    DESCRIPTION_TOO_LONG:
      'La description du ticket dépasse la limite 💌 Maximum 2000 caractères.',
    STATUS_INVALID:
      'Statut de ticket inconnu 🌸 Choisis parmi : todo, doing, testing ou done.',
    PRIORITY_INVALID:
      'Priorité non reconnue 💅 Choisis parmi : low, medium, high ou critical.',
    TYPE_INVALID:
      'Type de ticket inconnu 🎀 Choisis parmi : task, bug, story ou improvement.',
    DUE_DATE_INVALID:
      'Cette date limite est impossible 📅 Utilise une vraie date au format YYYY-MM-DD (ou null).',
    STATUS_TRANSITION_INVALID:
      "Ce saut de colonne n'est pas autorisé dans le flux Kanban 🌸 Respecte les étapes du tableau.",
    STATUS_DONE_FORBIDDEN:
      'Seul un testeur, un chef de projet ou un administrateur peut valider un ticket en « Terminé » (passe-le d’abord en « testing ») ✨',
    STATUS_REOPEN_FORBIDDEN:
      'Seul un testeur, un chef de projet ou un administrateur peut rouvrir un ticket terminé 💖',
    STATUS_TESTER_TRANSITION_FORBIDDEN:
      "En tant que testeur, tu interviens sur la colonne « testing » (validation ou retour en « doing »), sauf sur tes propres tickets 🎀",
    SEARCH_TOO_LONG:
      'Ta recherche est un peu trop longue 🔍 Maximum 100 caractères.',
    PAGINATION_INVALID:
      'Paramètres de pagination invalides 📄 Utilise page >= 1 et limit entre 1 et 100.',
  },
  COMMENTS: {
    NOT_FOUND:
      "Ce commentaire est introuvable dans la discussion rose 🎀 Vérifie l'identifiant demandé.",
    CONTENT_REQUIRED:
      'Écris un petit mot avant d’envoyer ton commentaire 💌 Entre 1 et 2000 caractères.',
    CONTENT_TOO_LONG:
      'Ton commentaire est un peu trop bavard 💅 Maximum 2000 caractères.',
    EDIT_AUTHOR_ONLY:
      "Chacune ses mots 💖 Seul l'auteur d'un commentaire peut en modifier le contenu.",
    DELETE_FORBIDDEN:
      "Seul l'auteur du commentaire, un chef de projet ou un administrateur peut le supprimer 👑",
  },
  DASHBOARD: {
    SCOPE_MISMATCH:
      "Ce projet n'appartient pas à l'équipe sélectionnée pour le tableau de bord 🌸",
    LIMIT_INVALID:
      "Limite d'activité invalide 📊 Utilise un nombre entier entre 1 et 50.",
  },
} as const;
