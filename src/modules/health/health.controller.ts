/** Retourne au client l'état calculé par le service de santé. */
import { Request, Response } from 'express';
import { getHealthStatus } from './health.service';

export function checkHealth(_req: Request, res: Response): void {
  const result = getHealthStatus();
  res.status(200).json(result);
}
