import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { DailyCappingService } from '../services/DailyCappingService.js';

export class CappingController {
  /**
   * GET /api/capping/status
   * Returns real-time daily capping metrics for the authenticated user.
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view capping status',
        });
      }

      const statusData = await DailyCappingService.getStatus(userId);

      return res.status(200).json({
        status: 'success',
        data: statusData,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[CappingController] Error fetching capping status');
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch capping status',
      });
    }
  }

  /**
   * GET /api/capping/history
   * Returns historical daily capping audit log entries with pagination.
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view capping history',
        });
      }

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const historyData = await DailyCappingService.getHistory(userId, page, limit);

      return res.status(200).json({
        status: 'success',
        data: historyData,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[CappingController] Error fetching capping history');
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch capping history',
      });
    }
  }

  /**
   * GET /api/capping/summary
   * Returns summary metrics and 7-day capping breakdown for dashboard visuals.
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view capping summary',
        });
      }

      const summaryData = await DailyCappingService.getSummary(userId);

      return res.status(200).json({
        status: 'success',
        data: summaryData,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[CappingController] Error fetching capping summary');
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch capping summary',
      });
    }
  }
}
