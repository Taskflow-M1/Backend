/** Adapte les requêtes HTTP d'authentification aux services métier. */
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

export async function registerHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await requestRegistration(req.body as RegisterInput);
  res.status(200).json(result);
}

export async function loginHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json(result);
}

export async function sendVerificationCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await requestVerificationCode(
    req.body as SendVerificationCodeInput,
  );
  res.status(200).json(result);
}

export async function verifyEmailCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await verifyEmailCodeAndRegister(
    req.body as VerifyEmailCodeInput,
  );
  res.status(201).json(result);
}
