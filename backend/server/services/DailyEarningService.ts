import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { FinancialDateService } from './FinancialDateService.js';
import { QualifiedBuilderService } from './QualifiedBuilderService.js';

export interface DailyEarningMetrics {
  userId: string;
  businessDate: string;
  grossEarnings: number;
  creditedEarnings: number;
  dailyCap: number;
  remainingCap: number;
  cappedAmount: number;
  heldAmount: number;
  carriedForwardAmount: number;
  qualifiedBuilderCount: number;
  completedCycleCount: number;
}

export class DailyEarningService {
  /**
   * Fetches or initializes current daily earning record for a user and business date.
   * Ensures non-negative numbers and Decimal precision.
   *
   * @param userId User ID
   * @param date Optional date (defaults to current business date)
   * @param db Prisma transaction or database client
   */
  static async getDailyEarnings(
    userId: string,
    date?: Date,
    db: any = prisma
  ): Promise<DailyEarningMetrics> {
    const businessDate = FinancialDateService.getBusinessDate(date);
    const businessDateStr = FinancialDateService.getBusinessDateString(date);

    // 1. Fetch user's current level configuration for daily cap
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { current_level: true },
    });

    let levelConfig = user?.current_level;
    if (!levelConfig) {
      levelConfig = await db.levelConfiguration.findFirst({
        where: { level_order: 1, status: 'ACTIVE' },
      });
    }

    const configuredCap = levelConfig?.daily_cap
      ? parseFloat(levelConfig.daily_cap.toString())
      : 50;

    // 2. Fetch or calculate DailyEarning and DailyCapping records
    const [dailyEarningRecord, dailyCappingRecord] = await Promise.all([
      db.dailyEarning.findUnique({
        where: {
          user_id_business_date: {
            user_id: userId,
            business_date: businessDate,
          },
        },
      }),
      db.dailyCapping.findUnique({
        where: {
          user_id_business_date: {
            user_id: userId,
            business_date: businessDate,
          },
        },
      }),
    ]);

    // 3. Fetch qualification data
    const qualification = await QualifiedBuilderService.getQualificationData(userId, db);

    const grossEarnings = Math.max(
      0,
      dailyEarningRecord
        ? parseFloat(dailyEarningRecord.gross_amount.toString())
        : dailyCappingRecord
        ? parseFloat(dailyCappingRecord.gross_earning.toString())
        : 0
    );

    const creditedEarnings = Math.max(
      0,
      dailyEarningRecord
        ? parseFloat(dailyEarningRecord.credited_amount.toString())
        : dailyCappingRecord
        ? parseFloat(dailyCappingRecord.allowed_earning.toString())
        : 0
    );

    const dailyCap = Math.max(
      0,
      dailyEarningRecord
        ? parseFloat(dailyEarningRecord.daily_cap.toString())
        : configuredCap
    );

    const remainingCap = Math.max(0, dailyCap - creditedEarnings);

    const cappedAmount = Math.max(
      0,
      dailyEarningRecord
        ? parseFloat(dailyEarningRecord.capped_amount.toString())
        : dailyCappingRecord
        ? parseFloat(dailyCappingRecord.excess_earning.toString())
        : 0
    );

    const heldAmount = Math.max(
      0,
      dailyEarningRecord ? parseFloat(dailyEarningRecord.held_amount.toString()) : 0
    );

    const carriedForwardAmount = Math.max(
      0,
      dailyEarningRecord
        ? parseFloat(dailyEarningRecord.carried_forward_amount.toString())
        : 0
    );

    const completedCycles = dailyCappingRecord?.completed_cycle_count ?? qualification.completedCycles;

    return {
      userId,
      businessDate: businessDateStr,
      grossEarnings,
      creditedEarnings,
      dailyCap,
      remainingCap,
      cappedAmount,
      heldAmount,
      carriedForwardAmount,
      qualifiedBuilderCount: qualification.builderCount,
      completedCycleCount: completedCycles,
    };
  }

  /**
   * Helper to calculate remaining cap for a given user and amount.
   */
  static calculateCapDistribution(
    proposedAmount: number,
    creditedToday: number,
    dailyCapLimit: number
  ) {
    const safeProposed = Math.max(0, proposedAmount);
    const safeCredited = Math.max(0, creditedToday);
    const safeLimit = Math.max(0, dailyCapLimit);

    const remainingCap = Math.max(0, safeLimit - safeCredited);
    const allowedAmount = Math.min(safeProposed, remainingCap);
    const excessAmount = Math.max(0, safeProposed - allowedAmount);

    return {
      allowedAmount,
      excessAmount,
      remainingCapAfter: Math.max(0, remainingCap - allowedAmount),
    };
  }
}
