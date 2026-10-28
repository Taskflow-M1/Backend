import { Request, Response } from 'express';
import {
  loginUser,
  requestRegistration,
  requestVerificationCode,
  verifyEmailCodeAndRegister,
} from './auth.service';
import {
  LoginInput,
  RegisterInput,
  SendVerificationCodeInput,
  VerifyEmailCodeInput,
} from './auth.validation';

// Traite la requête HTTP pour démarrer une inscription.
export async function registerHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await requestRegistration(req.body as RegisterInput);
  res.status(200).json(result);
}

// Traite la requête HTTP pour connecter un utilisateur.
export async function loginHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json(result);
}

// Traite la requête HTTP pour envoyer un nouveau code de vérification.
export async function sendVerificationCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await requestVerificationCode(
    req.body as SendVerificationCodeInput,
  );
  res.status(200).json(result);
}

// Traite la requête HTTP pour valider le code et terminer l’inscription.
export async function verifyEmailCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await verifyEmailCodeAndRegister(
    req.body as VerifyEmailCodeInput,
  );
  res.status(201).json(result);
}
