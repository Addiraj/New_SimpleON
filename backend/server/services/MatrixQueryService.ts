import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

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
  private static async resolveLevelConfigId(levelConfigId?: string): Promise<string> {
    if (levelConfigId) {
      const found = await prisma.levelConfiguration.findFirst({
        where: {
          OR: [
            { id: levelConfigId },
            { slug: levelConfigId.toLowerCase().trim() },
          ],
        },
        select: { id: true },
      });
      if (found) return found.id;
    }

    const level = await prisma.levelConfiguration.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { level_order: 'asc' },
      select: { id: true },
    });

    if (level) return level.id;
    return 'default-level-1';
  }

  /**
   * 1. GET /api/matrix/summary
   * Aggregates X5 Matrix statistics for a user.
   */
  static async getSummary(userId?: string, walletAddress?: string, levelConfigId?: string) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = levelConfigId ? await this.resolveLevelConfigId(levelConfigId) : undefined;

    const whereClause: any = { user_id: targetUserId };
    if (targetLevelId) {
      whereClause.level_configuration_id = targetLevelId;
    }

    // Fetch user cycles
    const cycles = await prisma.matrixCycle.findMany({
      where: whereClause,
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

    // Calculate income based on level configuration joining amount * 0.15 * 0.8
    let totalGeneratedEarnings = 0;
    cycles.forEach((c) => {
      const levelCost = parseFloat(c.level_configuration?.joining_amount?.toString() || '100');
      const slotVal = levelCost * 0.15;
      const rate = c.cycle_number === 1 ? 0.4 : 0.8;
      totalGeneratedEarnings += slotVal * rate * c.filled_positions;
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
        joiningAmount: parseFloat(c.level_configuration?.joining_amount?.toString() || '100'),
        startedAt: c.started_at,
        completedAt: c.completed_at,
      })),
    };
  }

  /**
   * 2. GET /api/matrix/current
   * Returns current active cycle for user with 5 positions formatted for UI.
   */
  static async getCurrentCycle(userId?: string, walletAddress?: string, levelConfigId?: string) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const targetLevelId = await this.resolveLevelConfigId(levelConfigId);

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

    const joiningAmount = parseFloat(
      activeCycle?.level_configuration?.joining_amount?.toString() || '100'
    );
    const slotValue = joiningAmount * 0.15;
    const cycleNum = activeCycle?.cycle_number || 1;
    const netPayoutRate = cycleNum === 1 ? 0.4 : 0.8;

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
          tierAmount: slotValue,
          incomeGenerated: slotValue * netPayoutRate,
          reTopupAmount: slotValue * 0.2,
          upgradeWalletAmount: cycleNum === 1 ? slotValue * 0.4 : 0,
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
      levelName: activeCycle?.level_configuration?.name || 'Booster 1',
      levelSlug: activeCycle?.level_configuration?.slug || 'booster-1',
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
    page = 1,
    limit = 10
  ) {
    const targetUserId = await this.resolveUserId(userId, walletAddress);
    const skip = (page - 1) * limit;

    const whereCondition: any = { user_id: targetUserId };
    if (levelConfigId) {
      whereCondition.level_configuration_id = levelConfigId;
    }

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
        const joiningAmount = parseFloat(c.level_configuration?.joining_amount?.toString() || '100');
        const slotValue = joiningAmount * 0.15;
        const rate = c.cycle_number === 1 ? 0.4 : 0.8;
        const earnings = c.filled_positions * slotValue * rate;

        return {
          cycle: c.cycle_number,
          id: c.id,
          status: c.status,
          filledSlots: c.filled_positions,
          totalSlots: c.total_positions,
          earnings,
          levelName: c.level_configuration?.name || 'Level 1',
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
