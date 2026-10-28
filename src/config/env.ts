/**
 * Charge et valide les variables d'environnement une seule fois.
 * Le reste de l'application utilise ensuite cet objet typé et normalisé.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const PLACEHOLDER_JWT_SECRET =
  'replace-with-a-random-secret-at-least-32-characters';

function parsePort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
  }

  return port;
}

function parseCorsOrigins(rawOrigins: string | undefined): string[] {
  const value = rawOrigins ?? 'http://localhost:5173';

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseMongoUri(rawUri: string | undefined, nodeEnv: string): string {
  const uri =
    nodeEnv === 'test'
      ? (process.env.MONGODB_TEST_URI ??
        'mongodb://127.0.0.1:27017/taskflow_test')
      : rawUri;

  if (!uri) {
    if (nodeEnv === 'production') {
      throw new Error('Missing required MONGODB_URI environment variable');
    }
    return 'mongodb://127.0.0.1:27017/taskflow';
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      'Invalid MONGODB_URI environment variable: must start with mongodb:// or mongodb+srv://',
    );
  }

  return uri;
}

function parseJwtSecret(
  rawSecret: string | undefined,
  nodeEnv: string,
): string {
  if (nodeEnv === 'test') {
    return (
      process.env.JWT_TEST_SECRET ??
      'test-only-taskflow-jwt-secret-32-chars!'
    );
  }

  const secret = rawSecret?.trim();

  if (nodeEnv === 'production') {
    if (!secret || secret.length < 32 || secret === PLACEHOLDER_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must be set to a strong secret (at least 32 characters) in production',
      );
    }
    return secret;
  }

  if (!secret || secret === PLACEHOLDER_JWT_SECRET) {
    return 'dev-only-taskflow-jwt-secret-32-chars!';
  }

  return secret;
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  name: string,
): number {
  const value = Number(rawValue ?? fallback);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  port: parsePort(process.env.PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  mongodbUri: parseMongoUri(process.env.MONGODB_URI, nodeEnv),
  jwtSecret: parseJwtSecret(process.env.JWT_SECRET, nodeEnv),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '24h',
  resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
  resendFromEmail:
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'TaskFlow <onboarding@resend.dev>',
  emailVerificationTtlMinutes: parsePositiveInteger(
    process.env.EMAIL_VERIFICATION_TTL_MINUTES,
    10,
    'EMAIL_VERIFICATION_TTL_MINUTES',
  ),
};
