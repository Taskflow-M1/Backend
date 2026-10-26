import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
};

