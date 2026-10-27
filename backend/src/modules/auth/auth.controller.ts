import { Request, Response } from 'express';
import { loginUser, registerUser } from './auth.service';
import { LoginInput, RegisterInput } from './auth.validation';

export async function registerHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await registerUser(req.body as RegisterInput);
  res.status(201).json(result);
}

export async function loginHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json(result);
}

