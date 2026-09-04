import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface PlacementSearchResult {
  targetCycle: any;
  placementSource: 'DIRECT' | 'SPILLOVER' | 'RECYCLE';
  sponsorUserId: string;
}

/**
 * PlacementFinderService
 *
 * PLACEMENT RULE ASSUMPTION:
 * 1. First try the direct sponsor's active matrix cycle for the target level.
 * 2. If full or unavailable, search the sponsor's matrix downline breadth-first (BFS).
 * 3. Use the first active cycle found with an available position (filled_positions < total_positions).
 * 4. If no eligible cycle exists in the downline (or if user has no sponsor), use the configured root placement account.
 *
 * This assumption is strictly followed across all X5 Booster Matrix placements.
 */
export class PlacementFinderService {
  /**
   * Finds the exact target MatrixCycle where a member should be placed.
   *
   * @param memberUserId The user ID of the member being placed.
   * @param levelConfigId The level configuration ID.
   * @param db Optional Prisma transaction client.
   */
  static async findPlacementCycle(
    memberUserId: string,
    levelConfigId: string,
    db: any = prisma
  ): Promise<PlacementSearchResult> {
    // 1. Fetch member user details to identify direct sponsor
    const member = await db.user.findUnique({
      where: { id: memberUserId },
      select: { id: true, sponsor_id: true, wallet_address: true },
    });

    let sponsorUserId = member?.sponsor_id || null;

    if (!sponsorUserId) {
      // Fallback: Check referral relations for direct sponsor (depth = 1)
      const refRelation = await db.referralRelation.findFirst({
        where: { referred_user_id: memberUserId, depth: 1, status: 'ACTIVE' },
        select: { sponsor_user_id: true },
      });
      if (refRelation) {
        sponsorUserId = refRelation.sponsor_user_id;
      }
    }

    // STEP 1: Prefer Direct Sponsor's Active Cycle
    if (sponsorUserId) {
      const sponsorCycle = await db.matrixCycle.findFirst({
        where: {
          user_id: sponsorUserId,
          level_configuration_id: levelConfigId,
          status: 'ACTIVE',
        },
        orderBy: { cycle_number: 'desc' },
      });

      if (sponsorCycle && sponsorCycle.filled_positions < sponsorCycle.total_positions) {
        logger.info(
          { memberUserId, sponsorUserId, cycleId: sponsorCycle.id },
          '[PlacementFinder] Found available slot in direct sponsor active cycle'
        );
        return {
          targetCycle: sponsorCycle,
          placementSource: 'DIRECT',
          sponsorUserId,
        };
      }
    }

    // STEP 2: Breadth-First Search (BFS) Down the Sponsor's Matrix Downline
    if (sponsorUserId) {
      const bfsQueue: string[] = [sponsorUserId];
      const visited = new Set<string>([sponsorUserId]);
      let maxSearchNodes = 500; // Safeguard limit to avoid memory leaks or infinite loop

      while (bfsQueue.length > 0 && maxSearchNodes > 0) {
        const currentUserId = bfsQueue.shift()!;
        maxSearchNodes--;

        // Find all members placed inside currentUserId's matrix cycles for this level
        const placedPositions = await db.matrixPosition.findMany({
          where: {
            sponsor_user_id: currentUserId,
            matrix_cycle: {
              level_configuration_id: levelConfigId,
            },
            status: 'CONFIRMED',
          },
          select: { member_user_id: true },
        });

        for (const pos of placedPositions) {
          const childUserId = pos.member_user_id;
          if (childUserId && !visited.has(childUserId) && childUserId !== memberUserId) {
            visited.add(childUserId);

            // Check if child user has an active cycle with space
            const childCycle = await db.matrixCycle.findFirst({
              where: {
                user_id: childUserId,
                level_configuration_id: levelConfigId,
                status: 'ACTIVE',
              },
              orderBy: { cycle_number: 'desc' },
            });

            if (childCycle && childCycle.filled_positions < childCycle.total_positions) {
              logger.info(
                { memberUserId, ancestorUserId: currentUserId, childUserId, cycleId: childCycle.id },
                '[PlacementFinder] Found available slot in downline BFS matrix spillover'
              );
              return {
                targetCycle: childCycle,
                placementSource: 'SPILLOVER',
                sponsorUserId: childUserId,
              };
            }

            bfsQueue.push(childUserId);
          }
        }
      }
    }

    // STEP 3: Fallback to Configured Root Placement Account
    logger.info(
      { memberUserId },
      '[PlacementFinder] Sponsor downline full or unavailable. Fallback to Root Placement Account.'
    );

    // Find system root placement user (e.g. earliest registered user or ADMIN)
    let rootUser = await db.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    if (!rootUser) {
      rootUser = await db.user.findFirst({
        orderBy: { created_at: 'asc' },
        select: { id: true },
      });
    }

    const rootUserId = rootUser?.id || memberUserId;

    // Find or create active matrix cycle for Root Account
    let rootCycle = await db.matrixCycle.findFirst({
      where: {
        user_id: rootUserId,
        level_configuration_id: levelConfigId,
        status: 'ACTIVE',
      },
      orderBy: { cycle_number: 'desc' },
    });

    if (!rootCycle || rootCycle.filled_positions >= rootCycle.total_positions) {
      // Find highest cycle number for root user
      const lastRootCycle = await db.matrixCycle.findFirst({
        where: { user_id: rootUserId, level_configuration_id: levelConfigId },
        orderBy: { cycle_number: 'desc' },
      });

      const nextCycleNum = (lastRootCycle?.cycle_number || 0) + 1;
      const rootCycleId = `mc-${rootUserId}-${levelConfigId}-c${nextCycleNum}`;

      const levelConfig = await db.levelConfiguration.findUnique({
        where: { id: levelConfigId },
        select: { matrix_size: true },
      });
      const matrixSize = levelConfig?.matrix_size || 5;

      rootCycle = await db.matrixCycle.create({
        data: {
          id: rootCycleId,
          user_id: rootUserId,
          level_configuration_id: levelConfigId,
          cycle_number: nextCycleNum,
          total_positions: matrixSize,
          filled_positions: 0,
          status: 'ACTIVE',
          started_at: new Date(),
        },
      });
    }

    return {
      targetCycle: rootCycle,
      placementSource: 'SPILLOVER',
      sponsorUserId: rootUserId,
    };
  }
}
