import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../server/config/database.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { VisionaryTreeService } from '../../server/services/VisionaryTreeService.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

describe('Visionary 3x3 / 20-level tree — placement & occupancy skeleton', () => {
  beforeEach(() => {
    resetAllTestStores();
  });

  it('initializes exactly 20 VisionaryLevelProgress rows for a participant, with capacity = 3^(depth-1)', async () => {
    const rootWallet = createTestWallet();
    const root = await AuthRepository.createUser({ walletAddress: rootWallet.address });

    await VisionaryTreeService.ensureLevelProgressInitialized(root.id);

    const rows = await VisionaryTreeService.getLevelProgress(root.id);
    expect(rows.length).toBe(20);
    expect(rows.map((r: any) => r.level_depth)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(BigInt(rows[0].capacity)).toBe(1n);
    expect(BigInt(rows[19].capacity)).toBe(3n ** 19n);
    expect(rows.every((r: any) => r.status === 'OPEN' && BigInt(r.filled_count) === 0n)).toBe(true);
  });

  it('is idempotent: calling ensureLevelProgressInitialized twice does not duplicate rows', async () => {
    const rootWallet = createTestWallet();
    const root = await AuthRepository.createUser({ walletAddress: rootWallet.address });

    await VisionaryTreeService.ensureLevelProgressInitialized(root.id);
    await VisionaryTreeService.ensureLevelProgressInitialized(root.id);

    const rows = await VisionaryTreeService.getLevelProgress(root.id);
    expect(rows.length).toBe(20);
  });

  it('fills depth 1 (capacity 1) then depth 2 (capacity 3) before spilling into depth 3, and never materializes more VisionaryTreePosition rows than actual placements', async () => {
    const rootWallet = createTestWallet();
    const root = await AuthRepository.createUser({ walletAddress: rootWallet.address });

    const depths: number[] = [];
    for (let i = 0; i < 5; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: root.id });
      const result = await VisionaryTreeService.placeInTree(root.id, member.id, root.id);
      depths.push(result.levelDepth);
    }

    // 1st placement fills depth 1 (capacity 1); 2nd-4th fill depth 2 (capacity 3); 5th spills into depth 3.
    expect(depths).toEqual([1, 2, 2, 2, 3]);

    const positions = await prisma.visionaryTreePosition.findMany({ where: { root_user_id: root.id } });
    expect(positions.length).toBe(5); // exactly the placements made — no bulk/synthetic rows

    const progress = await VisionaryTreeService.getLevelProgress(root.id);
    expect(progress.length).toBe(20); // still only 20 aggregate rows, regardless of downline size
    const depth1 = progress.find((r: any) => r.level_depth === 1);
    const depth2 = progress.find((r: any) => r.level_depth === 2);
    const depth3 = progress.find((r: any) => r.level_depth === 3);
    expect(depth1.status).toBe('FULL');
    expect(BigInt(depth1.filled_count)).toBe(1n);
    expect(depth2.status).toBe('FULL');
    expect(BigInt(depth2.filled_count)).toBe(3n);
    expect(depth3.status).toBe('OPEN');
    expect(BigInt(depth3.filled_count)).toBe(1n);
  });

  it('does not credit any reward or ledger entry for tree placement (no payout rules defined by spec)', async () => {
    const rootWallet = createTestWallet();
    const root = await AuthRepository.createUser({ walletAddress: rootWallet.address });
    const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: root.id });

    await VisionaryTreeService.placeInTree(root.id, member.id, root.id);

    const ledgers = await prisma.walletLedger.findMany({ where: { user_id: root.id } });
    expect(ledgers.length).toBe(0);
  });
});
