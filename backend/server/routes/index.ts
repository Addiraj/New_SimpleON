import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { env } from '../config/env.js';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import boosterRoutes from './booster.routes.js';
import matrixRoutes from './matrix.routes.js';
import statsRoutes from './stats.routes.js';
import contractRoutes from './contract.routes.js';
import referralRoutes from './referral.routes.js';
import paymentRoutes from './payment.routes.js';
import upgradeRoutes from './upgrade.routes.js';
import cappingRoutes from './capping.routes.js';
import walletRoutes from './wallet.routes.js';
import transactionRoutes from './transaction.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

// GET /api/health Endpoint
router.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  const healthData = {
    status: 'ok',
    database: dbStatus.connected ? 'connected' : 'degraded',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ...(dbStatus.error && { dbError: dbStatus.error }),
  };

  return res.status(200).json({
    success: true,
    data: healthData,
    ...healthData,
  });
});

// Existing Feature API Routes
router.use('/auth', authRoutes);

router.use('/user', userRoutes);
router.use('/users', userRoutes);

router.use('/booster', boosterRoutes);
router.use('/boosters', boosterRoutes);

router.use('/matrix', matrixRoutes);
router.use('/stats', statsRoutes);

router.use('/contract', contractRoutes);
router.use('/contracts', contractRoutes);

router.use('/referral', referralRoutes);
router.use('/referrals', referralRoutes);

router.use('/payment', paymentRoutes);
router.use('/payments', paymentRoutes);

router.use('/upgrade', upgradeRoutes);
router.use('/upgrades', upgradeRoutes);

router.use('/capping', cappingRoutes);

router.use('/wallet', walletRoutes);
router.use('/wallets', walletRoutes);

router.use('/transaction', transactionRoutes);
router.use('/transactions', transactionRoutes);

router.use('/dashboard', dashboardRoutes);

router.use('/notification', notificationRoutes);
router.use('/notifications', notificationRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

export default router;
