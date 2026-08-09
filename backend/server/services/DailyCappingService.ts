import { Prisma, CappingHandlingType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { FinancialDateService } from './FinancialDateService.js';
import { QualifiedBuilderService } from './QualifiedBuilderService.js';
import { BoosterConfigService } from './BoosterConfigService.js';

export interface CappingEvaluationResult {
  businessDate: string;
  isCapped: boolean;
  dailyCycleLimit: number;
  completedCycleCount: number;
  cappedCycleCount: number;
  grossEarnings: number;
  creditedEarnings: number;
  excessThisTransaction: number;
  allowedThisTransaction: number;
  dailyCappingRecord: any;
}

export class DailyCappingService {
  /**
   * Evaluates and applies daily earning capping within a database transaction.
   * Cycle limits are evaluated independently for each Booster Pool.
   */
  static async evaluateAndApplyCapping(
    userId: string,
    levelConfigId: string,
    grossAmount: number,
    handlingType: CappingHandlingType = CappingHandlingType.HELD,
    customDate?: Date,
    db: any = prisma
  ): Promise<CappingEvaluationResult> {
    const executeCapping = async (tx: any) => {
      const businessDate = FinancialDateService.getBusinessDate(customDate);
      const businessDateStr = FinancialDateService.getBusinessDateString(customDate);
      const safeGrossInput = Math.max(0, grossAmount);

      // 1. Verify user has an active level
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.current_level_id) {
        throw new Error(`User ${userId} does not have an active Booster level. Earning eligibility denied.`);
      }

      // 2. Load the pool configuration that generated the reward
      const levelConfig = await tx.levelConfiguration.findUnique({
        where: { id: levelConfigId },
      });

      if (!levelConfig) {
        throw new Error(`Level Configuration ${levelConfigId} not found`);
      }

      const tierConfig = BoosterConfigService.assertTierConfig(levelConfig.slug);

      // 3. Fetch qualification data
      const qualification = await QualifiedBuilderService.getQualificationData(userId, tx);

      // 4. Calculate dynamic cycle limit for this specific pool
      const dailyCycleLimit = BoosterConfigService.calculateBoosterDailyCapping(tierConfig.code, {
        qualifiedBuilders: qualification.builderCount,
        qualifiedLeaders: qualification.leaderCount,
        qualifiedChampions: qualification.championCount,
        leaderDailyCapping: Math.max(5, qualification.championCount),
      });

      // 5. Ensure row exists atomically (row creation race protection)
      await tx.$executeRaw`
        INSERT INTO daily_cappings (
          id, user_id, level_configuration_id, business_date,
          gross_earning, allowed_earning, excess_earning, handling_type,
          qualified_builder_count, completed_cycle_count, daily_cycle_limit, capped_cycle_count, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${userId}, ${levelConfigId}, ${businessDate}::date,
          0, 0, 0, 'HELD'::"CappingHandlingType",
          ${qualification.builderCount}, 0, ${dailyCycleLimit}, 0, NOW(), NOW()
        )
        ON CONFLICT (user_id, level_configuration_id, business_date) DO NOTHING;
      `;

      // 6. Lock the exact DailyCapping row for UPDATE
      const lockedRecords: any[] = await tx.$queryRaw`
        SELECT id, completed_cycle_count, capped_cycle_count, gross_earning, allowed_earning, excess_earning
        FROM daily_cappings
        WHERE user_id = ${userId}
          AND level_configuration_id = ${levelConfigId}
          AND business_date = ${businessDate}::date
        FOR UPDATE;
      `;

      if (!lockedRecords || lockedRecords.length === 0) {
        throw new Error(`Failed to lock DailyCapping record for user ${userId}`);
      }

      const lockedRecord = lockedRecords[0];

      const currentCompletedCycles = Number(lockedRecord.completed_cycle_count);
      const currentCappedCycles = Number(lockedRecord.capped_cycle_count);
      const currentGross = parseFloat(lockedRecord.gross_earning.toString());
      const currentCredited = parseFloat(lockedRecord.allowed_earning.toString());
      const currentExcess = parseFloat(lockedRecord.excess_earning.toString());

      // 7. Evaluate Cycle Capping (using strictly the locked completed_cycle_count)
      const isCapped = currentCompletedCycles >= dailyCycleLimit;

      let allowedThisTransaction = 0;
      let excessThisTransaction = 0;
      let newCompletedCycles = currentCompletedCycles;
      let newCappedCycles = currentCappedCycles;

      if (isCapped) {
        // Capped! Reward goes to Immediate Sponsor
        allowedThisTransaction = 0;
        excessThisTransaction = safeGrossInput;
        newCappedCycles++;
      } else {
        // Eligible! Reward goes to Participant
        allowedThisTransaction = safeGrossInput;
        excessThisTransaction = 0;
        newCompletedCycles++;
      }

      const newGross = currentGross + safeGrossInput;
      const newCredited = currentCredited + allowedThisTransaction;
      const newExcess = currentExcess + excessThisTransaction;

      // 8. Store snapshot
      const snapshot = {
        evaluatedAt: new Date().toISOString(),
        userId,
        businessDate: businessDateStr,
        levelConfigurationId: levelConfigId,
        tierCode: tierConfig.code,
        dailyCycleLimit,
        isCapped,
        currentCompletedCyclesBefore: currentCompletedCycles,
        inputGrossAmount: safeGrossInput,
        allowedThisTransaction,
        excessThisTransaction,
      };

      // 9. Update `daily_cappings` record under lock
      const dailyCapping = await tx.dailyCapping.update({
        where: { id: lockedRecord.id },
        data: {
          gross_earning: new Prisma.Decimal(newGross),
          allowed_earning: new Prisma.Decimal(newCredited),
          excess_earning: new Prisma.Decimal(newExcess),
          completed_cycle_count: newCompletedCycles,
          capped_cycle_count: newCappedCycles,
          daily_cycle_limit: dailyCycleLimit,
          qualified_builder_count: qualification.builderCount,
          calculation_snapshot: snapshot,
        },
      });
      
      // Update DailyEarning (Legacy compatibility for accounting history)
      await tx.$executeRaw`
        INSERT INTO daily_earnings (
          id, user_id, business_date,
          gross_amount, credited_amount, capped_amount, held_amount, carried_forward_amount,
          daily_cap, timezone, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${userId}, ${businessDate}::date,
          0, 0, 0, 0, 0,
          0, ${FinancialDateService.getTimezone()}, 'ACTIVE'::"DailyEarningStatus", NOW(), NOW()
        )
        ON CONFLICT (user_id, business_date) DO NOTHING;
      `;

      await tx.dailyEarning.updateMany({
        where: {
          user_id: userId,
          business_date: businessDate,
        },
        data: {
          gross_amount: { increment: new Prisma.Decimal(safeGrossInput) },
          credited_amount: { increment: new Prisma.Decimal(allowedThisTransaction) },
          held_amount: { increment: new Prisma.Decimal(excessThisTransaction) },
        },
      });

      logger.info(
        {
          userId,
          businessDate: businessDateStr,
          isCapped,
          allowedThisTransaction,
        },
        '[DailyCappingService] Evaluated cycle capping'
      );

      return {
        businessDate: businessDateStr,
        isCapped,
        dailyCycleLimit,
        completedCycleCount: newCompletedCycles,
        cappedCycleCount: newCappedCycles,
        grossEarnings: newGross,
        creditedEarnings: newCredited,
        excessThisTransaction,
        allowedThisTransaction,
        dailyCappingRecord: dailyCapping,
      };
    };

    if (db !== prisma) {
      return executeCapping(db);
    } else {
      return prisma.$transaction(executeCapping, {
        maxWait: 5000,
        timeout: 10000,
      });
    }
  }

  /**
   * GET /api/capping/status
   * Returns an array of pool statuses
   */
  static async getStatus(userId: string, db: any = prisma) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.current_level_id) {
      return { pools: [], active: false };
    }

    const businessDate = FinancialDateService.getBusinessDate();
    const qualification = await QualifiedBuilderService.getQualificationData(userId, db);

    const activeConfigs = await db.levelConfiguration.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { level_order: 'asc' },
    });

    const pools = [];
    for (const config of activeConfigs) {
      const tierConfig = BoosterConfigService.getTierConfig(config.slug);
      if (!tierConfig) continue;

      const dailyCycleLimit = BoosterConfigService.calculateBoosterDailyCapping(tierConfig.code, {
        qualifiedBuilders: qualification.builderCount,
        qualifiedLeaders: qualification.leaderCount,
        qualifiedChampions: qualification.championCount,
        leaderDailyCapping: Math.max(5, qualification.championCount),
      });

      const cappingRecord = await db.dailyCapping.findUnique({
        where: {
          user_id_level_configuration_id_business_date: {
            user_id: userId,
            level_configuration_id: config.id,
            business_date: businessDate,
          },
        },
      });

      const completed = cappingRecord ? cappingRecord.completed_cycle_count : 0;
      const capped = cappingRecord ? cappingRecord.capped_cycle_count : 0;
      const remaining = Math.max(0, dailyCycleLimit - completed);

      pools.push({
        poolName: config.name,
        tierCode: tierConfig.code,
        dailyCycleLimit,
        completedCycleCount: completed,
        remainingCycles: remaining,
        cappedCycleCount: capped,
        isCapped: completed >= dailyCycleLimit,
        grossEarnings: cappingRecord ? parseFloat(cappingRecord.gross_earning.toString()) : 0,
        creditedEarnings: cappingRecord ? parseFloat(cappingRecord.allowed_earning.toString()) : 0,
      });
    }

    return {
      active: true,
      businessDate: FinancialDateService.getBusinessDateString(),
      qualification,
      pools,
    };
  }

  static async getSummary(userId: string, db: any = prisma) {
    const status = await this.getStatus(userId, db);
    return { currentStatus: status };
  }
}
