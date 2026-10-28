import http from 'http';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

let server: http.Server | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[Server] Shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
    }

    await disconnectDatabase();
    console.log('[Server] HTTP server and MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('[Server] Error during shutdown:', err);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    server = app.listen(env.port, () => {
      console.log(
        `[Server] TaskFlow API listening on http://localhost:${env.port} (${env.nodeEnv})`,
      );
    });

    server.on('error', async (err: NodeJS.ErrnoException) => {
      console.error(`[Server] Failed to bind port ${env.port}: ${err.message}`);
      await disconnectDatabase();
      process.exit(1);
    });

    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });
  } catch {
    process.exit(1);
  }
}

void startServer();
