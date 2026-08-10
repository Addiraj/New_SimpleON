import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { FinancialDateService } from '../services/FinancialDateService.js';
import { TransactionType } from '@prisma/client';

export class StatsController {
  static async getGlobalStats(_req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Active Participants
      const activeParticipants = await prisma.user.count({
        where: { status: 'ACTIVE' }
      });

      // Valid Earning Transaction Types
      const earningTypes = [
        TransactionType.MATRIX_REWARD,
        (TransactionType as any).BOOSTER_REWARD,
        TransactionType.REFERRAL_REWARD
      ].filter(Boolean) as TransactionType[];

      // 2. Total Distributed
      const totalDistributedResult = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          transaction_type: { in: earningTypes }
        }
      });
      const totalUsdtDistributed = totalDistributedResult._sum.amount ? Number(totalDistributedResult._sum.amount) : 0;

      // 3. Distributed Today
      const businessDate = FinancialDateService.getBusinessDate();
      const { startUtc, endUtc } = FinancialDateService.getStartAndEndOfBusinessDay(businessDate);
      const distributedTodayResult = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          transaction_type: { in: earningTypes },
          completed_at: {
            gte: startUtc,
            lte: endUtc
          }
        }
      });
      const distributedToday = distributedTodayResult._sum.amount ? Number(distributedTodayResult._sum.amount) : 0;

      // 4. Recent Payouts
      const recentPayoutsRecords = await prisma.transaction.findMany({
        where: {
          status: 'COMPLETED',
          transaction_type: { in: earningTypes }
        },
        orderBy: { completed_at: 'desc' },
        take: 10,
        include: {
          user: {
            select: { wallet_address: true }
          }
        }
      });

      const recentPayouts = recentPayoutsRecords.map(tx => ({
        id: tx.id,
        recipient: tx.user?.wallet_address || 'UNKNOWN',
        amount: Number(tx.amount),
        timestamp: tx.completed_at || tx.created_at,
        type: tx.transaction_type,
        blockchainHash: tx.blockchain_transaction_hash || null
      }));

      res.json({
        success: true,
        data: {
          totalUsdtDistributed,
          activeParticipants,
          distributedToday,
          recentPayouts,
          currentNetworkStatus: 'OPERATIONAL',
          supportedChains: ['BNB Chain Testnet (97)', 'BNB Chain Mainnet (56)'],
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
