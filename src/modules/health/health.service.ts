/** Fournit une réponse minimale confirmant que le processus répond. */
export interface HealthStatus {
  status: 'ok';
}

export function getHealthStatus(): HealthStatus {
  return { status: 'ok' };
}
