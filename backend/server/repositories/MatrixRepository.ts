import { prisma, isDatabaseAvailable } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AuthRepository } from './AuthRepository.js';
import { ReferralRepository } from './ReferralRepository.js';

export interface MatrixCycleRecord {
  id: string;
  user_id: string;
  level_configuration_id: string;
  cycle_number: number;
  total_positions: number;
  filled_positions: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  next_cycle_id?: string | null;
  started_at: Date;
  completed_at?: Date | null;
  configuration_snapshot?: any;
}

export interface MatrixPositionRecord {
  id: string;
  matrix_cycle_id: string;
  member_user_id: string;
  position_number: number;
  placement_source: 'DIRECT' | 'SPILLOVER' | 'RECYCLE';
  sponsor_user_id: string;
  created_at: Date;
}

const memoryCycles = new Map<string, MatrixCycleRecord>();
const memoryPositions = new Map<string, MatrixPositionRecord>();

export class MatrixRepository {
  static resetMemoryStore(): void {
    memoryCycles.clear();
    memoryPositions.clear();
  }

  static async findActiveCycle(userId: string, levelConfigId: string, db: any = prisma): Promise<MatrixCycleRecord | null> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const cycle = await db.matrixCycle.findFirst({
        where: {
          user_id: userId,
          level_configuration_id: levelConfigId,
          status: 'ACTIVE',
        },
        orderBy: { cycle_number: 'desc' },
      });
      if (cycle) return cycle as unknown as MatrixCycleRecord;
    } catch (err) {
      // Ignore DB errors
    }

    for (const c of memoryCycles.values()) {
      if (c.user_id === userId && c.level_configuration_id === levelConfigId && c.status === 'ACTIVE') {
        return c;
      }
    }
    return null;
  }

  static async findCycleById(cycleId: string, db: any = prisma): Promise<MatrixCycleRecord | null> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const cycle = await db.matrixCycle.findUnique({
        where: { id: cycleId },
      });
      if (cycle) return cycle as unknown as MatrixCycleRecord;
    } catch (err) {
      if (memoryCycles.has(cycleId)) return memoryCycles.get(cycleId)!;
    }
    return null;
  }

  static async createCycle(data: {
    userId: string;
    levelConfigId: string;
    cycleNumber: number;
    totalPositions?: number;
  }, db: any = prisma): Promise<MatrixCycleRecord> {
    const cycleId = `mc-${data.userId}-${data.levelConfigId}-c${data.cycleNumber}`;
    const now = new Date();
    const totalPositions = data.totalPositions || 5;

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const cycle = await db.matrixCycle.create({
        data: {
          id: cycleId,
          user_id: data.userId,
          level_configuration_id: data.levelConfigId,
          cycle_number: data.cycleNumber,
          total_positions: totalPositions,
          filled_positions: 0,
          status: 'ACTIVE',
          started_at: now,
        },
      });
      return cycle as unknown as MatrixCycleRecord;
    } catch (err) {
      const record: MatrixCycleRecord = {
        id: cycleId,
        user_id: data.userId,
        level_configuration_id: data.levelConfigId,
        cycle_number: data.cycleNumber,
        total_positions: totalPositions,
        filled_positions: 0,
        status: 'ACTIVE',
        started_at: now,
      };
      memoryCycles.set(cycleId, record);
      return record;
    }
  }

  static async findPositionsByCycleId(cycleId: string, db: any = prisma): Promise<MatrixPositionRecord[]> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const positions = await db.matrixPosition.findMany({
        where: { matrix_cycle_id: cycleId },
        orderBy: { position_number: 'asc' },
      });
      return positions as unknown as MatrixPositionRecord[];
    } catch (err) {
      const list: MatrixPositionRecord[] = [];
      for (const p of memoryPositions.values()) {
        if (p.matrix_cycle_id === cycleId) list.push(p);
      }
      return list.sort((a, b) => a.position_number - b.position_number);
    }
  }

  static async placeUserInMemory(
    memberUserId: string,
    levelConfigId: string,
    customSponsorId?: string
  ): Promise<{
    position: MatrixPositionRecord;
    cycle: MatrixCycleRecord;
    completedCycle: MatrixCycleRecord | null;
    nextCycle: MatrixCycleRecord | null;
  }> {
    const now = new Date();

    // 1. Ensure member active cycle exists
    let memberCycle = await this.findActiveCycle(memberUserId, levelConfigId);
    if (!memberCycle) {
      memberCycle = await this.createCycle({
        userId: memberUserId,
        levelConfigId,
        cycleNumber: 1,
      });
    }

    // 2. Find sponsor
    const user = await AuthRepository.findUserById(memberUserId);
    const sponsorUserId = customSponsorId || user?.sponsor_id || memberUserId;

    // 3. Find target cycle (sponsor active cycle, downline active cycle, or member cycle)
    let targetCycle = await this.findActiveCycle(sponsorUserId, levelConfigId);
    let placementSource: 'DIRECT' | 'SPILLOVER' | 'RECYCLE' = 'DIRECT';

    if (!targetCycle || targetCycle.filled_positions >= targetCycle.total_positions) {
      // Find downline active cycle
      const referrals = await ReferralRepository.findReferralsBySponsorId(sponsorUserId);
      for (const ref of referrals) {
        const refCycle = await this.findActiveCycle(ref.referred_user_id, levelConfigId);
        if (refCycle && refCycle.filled_positions < refCycle.total_positions) {
          targetCycle = refCycle;
          placementSource = 'SPILLOVER';
          break;
        }
      }
    }

    if (!targetCycle || targetCycle.filled_positions >= targetCycle.total_positions) {
      targetCycle = memberCycle;
      placementSource = 'DIRECT';
    }

    // 4. Duplicate prevention check
    for (const pos of memoryPositions.values()) {
      if (pos.matrix_cycle_id === targetCycle.id && pos.member_user_id === memberUserId) {
        return {
          position: pos,
          cycle: targetCycle,
          completedCycle: null,
          nextCycle: null,
        };
      }
    }

    // 5. Place member
    const nextPositionNum = targetCycle.filled_positions + 1;
    const posId = `mp-${targetCycle.id}-${nextPositionNum}`;

    const position: MatrixPositionRecord = {
      id: posId,
      matrix_cycle_id: targetCycle.id,
      member_user_id: memberUserId,
      position_number: nextPositionNum,
      placement_source: placementSource,
      sponsor_user_id: sponsorUserId,
      created_at: now,
    };
    memoryPositions.set(posId, position);

    targetCycle.filled_positions += 1;

    let completedCycle: MatrixCycleRecord | null = null;
    let nextCycle: MatrixCycleRecord | null = null;

    if (targetCycle.filled_positions >= targetCycle.total_positions) {
      targetCycle.status = 'COMPLETED';
      targetCycle.completed_at = now;
      completedCycle = targetCycle;

      // Create Cycle N+1
      nextCycle = await this.createCycle({
        userId: targetCycle.user_id,
        levelConfigId,
        cycleNumber: targetCycle.cycle_number + 1,
      });
      targetCycle.next_cycle_id = nextCycle.id;
    }

    return {
      position,
      cycle: targetCycle,
      completedCycle,
      nextCycle,
    };
  }
}
