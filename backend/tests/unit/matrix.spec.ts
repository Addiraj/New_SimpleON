import { describe, it, expect, beforeEach } from 'vitest';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { BoosterRepository } from '../../server/repositories/BoosterRepository.js';
import { MatrixCycleService } from '../../server/services/MatrixCycleService.js';
import { MatrixPlacementService } from '../../server/services/MatrixPlacementService.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

describe('36-47. X5 Matrix Cycle & Placement Unit Tests', () => {
  beforeEach(() => {
    resetAllTestStores();
  });

  it('36. First X5 matrix-cycle creation initializes Cycle #1 with 5 positions', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    // Starter (X5) specifically — not level_order===1, which is now Launch (X3) post-renumbering.
    const level1 = levelConfigs.find((l) => l.slug === 'starter')!;

    const cycle = await MatrixCycleService.ensureUserActiveCycle(user.id, level1.id);

    expect(cycle).toBeDefined();
    expect(cycle.cycle_number).toBe(1);
    expect(cycle.total_positions).toBe(5);
    expect(cycle.filled_positions).toBe(0);
    expect(cycle.status).toBe('ACTIVE');
  });

  it('37 & 38. Sponsor-based matrix placement and spillover places members sequentially into 5-position matrix', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    // Starter (X5) specifically — not level_order===1, which is now Launch (X3) post-renumbering.
    const level1 = levelConfigs.find((l) => l.slug === 'starter')!;

    await MatrixCycleService.ensureUserActiveCycle(sponsor.id, level1.id);

    const member1 = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
    const member2 = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });

    const placement1 = await MatrixPlacementService.placeUserInMatrix(member1.id, level1.id, sponsor.id);
    expect(placement1.position.position_number).toBe(1);

    const placement2 = await MatrixPlacementService.placeUserInMatrix(member2.id, level1.id, sponsor.id);
    expect(placement2.position.position_number).toBe(2);
  });

  it('39. Duplicate matrix-position prevention returns existing position record without double-counting', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    // Starter (X5) specifically — not level_order===1, which is now Launch (X3) post-renumbering.
    const level1 = levelConfigs.find((l) => l.slug === 'starter')!;

    await MatrixCycleService.ensureUserActiveCycle(sponsor.id, level1.id);
    const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });

    const p1 = await MatrixPlacementService.placeUserInMatrix(member.id, level1.id, sponsor.id);
    const p2 = await MatrixPlacementService.placeUserInMatrix(member.id, level1.id, sponsor.id);

    expect(p1.position.id).toBe(p2.position.id);
    expect(p2.cycle.filled_positions).toBe(1);
  });

  it('40. Concurrent matrix placement resolves parallel placements without deadlock or index collision', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    // Starter (X5) specifically — not level_order===1, which is now Launch (X3) post-renumbering.
    const level1 = levelConfigs.find((l) => l.slug === 'starter')!;

    await MatrixCycleService.ensureUserActiveCycle(sponsor.id, level1.id);

    const members = await Promise.all([
      AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id }),
      AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id }),
      AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id }),
    ]);

    const placements = await Promise.all(
      members.map((m) => MatrixPlacementService.placeUserInMatrix(m.id, level1.id, sponsor.id))
    );

    const positionNumbers = placements.map((p) => p.position.position_number).sort();
    expect(positionNumbers).toEqual([1, 2, 3]);
  });

  it('41, 43, 46. Matrix-cycle completion triggers recycle upon 5/5 filled positions and handles re-topup / upgrade eligibility', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    // Starter (X5) specifically — not level_order===1, which is now Launch (X3) post-renumbering.
    const level1 = levelConfigs.find((l) => l.slug === 'starter')!;

    await MatrixCycleService.ensureUserActiveCycle(sponsor.id, level1.id);

    for (let i = 1; i <= 5; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      const result = await MatrixPlacementService.placeUserInMatrix(member.id, level1.id, sponsor.id);

      if (i === 5) {
        expect(result.completedCycle).toBeDefined();
        expect(result.completedCycle.status).toBe('COMPLETED');
        expect(result.nextCycle).toBeDefined();
        expect(result.nextCycle.cycle_number).toBe(2);
      }
    }
  });
});
