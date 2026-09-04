import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { BoosterConfigService, BoosterTierCode } from './BoosterConfigService.js';
import { X5MatrixService } from './X5MatrixService.js';

export class MatrixQueryService {
  private static normalizeTierCode(tierCode?: string | null): BoosterTierCode | undefined {
    const normalized = tierCode?.toLowerCase().trim();
    if (!normalized || normalized === 'main') return undefined;
    const config = BoosterConfigService.getTierConfig(normalized);
    return config?.code;
  }

  static async getAvailableTiers(userId: string) {
    const userLevels = await prisma.userLevel.findMany({
      where: {
        user_id: userId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        level_configuration: {
          status: 'ACTIVE',
          slug: { in: BoosterConfigService.getAllTierConfigs().map((tier) => tier.code) },
        },
      },
      include: { level_configuration: true },
      orderBy: { level_configuration: { level_order: 'asc' } },
    });

    const uniqueByCode = new Map<BoosterTierCode, any>();
    for (const userLevel of userLevels) {
      const code = this.normalizeTierCode(userLevel.level_configuration.slug);
      if (!code || uniqueByCode.has(code)) continue;
      const tier = BoosterConfigService.assertTierConfig(code);
      uniqueByCode.set(code, {
        ...tier,
        levelConfigId: userLevel.level_configuration_id,
        levelOrder: userLevel.level_configuration.level_order,
        userLevelStatus: userLevel.status,
      });
    }

    return Array.from(uniqueByCode.values());
  }

  private static async resolveAuthorizedContext(userId: string, levelConfigId?: string, tierCode?: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required for matrix data');
    }

    const availableTiers = await this.getAvailableTiers(userId);
    if (availableTiers.length === 0) {
      throw AppError.forbidden('No unlocked Booster tiers are available for this account');
    }

    let requestedCode = this.normalizeTierCode(tierCode);

    if (levelConfigId) {
      const found = await prisma.levelConfiguration.findFirst({
        where: {
          OR: [
            { id: levelConfigId },
            { slug: levelConfigId.toLowerCase().trim() },
          ],
        },
        select: { slug: true },
      });
      requestedCode = this.normalizeTierCode(found?.slug) || requestedCode;
    }

    const selectedTier = requestedCode
      ? availableTiers.find((tier) => tier.code === requestedCode)
      : availableTiers[0];

    if (!selectedTier) {
      throw AppError.forbidden(`Booster tier '${requestedCode || tierCode || levelConfigId || 'unknown'}' is not unlocked for this account`);
    }

    return {
      userId,
      targetLevelId: selectedTier.levelConfigId as string,
      selectedTier,
      availableTiers,
    };
  }

  private static getTierConfigFromCycle(cycle: any, fallbackTierCode: BoosterTierCode = 'starter') {
    const slug = cycle?.level_configuration?.slug || fallbackTierCode;
    return BoosterConfigService.getTierConfig(slug) || BoosterConfigService.assertTierConfig(fallbackTierCode);
  }

  /**
   * 1. GET /api/matrix/summary
   * Aggregates X5 Matrix statistics for a user.
   */
  static async getSummary(userId: string, levelConfigId?: string, tierCode?: string) {
    const context = await this.resolveAuthorizedContext(userId, levelConfigId, tierCode);

    // Fetch user cycles
    const cycles = await prisma.matrixCycle.findMany({
      where: {
        user_id: context.userId,
        level_configuration_id: context.targetLevelId,
      },
      include: {
        level_configuration: true,
        positions: true,
      },
      orderBy: { cycle_number: 'desc' },
    });

    const completedCyclesCount = cycles.filter((c) => c.status === 'COMPLETED').length;
    const activeCycles = cycles.filter((c) => c.status === 'ACTIVE');

    let totalFilledNodes = 0;
    cycles.forEach((c) => {
      totalFilledNodes += c.filled_positions;
    });

    let totalGeneratedEarnings = 0;
    cycles.forEach((c) => {
      const tier = this.getTierConfigFromCycle(c);
      totalGeneratedEarnings += X5MatrixService.calculateCurrentCycleGeneratedAmount(tier.code, c.filled_positions);
    });

    return {
      userId: context.userId,
      selectedTier: context.selectedTier,
      availableTiers: context.availableTiers,
      totalCompletedCycles: completedCyclesCount,
      totalActiveCycles: activeCycles.length,
      totalFilledNodes,
      totalGeneratedEarnings,
      activeCycleNumber: activeCycles[0]?.cycle_number || 1,
      cyclesSummary: cycles.map((c) => ({
        id: c.id,
        cycleNumber: c.cycle_number,
        status: c.status,
        filledPositions: c.filled_positions,
        totalPositions: c.total_positions,
        levelName: c.level_configuration?.name || 'Level 1',
        levelSlug: c.level_configuration?.slug || 'booster-1',
        joiningAmount: this.getTierConfigFromCycle(c, context.selectedTier.code).subscriptionAmount,
        startedAt: c.started_at,
        completedAt: c.completed_at,
      })),
    };
  }

  /**
   * 2. GET /api/matrix/current
   * Returns current active cycle for user with 5 positions formatted for UI.
   */
  static async getCurrentCycle(userId: string, levelConfigId?: string, tierCode?: string) {
    const context = await this.resolveAuthorizedContext(userId, levelConfigId, tierCode);

    let activeCycle = await prisma.matrixCycle.findFirst({
      where: {
        user_id: context.userId,
        level_configuration_id: context.targetLevelId,
        status: 'ACTIVE',
      },
      include: {
        level_configuration: true,
        positions: {
          include: {
            member_user: true,
            sponsor_user: true,
          },
          orderBy: { position_number: 'asc' },
        },
      },
      orderBy: { cycle_number: 'desc' },
    });

    if (!activeCycle) {
      // Fallback: Pick latest completed cycle if no active
      activeCycle = await prisma.matrixCycle.findFirst({
        where: {
          user_id: context.userId,
          level_configuration_id: context.targetLevelId,
        },
        include: {
          level_configuration: true,
          positions: {
            include: {
              member_user: true,
              sponsor_user: true,
            },
            orderBy: { position_number: 'asc' },
          },
        },
        orderBy: { cycle_number: 'desc' },
      });
    }

    const tierConfig = this.getTierConfigFromCycle(activeCycle, context.selectedTier.code);
    const slotValue = tierConfig.subscriptionAmount;
    const cycleNum = activeCycle?.cycle_number || 1;
    const totalSlots = activeCycle?.total_positions || tierConfig.slotsPerCycle || 5;

    // Map position nodes 1..totalSlots (matrix-width-aware — Launch/Visionary-X3 are 3, not 5)
    const positionsMap = new Map<number, any>();
    if (activeCycle?.positions) {
      activeCycle.positions.forEach((pos) => {
        positionsMap.set(pos.position_number, pos);
      });
    }

    const currentNodes = [];
    for (let slot = 1; slot <= totalSlots; slot++) {
      const pos = positionsMap.get(slot);
      if (pos) {
        const addr = pos.member_user?.wallet_address || '0x0000...';
        currentNodes.push({
          slotNumber: slot,
          label: slot === totalSlots ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
          isFilled: true,
          address: addr,
          shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          timestamp: pos.placed_at ? new Date(pos.placed_at).toISOString().replace('T', ' ').slice(0, 19) : '',
          status: 'COMPLETED',
          placementSource: pos.placement_source,
          placementType: pos.placement_source?.toLowerCase(),
          memberId: pos.member_user_id,
          tierAmount: slotValue,
          incomeGenerated: slotValue,
          reTopupAmount: tierConfig.resubscribeAmount,
          upgradeWalletAmount: tierConfig.upgradeAmount || 0,
          mainPlanAmount: tierConfig.mainPlanAmount || 0,
          netIncome: tierConfig.netIncome || 0,
          transactionHash: null,
        });
      } else {
        currentNodes.push({
          slotNumber: slot,
          label: slot === totalSlots ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
          isFilled: false,
          status: 'PENDING',
          tierAmount: slotValue,
          incomeGenerated: 0,
          reTopupAmount: 0,
          upgradeWalletAmount: 0,
        });
      }
    }

    return {
      cycleId: activeCycle?.id || 'mc-active-fallback',
      cycleNumber: cycleNum,
      status: activeCycle?.status || 'ACTIVE',
      filledPositions: activeCycle?.filled_positions || currentNodes.filter((n) => n.isFilled).length,
      totalPositions: totalSlots,
      slotValueUsdt: slotValue,
      generatedAmount: X5MatrixService.calculateCurrentCycleGeneratedAmount(tierConfig.code, activeCycle?.filled_positions || currentNodes.filter((n) => n.isFilled).length),
      pendingPositions: X5MatrixService.calculatePendingSlots(activeCycle?.filled_positions || currentNodes.filter((n) => n.isFilled).length, totalSlots),
      levelName: tierConfig.name,
      levelSlug: tierConfig.code,
      tier: tierConfig,
      selectedTier: context.selectedTier,
      availableTiers: context.availableTiers,
      currentNodes,
    };
  }

  /**
   * 3. GET /api/matrix/cycles
   * Paginated list of user's cycles.
   */
  static async getCycles(
    userId: string,
    levelConfigId?: string,
    tierCode?: string,
    page = 1,
    limit = 10
  ) {
    const context = await this.resolveAuthorizedContext(userId, levelConfigId, tierCode);
    const skip = (page - 1) * limit;

    const whereCondition: any = { user_id: context.userId, level_configuration_id: context.targetLevelId };

    const total = await prisma.matrixCycle.count({ where: whereCondition });

    const cycles = await prisma.matrixCycle.findMany({
      where: whereCondition,
      include: {
        level_configuration: true,
      },
      skip,
      take: limit,
      orderBy: { cycle_number: 'desc' },
    });

    return {
      cycles: cycles.map((c) => {
        const tier = this.getTierConfigFromCycle(c, context.selectedTier.code);
        const slotValue = tier.subscriptionAmount;
        const earnings = X5MatrixService.calculateCurrentCycleGeneratedAmount(tier.code, c.filled_positions);

        return {
          cycle: c.cycle_number,
          id: c.id,
          status: c.status,
          filledSlots: c.filled_positions,
          totalSlots: c.total_positions,
          slotValue,
          earnings,
          totalCollection: c.total_positions * slotValue,
          resubscribeAmount: tier.resubscribeAmount,
          upgradeAmount: tier.upgradeAmount,
          upgradeTarget: tier.upgradeTarget,
          mainPlanAmount: tier.mainPlanAmount,
          netIncome: tier.netIncome,
          levelName: tier.name,
          levelSlug: tier.code,
          dateStarted: c.started_at ? new Date(c.started_at).toISOString().slice(0, 10) : '',
          dateCompleted: c.completed_at ? new Date(c.completed_at).toISOString().slice(0, 10) : null,
        };
      }),
      selectedTier: context.selectedTier,
      availableTiers: context.availableTiers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. GET /api/matrix/cycles/:id
   */
  static async getCycleById(userId: string, cycleId: string) {
    const cycle = await prisma.matrixCycle.findUnique({
      where: { id: cycleId },
      include: {
        level_configuration: true,
        user: { select: { wallet_address: true, referral_code: true } },
        positions: {
          include: {
            member_user: { select: { wallet_address: true, referral_code: true } },
            sponsor_user: { select: { wallet_address: true, referral_code: true } },
          },
          orderBy: { position_number: 'asc' },
        },
      },
    });

    if (!cycle || cycle.user_id !== userId) {
      throw AppError.notFound(`Matrix cycle ${cycleId} not found`);
    }

    return cycle;
  }

  /**
   * 5. GET /api/matrix/cycles/:id/positions
   */
  static async getCyclePositions(userId: string, cycleId: string) {
    const cycle = await prisma.matrixCycle.findUnique({
      where: { id: cycleId },
      select: { user_id: true },
    });

    if (!cycle || cycle.user_id !== userId) {
      throw AppError.notFound(`Matrix cycle ${cycleId} not found`);
    }

    const positions = await prisma.matrixPosition.findMany({
      where: { matrix_cycle_id: cycleId },
      include: {
        member_user: { select: { wallet_address: true, referral_code: true, display_name: true } },
        sponsor_user: { select: { wallet_address: true, referral_code: true } },
      },
      orderBy: { position_number: 'asc' },
    });

    return positions;
  }

  /**
   * 6. GET /api/matrix/tree
   */
  static async getMatrixTree(userId: string, levelConfigId?: string, tierCode?: string, depth = 3) {
    const context = await this.resolveAuthorizedContext(userId, levelConfigId, tierCode);

    const activeCycle = await prisma.matrixCycle.findFirst({
      where: {
        user_id: context.userId,
        level_configuration_id: context.targetLevelId,
        status: 'ACTIVE',
      },
      include: {
        user: { select: { wallet_address: true, referral_code: true } },
        positions: {
          include: {
            member_user: { select: { id: true, wallet_address: true, referral_code: true } },
          },
          orderBy: { position_number: 'asc' },
        },
      },
      orderBy: { cycle_number: 'desc' },
    });

    return {
      rootUserId: context.userId,
      levelConfigId: context.targetLevelId,
      selectedTier: context.selectedTier,
      availableTiers: context.availableTiers,
      cycle: activeCycle,
      depth,
    };
  }
}
