import { env } from './env';

const idPathParam = (name = 'id', description = 'Identifiant MongoDB (24 caractères hexadécimaux)') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
});

const standardErrorResponses = {
  BadRequest400: {
    description: 'Requête ou données invalides (`INVALID_INPUT`)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'INVALID_INPUT',
            message: 'Oups ✨ Certaines informations ne sont pas valides.',
          },
        },
      },
    },
  },
  Unauthorized401: {
    description: 'Authentification manquante, invalide ou expirée (`UNAUTHORIZED`)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Accès refusé 🎀 Connecte-toi avec un jeton valide.',
          },
        },
      },
    },
  },
  Forbidden403: {
    description: 'Rôle insuffisant pour effectuer cette action (`FORBIDDEN`)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'Désolée 💅 Ton rôle ne permet pas cette action.',
          },
        },
      },
    },
  },
  NotFound404: {
    description: 'Ressource introuvable ou non accessible (`NOT_FOUND`)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'Ressource introuvable 🌸',
          },
        },
      },
    },
  },
  Conflict409: {
    description: 'Conflit métier ou doublon (`CONFLICT` / `EMAIL_ALREADY_USED`)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'EMAIL_ALREADY_USED',
            message: 'Cet e-mail brille déjà chez nous 💖',
          },
        },
      },
    },
  },
  TooManyRequests429: {
    description: 'Trop de tentatives rapprochées (`TOO_MANY_REQUESTS`)',
    headers: {
      'Retry-After': {
        description: 'Délai en secondes avant une nouvelle tentative',
        schema: { type: 'string', example: '60' },
      },
    },
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Doucement ✨ Trop de tentatives, réessaie dans quelques instants.',
          },
        },
      },
    },
  },
};

export const openApiSpec: Record<string, unknown> = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description: [
      'API REST complète de **TaskFlow** (Node.js, Express, TypeScript, MongoDB/Mongoose, JWT).',
      '',
      'Elle couvre deux espaces complémentaires :',
      '1. **Espace personnel & Authentification** (`/api/health`, `/api/auth/*`, `/api/tasks*`) avec isolation stricte des tâches personnelles par utilisateur.',
      '2. **Plateforme collaborative type Jira** (`/api/users*`, `/api/teams*`, `/api/projects*`, `/api/features*`, `/api/tickets*`, `/api/comments*`, `/api/dashboard`) avec gestion des rôles (`admin`, `project_manager`, `developer`, `tester`), tableau Kanban 4 colonnes, historique d\'audit et statistiques.',
      '',
      '**Authentification** : cliquer sur **Authorize** et coller uniquement le jeton JWT obtenu via `POST /api/auth/login` ou après validation de l’inscription avec `POST /api/auth/verify-email-code`.',
    ].join('\n'),
  },
  servers: [
    {
      url: '/',
      description: 'Origine courante du serveur',
    },
    {
      url: `http://localhost:${env.port}`,
      description: 'Serveur de développement local',
    },
  ],
  tags: [
    { name: 'Health', description: 'État de santé du service' },
    { name: 'Auth', description: 'Inscription et connexion par JWT' },
    { name: 'Tasks', description: 'CRUD privé des tâches personnelles' },
    { name: 'Users', description: 'Profil personnel, mot de passe et annuaire pour admins' },
    { name: 'Teams', description: 'Équipes collaboratives, membres, rôles et activité' },
    { name: 'Projects', description: 'Projets d\'équipe, clés Jira et vues associées' },
    { name: 'Features', description: 'Fonctionnalités produit rattachées aux projets' },
    { name: 'Tickets', description: 'Tickets collaboratifs, workflow Kanban, assignation et audit' },
    { name: 'Comments', description: 'Édition et modération des commentaires de tickets' },
    { name: 'Dashboard', description: 'Tableau de bord consolidé et statistiques par rôle' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Jeton JWT signé (`HS256`) retourné par `/api/auth/verify-email-code` ou `/api/auth/login`.',
      },
    },
    responses: standardErrorResponses,
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'INVALID_INPUT',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'EMAIL_ALREADY_USED',
                  'CONFLICT',
                  'TOO_MANY_REQUESTS',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string' },
            },
          },
        },
      },
      PublicUser: {
        type: 'object',
        required: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          email: { type: 'string', format: 'email', example: 'sarah@taskflow.local' },
          firstName: { type: 'string', example: 'Sarah' },
          lastName: { type: 'string', example: 'Martin' },
          avatarUrl: { type: 'string', nullable: true, example: 'https://example.com/avatar.png' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['user', 'token'],
        properties: {
          user: { $ref: '#/components/schemas/PublicUser' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      PersonalTask: {
        type: 'object',
        required: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c11' },
          title: { type: 'string', minLength: 1, maxLength: 120, example: 'Préparer la démo React' },
          description: { type: 'string', maxLength: 1000, nullable: true, example: 'Vérifier les appels Axios' },
          status: { type: 'string', enum: ['todo', 'doing', 'done'], example: 'todo' },
          dueDate: { type: 'string', nullable: true, example: '2026-11-15' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TeamRole: {
        type: 'string',
        enum: ['admin', 'project_manager', 'developer', 'tester'],
      },
      Team: {
        type: 'object',
        required: ['id', 'name', 'description', 'createdBy', 'myRole', 'memberCount', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Squad TaskFlow' },
          description: { type: 'string', example: 'Équipe produit Full Stack' },
          createdBy: { type: 'string' },
          myRole: { $ref: '#/components/schemas/TeamRole' },
          memberCount: { type: 'integer', example: 4 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TeamMember: {
        type: 'object',
        required: ['id', 'userId', 'role', 'joinedAt', 'user'],
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          role: { $ref: '#/components/schemas/TeamRole' },
          joinedAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      Project: {
        type: 'object',
        required: ['id', 'teamId', 'name', 'key', 'description', 'status', 'myRole', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          name: { type: 'string', example: 'TaskFlow Web' },
          key: { type: 'string', example: 'TFW' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived'], example: 'active' },
          myRole: { $ref: '#/components/schemas/TeamRole' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Feature: {
        type: 'object',
        required: [
          'id',
          'projectId',
          'title',
          'description',
          'status',
          'priority',
          'ticketCount',
          'doneTicketCount',
          'progressPercent',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string', example: 'Tableau Kanban interactif' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'in_progress', 'done'], example: 'in_progress' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
          dueDate: { type: 'string', nullable: true, example: '2026-12-01' },
          ticketCount: { type: 'integer', example: 5 },
          doneTicketCount: { type: 'integer', example: 2 },
          progressPercent: { type: 'integer', example: 40 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Ticket: {
        type: 'object',
        required: [
          'id',
          'projectId',
          'key',
          'number',
          'title',
          'description',
          'status',
          'priority',
          'type',
          'isOverdue',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          featureId: { type: 'string', nullable: true },
          key: { type: 'string', example: 'TFW-1' },
          number: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Implémenter le drag & drop des colonnes' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'], example: 'doing' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
          type: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'], example: 'story' },
          dueDate: { type: 'string', nullable: true, example: '2026-11-20' },
          isOverdue: { type: 'boolean', example: false },
          assignedTo: { type: 'string', nullable: true },
          assignee: { allOf: [{ $ref: '#/components/schemas/UserSummary' }], nullable: true },
          reporter: { allOf: [{ $ref: '#/components/schemas/UserSummary' }], nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedTickets: {
        type: 'object',
        required: ['items', 'page', 'limit', 'total', 'totalPages'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'ticketId', 'authorId', 'content', 'isEdited', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          ticketId: { type: 'string' },
          authorId: { type: 'string' },
          author: { allOf: [{ $ref: '#/components/schemas/UserSummary' }], nullable: true },
          content: { type: 'string', example: 'Correctif poussé sur la branche feature/kanban ✨' },
          isEdited: { type: 'boolean', example: false },
          editedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TicketHistoryEntry: {
        type: 'object',
        required: ['id', 'ticketId', 'projectId', 'actorId', 'action', 'changes', 'createdAt'],
        properties: {
          id: { type: 'string' },
          ticketId: { type: 'string' },
          projectId: { type: 'string' },
          actorId: { type: 'string' },
          actor: { allOf: [{ $ref: '#/components/schemas/UserSummary' }], nullable: true },
          action: {
            type: 'string',
            enum: [
              'ticket_created',
              'ticket_updated',
              'status_changed',
              'assignee_changed',
              'comment_added',
              'comment_updated',
              'comment_deleted',
            ],
          },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'from', 'to'],
              properties: {
                field: { type: 'string' },
                from: { nullable: true },
                to: { nullable: true },
              },
            },
          },
          metadata: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Vérifier la disponibilité du serveur',
        responses: {
          '200': {
            description: 'Serveur opérationnel',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: "Démarrer l'inscription et envoyer le code de vérification",
        description:
          "Valide les informations d'inscription et envoie un code à 4 chiffres. Aucun compte ni jeton JWT n'est créé avant la validation du code.",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'sarah@taskflow.local' },
                  password: { type: 'string', minLength: 8, maxLength: 72, example: 'MotDePasse123!' },
                  firstName: { type: 'string', maxLength: 60, example: 'Sarah' },
                  lastName: { type: 'string', maxLength: 60, example: 'Martin' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Code de vérification envoyé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message', 'expiresInSeconds', 'cooldownSeconds'],
                  properties: {
                    message: { type: 'string' },
                    expiresInSeconds: { type: 'integer', example: 600 },
                    cooldownSeconds: { type: 'integer', example: 60 },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '409': { $ref: '#/components/responses/Conflict409' },
          '429': { $ref: '#/components/responses/TooManyRequests429' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authentifier un utilisateur et émettre un jeton JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'sarah@taskflow.local' },
                  password: { type: 'string', example: 'MotDePasse123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentification réussie',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '429': { $ref: '#/components/responses/TooManyRequests429' },
        },
      },
    },
    '/api/auth/send-verification-code': {
      post: {
        tags: ['Auth'],
        summary: "Envoyer un code de vérification d'adresse e-mail",
        description:
          "Renvoie un code à 4 chiffres après le délai de sécurité. Le code est conservé uniquement en mémoire sous forme hachée pendant 10 minutes.",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                additionalProperties: false,
                properties: {
                  email: { type: 'string', format: 'email', example: 'sarah@taskflow.local' },
                  firstName: { type: 'string', maxLength: 60, example: 'Sarah' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Code envoyé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message', 'expiresInSeconds', 'cooldownSeconds'],
                  properties: {
                    message: { type: 'string' },
                    expiresInSeconds: { type: 'integer', example: 600 },
                    cooldownSeconds: { type: 'integer', example: 60 },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '409': { $ref: '#/components/responses/Conflict409' },
          '429': { $ref: '#/components/responses/TooManyRequests429' },
        },
      },
    },
    '/api/auth/verify-email-code': {
      post: {
        tags: ['Auth'],
        summary: 'Valider le code e-mail et créer le compte',
        description:
          "Consomme immédiatement le code éphémère, crée l'utilisateur et retourne `{ user, token }`. Les informations d'inscription doivent être renvoyées avec le code.",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code', 'password'],
                additionalProperties: false,
                properties: {
                  email: { type: 'string', format: 'email', example: 'sarah@taskflow.local' },
                  code: { type: 'string', pattern: '^\\d{4}$', example: '0427' },
                  password: { type: 'string', minLength: 8, maxLength: 128, example: 'MotDePasse123!' },
                  firstName: { type: 'string', maxLength: 60, example: 'Sarah' },
                  lastName: { type: 'string', maxLength: 60, example: 'Martin' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Adresse vérifiée et compte créé',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '409': { $ref: '#/components/responses/Conflict409' },
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Lister les tâches personnelles de l\'utilisateur connecté',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'doing', 'done'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
        ],
        responses: {
          '200': {
            description: 'Liste privée des tâches personnelles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/PersonalTask' } },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Créer une tâche personnelle',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 120, example: 'Réviser l\'architecture Express' },
                  description: { type: 'string', maxLength: 1000, nullable: true },
                  status: { type: 'string', enum: ['todo', 'doing', 'done'], default: 'todo' },
                  dueDate: { type: 'string', nullable: true, example: '2026-11-15' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tâche créée',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonalTask' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
    },
    '/api/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Consulter une tâche personnelle par identifiant',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Détail de la tâche',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonalTask' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Modifier partiellement une tâche personnelle',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 120 },
                  description: { type: 'string', maxLength: 1000, nullable: true },
                  status: { type: 'string', enum: ['todo', 'doing', 'done'] },
                  dueDate: { type: 'string', nullable: true, example: '2026-11-20' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tâche mise à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonalTask' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Supprimer une tâche personnelle',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Tâche supprimée (aucun corps retourné)' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Rechercher des utilisateurs à inviter (réservé aux administrateurs d\'au moins une équipe)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filtre sur nom, prénom ou e-mail' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } },
        ],
        responses: {
          '200': {
            description: 'Résultats de l\'annuaire',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/PublicUser' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Récupérer son propre profil utilisateur',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profil utilisateur courant',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Mettre à jour son profil (prénom, nom, avatar)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string', maxLength: 60 },
                  lastName: { type: 'string', maxLength: 60 },
                  avatarUrl: {
                    type: 'string',
                    nullable: true,
                    description: 'URL http(s) ou Data URI raster base64 (`png`, `jpeg`, `webp`, `gif`)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profil mis à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
    },
    '/api/users/me/password': {
      patch: {
        tags: ['Users'],
        summary: 'Modifier son mot de passe',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8, maxLength: 72 },
                  confirmPassword: { type: 'string', minLength: 8, maxLength: 72 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Mot de passe mis à jour avec succès' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
    },
    '/api/teams': {
      get: {
        tags: ['Teams'],
        summary: 'Lister les équipes dont l\'utilisateur connecté est membre',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Équipes de l\'utilisateur',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Team' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Créer une nouvelle équipe (le créateur devient automatiquement admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 80, example: 'Squad Frontend' },
                  description: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Équipe créée',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Team' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
    },
    '/api/teams/{id}': {
      get: {
        tags: ['Teams'],
        summary: 'Consulter le détail d\'une équipe et ses membres',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': { description: 'Détail de l\'équipe et liste des membres' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      patch: {
        tags: ['Teams'],
        summary: 'Modifier les informations d\'une équipe (rôle admin requis)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 80 },
                  description: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Équipe modifiée' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Supprimer une équipe et toutes ses ressources en cascade (rôle admin requis)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Équipe supprimée' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/teams/{id}/members': {
      get: {
        tags: ['Teams'],
        summary: 'Lister les membres d\'une équipe',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Liste des membres',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Ajouter un membre à une équipe par userId ou email (rôle admin requis)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  userId: { type: 'string', description: 'Fournir userId OU email' },
                  email: { type: 'string', format: 'email', description: 'Fournir email OU userId' },
                  role: { $ref: '#/components/schemas/TeamRole' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Membre ajouté' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
          '409': { $ref: '#/components/responses/Conflict409' },
        },
      },
    },
    '/api/teams/{id}/members/{userId}': {
      patch: {
        tags: ['Teams'],
        summary: 'Modifier le rôle d\'un membre dans l\'équipe (admin requis, protection dernier admin)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam(), idPathParam('userId', 'Identifiant de l\'utilisateur membre')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: { role: { $ref: '#/components/schemas/TeamRole' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Rôle mis à jour' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Retirer un membre de l\'équipe et désassigner ses tickets (admin requis)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam(), idPathParam('userId', 'Identifiant de l\'utilisateur membre')],
        responses: {
          '204': { description: 'Membre retiré' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/teams/{id}/activity': {
      get: {
        tags: ['Teams'],
        summary: 'Consulter le flux d\'activité récent sur les projets d\'une équipe',
        security: [{ BearerAuth: [] }],
        parameters: [
          idPathParam(),
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
        ],
        responses: {
          '200': { description: 'Flux d\'activité récent de l\'équipe' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'Lister les projets accessibles',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'archived'] } },
        ],
        responses: {
          '200': {
            description: 'Liste des projets accessibles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Project' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Créer un projet dans une équipe (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['teamId', 'name', 'key'],
                properties: {
                  teamId: { type: 'string' },
                  name: { type: 'string', minLength: 1, maxLength: 100, example: 'TaskFlow Portail' },
                  key: { type: 'string', example: 'TFP', description: '2 à 10 caractères alphanumériques commençant par une lettre' },
                  description: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Projet créé',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '409': { $ref: '#/components/responses/Conflict409' },
        },
      },
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Consulter le détail d\'un projet',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Détail du projet',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Modifier un projet (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  key: { type: 'string', example: 'TFP2' },
                  description: { type: 'string', maxLength: 1000 },
                  status: { type: 'string', enum: ['active', 'archived'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Projet modifié' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
          '409': { $ref: '#/components/responses/Conflict409' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Supprimer un projet et ses features/tickets/commentaires (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Projet supprimé' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/projects/{id}/features': {
      get: {
        tags: ['Projects'],
        summary: 'Lister les features d\'un projet avec avancement calculé',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Features du projet',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Feature' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/projects/{id}/tickets': {
      get: {
        tags: ['Projects'],
        summary: 'Lister les tickets d\'un projet (filtres, recherche et pagination)',
        security: [{ BearerAuth: [] }],
        parameters: [
          idPathParam(),
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'] } },
          { name: 'featureId', in: 'query', schema: { type: 'string' }, description: 'ObjectId ou "unlinked"' },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' }, description: 'ObjectId ou "unassigned"' },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          '200': {
            description: 'Tickets paginés du projet',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedTickets' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/projects/{id}/kanban': {
      get: {
        tags: ['Projects'],
        summary: 'Obtenir le tableau Kanban structuré en 4 colonnes (`todo`, `doing`, `testing`, `done`)',
        security: [{ BearerAuth: [] }],
        parameters: [
          idPathParam(),
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'] } },
          { name: 'featureId', in: 'query', schema: { type: 'string' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Colonnes Kanban ordonnées et compteurs globaux' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/features': {
      get: {
        tags: ['Features'],
        summary: 'Lister les features accessibles',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Liste des features avec progression' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      post: {
        tags: ['Features'],
        summary: 'Créer une feature dans un projet (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title'],
                properties: {
                  projectId: { type: 'string' },
                  title: { type: 'string', minLength: 1, maxLength: 140 },
                  description: { type: 'string', maxLength: 2000 },
                  status: { type: 'string', enum: ['planned', 'in_progress', 'done'], default: 'planned' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
                  dueDate: { type: 'string', nullable: true, example: '2026-12-01' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Feature créée',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Feature' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
        },
      },
    },
    '/api/features/{id}': {
      get: {
        tags: ['Features'],
        summary: 'Consulter le détail d\'une feature',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Détail de la feature',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Feature' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      patch: {
        tags: ['Features'],
        summary: 'Modifier une feature (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 140 },
                  description: { type: 'string', maxLength: 2000 },
                  status: { type: 'string', enum: ['planned', 'in_progress', 'done'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  dueDate: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Feature modifiée' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Features'],
        summary: 'Supprimer une feature (les tickets liés sont conservés avec `featureId: null`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Feature supprimée' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'Rechercher, filtrer et paginer les tickets accessibles',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'] } },
          { name: 'featureId', in: 'query', schema: { type: 'string' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
          { name: 'dueDate', in: 'query', schema: { type: 'string', example: '2026-11-20' } },
          { name: 'dueBefore', in: 'query', schema: { type: 'string', example: '2026-12-01' } },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Recherche par clé Jira (ex. TFW-1), titre ou ID' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          '200': {
            description: 'Tickets paginés',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedTickets' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Créer un ticket collaboratif avec clé séquentielle automatique (ex. `TFW-1`)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title'],
                properties: {
                  projectId: { type: 'string' },
                  featureId: { type: 'string', nullable: true },
                  title: { type: 'string', minLength: 1, maxLength: 160 },
                  description: { type: 'string', maxLength: 4000 },
                  status: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'], default: 'todo' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
                  type: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'], default: 'task' },
                  dueDate: { type: 'string', nullable: true, example: '2026-11-20' },
                  assignedTo: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Ticket créé',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
        },
      },
    },
    '/api/tickets/assigned/me': {
      get: {
        tags: ['Tickets'],
        summary: 'Lister les tickets assignés à l\'utilisateur connecté',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'] } },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          '200': {
            description: 'Tickets assignés à l\'utilisateur connecté',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedTickets' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
        },
      },
    },
    '/api/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Consulter le détail complet d\'un ticket',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Détail du ticket',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Modifier un ticket (contrôle RBAC et transitions d\'état validées)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 160 },
                  description: { type: 'string', maxLength: 4000 },
                  featureId: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  type: { type: 'string', enum: ['task', 'bug', 'story', 'improvement'] },
                  dueDate: { type: 'string', nullable: true },
                  assignedTo: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ticket mis à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Supprimer un ticket et son historique/commentaires (`admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Ticket supprimé' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/tickets/{id}/status': {
      patch: {
        tags: ['Tickets'],
        summary: 'Effectuer une transition de statut Kanban (avec commentaire optionnel)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['todo', 'doing', 'testing', 'done'] },
                  comment: { type: 'string', minLength: 1, maxLength: 2000, description: 'Commentaire optionnel lié à la transition' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Statut mis à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/tickets/{id}/assign': {
      patch: {
        tags: ['Tickets'],
        summary: 'Assigner ou désassigner un ticket (`admin`/`project_manager`, ou auto-prise d\'un ticket libre)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['assignedTo'],
                properties: {
                  assignedTo: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Assignation mise à jour',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/tickets/{id}/comments': {
      get: {
        tags: ['Tickets'],
        summary: 'Lister les commentaires d\'un ticket par ordre chronologique',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '200': {
            description: 'Commentaires du ticket',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Ajouter un commentaire sur un ticket',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', minLength: 1, maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Commentaire créé',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/tickets/{id}/history': {
      get: {
        tags: ['Tickets'],
        summary: 'Consulter le journal d\'audit automatique d\'un ticket',
        security: [{ BearerAuth: [] }],
        parameters: [
          idPathParam(),
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': {
            description: 'Entrées d\'audit du ticket',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/TicketHistoryEntry' } } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/comments/{id}': {
      patch: {
        tags: ['Comments'],
        summary: 'Modifier son propre commentaire (`isEdited: true`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', minLength: 1, maxLength: 2000 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Commentaire modifié',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Supprimer un commentaire (auteur, `admin` ou `project_manager`)',
        security: [{ BearerAuth: [] }],
        parameters: [idPathParam()],
        responses: {
          '204': { description: 'Commentaire supprimé' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '403': { $ref: '#/components/responses/Forbidden403' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Obtenir le tableau de bord consolidé (compteurs, retards, avancement projets, activité et vue par rôle)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'query', schema: { type: 'string' } },
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Données consolidées du tableau de bord' },
          '400': { $ref: '#/components/responses/BadRequest400' },
          '401': { $ref: '#/components/responses/Unauthorized401' },
          '404': { $ref: '#/components/responses/NotFound404' },
        },
      },
    },
  },
};
