import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { WalletService } from '../services/WalletService.js';

export class TransactionController {
  /**
   * GET /api/transactions
   * Returns paginated transaction records with filters.
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view transactions',
        });
      }

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const type = (req.query.type as string) || (req.query.transactionType as string);
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const transactionsData = await WalletService.getTransactions(userId, {
        page,
        limit,
        type,
        status,
        search,
        startDate,
        endDate,
      });

      return res.status(200).json({
        status: 'success',
        data: transactionsData,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[TransactionController] Error fetching transactions');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch transactions',
      });
    }
  }

  /**
   * GET /api/transactions/export
   * Generates and downloads a real CSV export file.
   */
  static async exportTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to export transactions',
        });
      }

      const type = (req.query.type as string) || (req.query.transactionType as string);
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const csvContent = await WalletService.exportTransactionsCSV(userId, {
        type,
        status,
        search,
        startDate,
        endDate,
      });

      const filename = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err: any) {
      logger.error({ error: err.message }, '[TransactionController] Error exporting transactions CSV');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to export transactions',
      });
    }
  }

  /**
   * GET /api/transactions/:id
   * Returns details for a single transaction by ID.
   */
  static async getTransactionById(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required to view transaction details',
        });
      }

      const transactionId = req.params.id;
      if (!transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Transaction ID is required',
        });
      }

      const transaction = await WalletService.getTransactionById(userId, transactionId);

      return res.status(200).json({
        status: 'success',
        data: transaction,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, '[TransactionController] Error fetching transaction by ID');
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Failed to fetch transaction',
      });
    }
  }
}
