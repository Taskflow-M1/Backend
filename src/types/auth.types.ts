/**
 * Décrit l'identité ajoutée à une requête après authentification et étend
 * le type Request fourni par Express.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
