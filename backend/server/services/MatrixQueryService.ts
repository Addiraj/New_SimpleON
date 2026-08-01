import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { BoosterConfigService } from './BoosterConfigService.js';
import { X5MatrixService } from './X5MatrixService.js';

export class MatrixQueryService {
  /**
   * Helper to resolve target user ID from request parameters or fallback to default/root user.
   */
  private static async resolveUserId(userId?: string, walletAddress?: string): Promise<string> {
    if (userId) {
      return userId;
    }

    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { wallet_address: walletAddress.toLowerCase() },
        select: { id: true },
      });
      if (user) return user.id;
    }

    // Fallback: Pick the first available user in DB
    const firstUser = await prisma.user.findFirst({
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    if (firstUser) return firstUser.id;

    throw new Error('User not found');
  }

  /**
   * Helper to resolve Level Configuration ID
   */
  private static async resolveLevelConfigId(levelConfigId?: string, tierCode?: string, userId?: string): Promise<string> {
    if (levelConfigId) return levelConfigId;

    if (tierCode) {
      const level = await prisma.levelConfiguration.findFirst({
        where: { status: 'ACTIVE', slug: tierCode.toLowerCase() },
        orderBy: { version: 'desc' },
        select: { id: true },
      });
      if (level) return level.id;
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { current_level_id: true },
      });
      if (user?.current_level_id) return user.current_level_id;
    }

    const level = await prisma.levelConfiguration.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { level_order: 'asc' },
      select: { id: true },
    });

    if (level) return level.id;
    return 'default-level-1';
  }

  private static getTierConfigFromCycle(cycle: any) {
    const slug = cycle?.level_configuration?.slug || 'starter';
    return BoosterConfigService.getTierConfig(slug) || BoosterConfigService.assertTierConfig('starter');
  }

  /**
   * 1. GET /api/matrix/summary
   * Aggregates X5 Matrix statistics for a user.
   */
  static async getSummary(userId?: string, walletAddress?: string, levelConfigId?: string, tierCode?: string) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = await this.resolveLevelConfigId(levelConfigId, tierCode, targetUserId);

    // Fetch user cycles
    const cycles = await prisma.matrixCycle.findMany({
      where: { user_id: targetUserId, level_configuration_id: targetLevelId },
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
      userId: targetUserId,
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
        joiningAmount: this.getTierConfigFromCycle(c).subscriptionAmount,
        startedAt: c.started_at,
        completedAt: c.completed_at,
      })),
    };
  }

  /**
   * 2. GET /api/matrix/current
   * Returns current active cycle for user with 5 positions formatted for UI.
   */
  static async getCurrentCycle(userId?: string, walletAddress?: string, levelConfigId?: string, tierCode?: string) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = await this.resolveLevelConfigId(levelConfigId, tierCode, targetUserId);

    let activeCycle = await prisma.matrixCycle.findFirst({
      where: {
        user_id: targetUserId,
        level_configuration_id: targetLevelId,
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
          user_id: targetUserId,
          level_configuration_id: targetLevelId,
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

    const tierConfig = this.getTierConfigFromCycle(activeCycle);
    const slotValue = tierConfig.subscriptionAmount;
    const cycleNum = activeCycle?.cycle_number || 1;

    // Map 5 position nodes (1 through 5)
    const positionsMap = new Map<number, any>();
    if (activeCycle?.positions) {
      activeCycle.positions.forEach((pos) => {
        positionsMap.set(pos.position_number, pos);
      });
    }

    const currentNodes = [];
    for (let slot = 1; slot <= 5; slot++) {
      const pos = positionsMap.get(slot);
      if (pos) {
        const addr = pos.member_user?.wallet_address || '0x0000...';
        currentNodes.push({
          slotNumber: slot,
          label: slot === 5 ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
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
          label: slot === 5 ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
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
      totalPositions: activeCycle?.total_positions || 5,
      slotValueUsdt: slotValue,
      generatedAmount: X5MatrixService.calculateCurrentCycleGeneratedAmount(tierConfig.code, activeCycle?.filled_positions || currentNodes.filter((n) => n.isFilled).length),
      pendingPositions: X5MatrixService.calculatePendingSlots(activeCycle?.filled_positions || currentNodes.filter((n) => n.isFilled).length, activeCycle?.total_positions || 5),
      levelName: tierConfig.name,
      levelSlug: tierConfig.code,
      tier: tierConfig,
      currentNodes,
    };
  }

  /**
   * 3. GET /api/matrix/cycles
   * Paginated list of user's cycles.
   */
  static async getCycles(
    userId?: string,
    walletAddress?: string,
    levelConfigId?: string,
    tierCode?: string,
    page = 1,
    limit = 10
  ) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = await this.resolveLevelConfigId(levelConfigId, tierCode, targetUserId);
    const skip = (page - 1) * limit;

    const whereCondition: any = { user_id: targetUserId, level_configuration_id: targetLevelId };

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
        const tier = this.getTierConfigFromCycle(c);
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
  static async getCycleById(cycleId: string) {
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

    if (!cycle) {
      throw new Error(`Matrix cycle ${cycleId} not found`);
    }

    return cycle;
  }

  /**
   * 5. GET /api/matrix/cycles/:id/positions
   */
  static async getCyclePositions(cycleId: string) {
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
  static async getMatrixTree(userId?: string, walletAddress?: string, levelConfigId?: string, depth = 3) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = await this.resolveLevelConfigId(levelConfigId);

    const activeCycle = await prisma.matrixCycle.findFirst({
      where: {
        user_id: targetUserId,
        level_configuration_id: targetLevelId,
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
      rootUserId: targetUserId,
      levelConfigId: targetLevelId,
      cycle: activeCycle,
      depth,
    };
  }
}
