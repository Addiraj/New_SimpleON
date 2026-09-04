import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { WalletService } from '../services/WalletService.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { ReferralService } from '../services/ReferralService.js';
import { PaymentService } from '../services/PaymentService.js';
import { MatrixPlacementService } from '../services/MatrixPlacementService.js';
import { BoosterRepository } from '../repositories/BoosterRepository.js';
import { prisma } from '../config/database.js';

export class WalletController {
  /**
   * GET /api/wallet/summary
   * Returns current wallet balances and earning metrics.
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view wallet summary',
        });
      }

      const summary = await WalletService.getSummary(userId);

      return res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[WalletController] Error fetching wallet summary');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch wallet summary',
      });
    }
  }

  /**
   * GET /api/wallet/bititan
   * Returns the user's Bititan Wallet reserve — deliberately separate from getSummary(),
   * never merged with the Income Wallet.
   */
  static async getBititanSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view Bititan Wallet summary',
        });
      }

      const summary = await WalletService.getBititanSummary(userId);

      return res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[WalletController] Error fetching Bititan wallet summary');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch Bititan wallet summary',
      });
    }
  }

  /**
   * GET /api/wallet/ledger
   * Returns paginated wallet ledger audit entries.
   */
  static async getLedger(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view wallet ledger',
        });
      }

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const entryType = req.query.entryType as string | undefined;
      const status = req.query.status as string | undefined;
      const direction = req.query.direction as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const ledgerData = await WalletService.getLedger(userId, {
        page,
        limit,
        entryType,
        status,
        direction,
        search,
        startDate,
        endDate,
      });

      return res.status(200).json({
        status: 'success',
        data: ledgerData,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[WalletController] Error fetching wallet ledger');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch wallet ledger',
      });
    }
  }
  /**
   * POST /api/wallet/faucet
   * Claims demo coins for testing
   */
  static async claimDemoCoins(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.body.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to claim demo coins',
        });
      }

      // Allow claiming an unlimited number of times for testing
      // Each claim will give 500 USDT
      const idempotencyKey = `faucet_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await WalletService.addLedgerEntry({
        userId,
        entryType: 'DEPOSIT',
        direction: 'CREDIT',
        amount: 500,
        idempotencyKey,
        sourceType: 'FAUCET',
        sourceId: 'dev_faucet',
        status: 'COMPLETED',
        metadata: { isFaucet: true },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Successfully claimed 500 demo USDT',
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[WalletController] Error claiming demo coins');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to claim demo coins',
      });
    }
  }

  /**
   * POST /api/wallet/demo-activate
   * Activates the starter plan (deducting 10 Demo USDT) and optionally assigns a sponsor
   */
  static async demoActivate(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.body.userId as string);
      if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Authentication required' });
      }

      const { referralCode } = req.body;

      // 1. Check if user is already ACTIVE
      const user = await AuthRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      if (user.status === 'ACTIVE') {
        return res.status(200).json({ status: 'info', message: 'User is already active' });
      }

      // 2. Assign Sponsor if provided
      if (referralCode) {
        try {
          await ReferralService.assignSponsor(userId, referralCode);
        } catch (err: any) {
          // If relationship already exists, ignore, else return error
          if (!err.message.includes('already exists') && !err.message.includes('already has an assigned sponsor')) {
            return res.status(err.statusCode || 400).json({ status: 'error', message: err.message });
          }
        }
      }

      // 3. Resolve the actual entry tier (level_order 1 — Launch) dynamically, never hardcoded,
      // so this demo flow can't silently drift from whatever the real entry-tier price is.
      const activePlans = await BoosterRepository.getAllActiveLevelConfigs();
      const entryLevel = activePlans.find((p) => p.level_order === 1) || activePlans[0];
      const entryAmount = parseFloat(entryLevel.joining_amount);

      const summary = await WalletService.getSummary(userId);
      if (summary.availableBalance < entryAmount) {
        return res.status(400).json({
          status: 'error',
          message: 'Insufficient Demo Coins. Claim 500 USDT from the Dashboard first.',
        });
      }

      // 4. Deduct the entry tier's real price
      await WalletService.addLedgerEntry({
        userId,
        entryType: 'PLAN_JOIN',
        direction: 'DEBIT',
        amount: entryAmount,
        idempotencyKey: `demo_activate_${userId}_${Date.now()}`,
        sourceType: 'BOOSTER_PLAN',
        sourceId: 'demo_join',
        status: 'COMPLETED',
        metadata: { isDemo: true, description: `Demo ${entryLevel.name} Plan Activation` },
      });

      // 5. Create and Confirm Intent
      const intent = await PaymentService.createJoinIntent(userId);
      const result = await PaymentService.confirmMockPayment(intent.id, userId, `0xmock_demo_${Date.now()}`);

      // 6. Ensure Matrix placement happens if it didn't already
      try {
        const levelConfigId = result.level?.id;
        if (levelConfigId) {
          await MatrixPlacementService.placeUserInMatrix(userId, levelConfigId);
        }
      } catch (mErr: any) {
        logger.warn({ error: mErr.message }, '[WalletController] Matrix placement notification warning in demoActivate');
      }

      return res.status(200).json({
        status: 'success',
        message: `Successfully activated Demo ${entryLevel.name} Plan`,
        data: result,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[WalletController] Error in demo activate');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to activate demo plan',
      });
    }
  }
}
