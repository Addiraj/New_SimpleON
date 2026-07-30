import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { WalletService } from '../services/WalletService.js';

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
}
