import { Request, Response } from 'express';
import { getHealthStatus } from './health.service';

// Répond au contrôle HTTP de disponibilité du serveur.
export function checkHealth(_req: Request, res: Response): void {
  const result = getHealthStatus();
  res.status(200).json(result);
}
