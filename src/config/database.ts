import os from 'node:os';
import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let listenersRegistered = false;

export function redactMongoUri(text: string): string {
  return text.replace(
    /(mongodb(?:\+srv)?:\/\/[^:\s]+:)([^@\s]+)(@)/gi,
    '$1[REDACTED]$3',
  );
}

function registerConnectionListeners(): void {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('error', (err: Error) => {
    if (env.nodeEnv !== 'test') {
      console.error('[MongoDB] Connection error:', redactMongoUri(err.message));
    }
  });

  mongoose.connection.on('disconnected', () => {
    if (env.nodeEnv !== 'test') {
      console.log('[MongoDB] Disconnected');
    }
  });
}

export async function connectDatabase(
  uri: string = env.mongodbUri,
  timeoutMs: number = 5000,
): Promise<void> {
  registerConnectionListeners();

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      runtimeAdapters: { os },
    });

    if (env.nodeEnv !== 'test') {
      console.log(
        `[MongoDB] Connected to database "${mongoose.connection.name}"`,
      );
    }
  } catch (err) {
    const reason =
      err instanceof Error ? redactMongoUri(err.message) : 'Unknown error';

    if (env.nodeEnv !== 'test') {
      console.error(`[MongoDB] Failed to connect: ${reason}`);
    }

    throw new Error(`Database connection failed: ${reason}`, { cause: err });
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

