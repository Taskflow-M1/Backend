export interface HealthStatus {
  status: 'ok';
}

// Construit l’état minimal de santé de l’application.
export function getHealthStatus(): HealthStatus {
  return { status: 'ok' };
}
