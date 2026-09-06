import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface TreePlacementResult {
  position: any;
  levelDepth: number;
  isLevelNowFull: boolean;
}

/**
 * Visionary Part 2 (3x3 / 20-level forced matrix) — placement and occupancy tracking ONLY.
 *
 * The client's business specification defines Visionary's 300 USDT / 20-level / 15 USDT-unit
 * structure but does not define any reward, recycling, or capping rules for it beyond initial
 * activation (see plan Gap #3 / #1). This service deliberately does not compute or credit any
 * reward — it only tracks who occupies which node, so downstream engineering (placement UI,
 * eventual reward wiring once the client specifies it) isn't blocked. Do not add crediting logic
 * here without an explicit, client-confirmed rule.
 *
 * Uses a logical/count-based representation: VisionaryLevelProgress holds exactly 20 aggregate
 * rows per participant regardless of downline size (capacity = 3^(depth-1), up to ~1.16B at depth
 * 20) — VisionaryTreePosition materializes only actually-occupied nodes, never the full
 * theoretical tree.
 */
export class VisionaryTreeService {
  static readonly MAX_DEPTH = 20;

  /**
   * Idempotently creates the 20 aggregate VisionaryLevelProgress rows for a participant.
   * Safe to call repeatedly (ON CONFLICT DO NOTHING) — e.g. lazily on first placement.
   */
  static async ensureLevelProgressInitialized(rootUserId: string, db: any = prisma): Promise<void> {
    for (let depth = 1; depth <= this.MAX_DEPTH; depth++) {
      // Level n = 3^(n-1): Level 1 = 1, Level 2 = 3, ..., Level 20 = 3^19 = 1,162,261,467.
      const capacity = (3n ** BigInt(depth - 1)).toString();
      await db.$executeRaw`
        INSERT INTO visionary_level_progress (id, user_id, level_depth, capacity, filled_count, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${rootUserId}, ${depth}, ${capacity}::bigint, 0, 'OPEN', NOW(), NOW())
        ON CONFLICT (user_id, level_depth) DO NOTHING;
      `;
    }
  }

  /**
   * Places a member into root's tree at the shallowest depth with an open slot (breadth-first
   * fill, matching the existing X5/X3 matrix placement convention elsewhere in this codebase).
   * Row-locks the target VisionaryLevelProgress row to prevent concurrent over-fill, mirroring
   * DailyCappingService's INSERT-then-SELECT-FOR-UPDATE pattern.
   */
  static async placeInTree(
    rootUserId: string,
    memberUserId: string,
    sponsorUserId: string,
    db: any = prisma
  ): Promise<TreePlacementResult> {
    const executePlacement = async (tx: any) => {
      await this.ensureLevelProgressInitialized(rootUserId, tx);

      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, level_depth, capacity, filled_count
        FROM visionary_level_progress
        WHERE user_id = ${rootUserId} AND status = 'OPEN'
        ORDER BY level_depth ASC
        FOR UPDATE
        LIMIT 1;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new Error(`No open Visionary tree depth found for root ${rootUserId} (all ${this.MAX_DEPTH} levels full)`);
      }

      const target = lockedRows[0];
      const capacity = BigInt(target.capacity);
      const newFilledCount = BigInt(target.filled_count) + 1n;
      const isNowFull = newFilledCount >= capacity;

      const position = await tx.visionaryTreePosition.create({
        data: {
          root_user_id: rootUserId,
          level_depth: target.level_depth,
          member_user_id: memberUserId,
          sponsor_user_id: sponsorUserId,
        },
      });

      await tx.visionaryLevelProgress.update({
        where: { id: target.id },
        data: {
          filled_count: newFilledCount,
          status: isNowFull ? 'FULL' : 'OPEN',
        },
      });

      logger.info(
        {
          rootUserId,
          memberUserId,
          levelDepth: target.level_depth,
          filledCount: newFilledCount.toString(),
          capacity: capacity.toString(),
          isNowFull,
        },
        '[VisionaryTreeService] Placed member in 3x3/20-level tree'
      );

      return { position, levelDepth: target.level_depth, isLevelNowFull: isNowFull };
    };

    if (db !== prisma) {
      return executePlacement(db);
    }
    return prisma.$transaction(executePlacement, { maxWait: 5000, timeout: 10000 });
  }

  /**
   * Read-only summary: 20 rows max, regardless of how large the actual downline is.
   */
  static async getLevelProgress(rootUserId: string, db: any = prisma) {
    return db.visionaryLevelProgress.findMany({
      where: { user_id: rootUserId },
      orderBy: { level_depth: 'asc' },
    });
  }
}
