import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface UserQualificationData {
  directCount: number;
  builderCount: number;
  leaderCount: number;
  championCount: number;
  teamSize: number;
  totalEarnings: number;
  completedCycles: number;
}

export class QualifiedBuilderService {
  /**
   * Get total qualification metrics for a user:
   * - Direct referrals count (depth 1, ACTIVE status)
   * - Qualified builders count (direct referrals with current_level level_order >= 2 or active user_level >= 2)
   * - Total team size (all downline referrals in referral_relations)
   * - Total earnings from wallet_ledgers (CREDIT entries)
   * - Completed matrix cycles count
   */
  static async getQualificationData(
    userId: string,
    db: any = prisma
  ): Promise<UserQualificationData> {
    try {
      // 1. Direct referrals count
      const directCount = await db.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
        },
      });

      // 2. Qualified builders count: Direct referrals who have reached Builder level (level_order >= 2)
      const builderCount = await db.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
          referred: {
            current_level: {
              level_order: { gte: 2 },
            },
          },
        },
      });

      // 2a. Qualified leaders count: Direct referrals who have reached Leader level (level_order >= 3)
      const leaderCount = await db.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
          referred: {
            current_level: {
              level_order: { gte: 3 },
            },
          },
        },
      });

      // 2b. Qualified champions count: Direct referrals who have reached Champion level (level_order >= 4)
      const championCount = await db.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
          referred: {
            current_level: {
              level_order: { gte: 4 },
            },
          },
        },
      });

      // 3. Team size (total downline team members)
      const teamSize = await db.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          status: 'ACTIVE',
        },
      });

      // 4. Total earnings from CREDIT wallet ledgers
      const earningsAggregate = await db.walletLedger.aggregate({
        where: {
          user_id: userId,
          direction: 'CREDIT',
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      });
      const totalEarnings = earningsAggregate._sum.amount
        ? parseFloat(earningsAggregate._sum.amount.toString())
        : 0;

      // 5. Completed matrix cycles count
      const completedCycles = await db.matrixCycle.count({
        where: {
          user_id: userId,
          status: 'COMPLETED',
        },
      });

      return {
        directCount,
        builderCount,
        leaderCount,
        championCount,
        teamSize,
        totalEarnings,
        completedCycles,
      };
    } catch (err: any) {
      logger.warn(
        { userId, error: err.message },
        '[QualifiedBuilderService] Failed to calculate qualification data'
      );
      return {
        directCount: 0,
        builderCount: 0,
        leaderCount: 0,
        championCount: 0,
        teamSize: 0,
        totalEarnings: 0,
        completedCycles: 0,
      };
    }
  }

  /**
   * Helper to check if a specific user is a Qualified Builder (level_order >= 2)
   */
  static async isQualifiedBuilder(
    userId: string,
    db: any = prisma
  ): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { current_level: true },
      });
      if (!user || !user.current_level) return false;
      return user.current_level.level_order >= 2;
    } catch (err: any) {
      return false;
    }
  }
}
