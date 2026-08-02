import { PrismaClient } from '@prisma/client';
import net from 'net';
import { env } from './env.js';
import { logger } from './logger.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let cachedConnectionStatus: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 5000;

function getDatabaseSocketTarget(): { host: string; port: number } | null {
  if (!env.DATABASE_URL) {
    return null;
  }

  try {
    const url = new URL(env.DATABASE_URL);
    return {
      host: url.hostname || 'localhost',
      port: Number(url.port || 5432),
    };
  } catch {
    return null;
  }
}

async function canOpenDatabaseSocket(timeoutMs = 500): Promise<boolean> {
  const target = getDatabaseSocketTarget();

  if (!target) {
    return false;
  }

  return new Promise((resolve) => {
    const socket = net.createConnection(target);
    const done = (available: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(available);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function isDatabaseAvailable(): Promise<boolean> {
  if (process.env.USE_MEMORY_STORE === 'true') {
    return false;
  }

  const now = Date.now();
  if (cachedConnectionStatus !== null && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return cachedConnectionStatus;
  }

  try {
    if (!(await canOpenDatabaseSocket())) {
      cachedConnectionStatus = false;
      lastCheckTime = now;
      return false;
    }

    // Attempt a quick query with a timeout promise to avoid waiting for Prisma TCP timeouts
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 1000)),
    ]);
    cachedConnectionStatus = true;
    lastCheckTime = now;
    return true;
  } catch (err: any) {
    cachedConnectionStatus = false;
    lastCheckTime = now;
    return false;
  }
}

export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  const available = await isDatabaseAvailable();
  if (available) {
    return { connected: true };
  }
  return { connected: false, error: 'Database server unavailable or timing out' };
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed cleanly.');
  } catch (err: any) {
    logger.error({ error: err.message }, 'Error disconnecting from database');
  }
}

export default prisma;
