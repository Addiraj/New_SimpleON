import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { checkDatabaseConnection, disconnectDatabase } from './config/database.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export async function startServer() {
  const PORT = env.PORT || 3000;

  // Check initial database connectivity (non-blocking log)
  checkDatabaseConnection().then((res) => {
    if (res.connected) {
      logger.info('Database connection established successfully.');
    } else {
      logger.warn({ error: res.error }, 'Initial database connection warning');
    }
  });

  // Start Blockchain Listener
  import('./services/BlockchainListenerService.js').then(({ blockchainListenerService }) => {
    blockchainListenerService.start();
  });

  // Vite Middleware in Development mode
  if (env.NODE_ENV !== 'production') {
    logger.info('Starting Vite Dev Middleware...');
    const frontendRoot = fs.existsSync(path.join(process.cwd(), 'frontend'))
      ? path.join(process.cwd(), 'frontend')
      : process.cwd();
    const configFile = fs.existsSync(path.join(frontendRoot, 'vite.config.ts'))
      ? path.join(frontendRoot, 'vite.config.ts')
      : undefined;

    const vite = await createViteServer({
      root: frontendRoot,
      configFile,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info('Serving static build...');
    const distPath = fs.existsSync(path.join(process.cwd(), 'frontend/dist'))
      ? path.join(process.cwd(), 'frontend/dist')
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`SimpleOn Server running on http://0.0.0.0:${PORT} [${env.NODE_ENV}]`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force shutdown after 10s if connections won't close
    setTimeout(() => {
      logger.error('Could not close connections in time, forcing shutdown.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection at Promise');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ error: err.message, stack: err.stack }, 'Uncaught Exception thrown');
    process.exit(1);
  });

  return server;
}

export default startServer;
