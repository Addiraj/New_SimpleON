import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { UpgradeEligibilityService } from '../services/UpgradeEligibilityService.js';
import { ManualUpgradeService } from '../services/ManualUpgradeService.js';

export class UpgradeController {
  /**
   * GET /api/upgrades/eligibility
   * Returns user's upgrade eligibility, backend requirements, and snapshot.
   */
  static async getEligibility(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to check upgrade eligibility',
        });
      }

      const targetSlug = (req.query.targetSlug as string) || (req.query.slug as string);
      const result = await UpgradeEligibilityService.evaluateEligibility(userId, targetSlug);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[UpgradeController] Error fetching eligibility');
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to evaluate upgrade eligibility',
      });
    }
  }

  /**
   * GET /api/upgrades/history
   * Returns user's upgrade history.
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view upgrade history',
        });
      }

      const histories = await prisma.upgradeHistory.findMany({
        where: { user_id: userId },
        include: {
          from_level: true,
          to_level: true,
          transaction: true,
        },
        orderBy: { created_at: 'desc' },
      });

      return res.status(200).json({
        status: 'success',
        data: histories,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[UpgradeController] Error fetching upgrade history');
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch upgrade history',
      });
    }
  }

  /**
   * POST /api/upgrades/execute
   * Executes manual upgrade after server-side eligibility check.
   */
  static async executeUpgrade(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || req.body.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to execute upgrade',
        });
      }

      const { targetSlug, idempotencyKey } = req.body;
      const result = await ManualUpgradeService.executeManualUpgrade(
        userId,
        targetSlug,
        idempotencyKey
      );

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[UpgradeController] Error executing manual upgrade');
      return res.status(400).json({
        status: 'error',
        message: err.message || 'Failed to execute level upgrade',
      });
    }
  }

  /**
   * POST /api/upgrades/create-payment-intent
   * Validates backend eligibility and creates payment intent for upgrading level.
   */
  static async createPaymentIntent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || req.body.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to create payment intent',
        });
      }

      const levelSlug = req.body.levelSlug || req.body.targetSlug;
      const result = await ManualUpgradeService.createPaymentIntent(userId, levelSlug);

      return res.status(201).json({
        status: 'success',
        data: result.paymentIntent,
        eligibility: result.eligibility,
        upgradeHistory: result.upgradeHistory,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[UpgradeController] Error creating payment intent');
      return res.status(400).json({
        status: 'error',
        message: err.message || 'Failed to create upgrade payment intent',
      });
    }
  }
}
