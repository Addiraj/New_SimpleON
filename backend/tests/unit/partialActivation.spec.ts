import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../server/config/database.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { BoosterRepository } from '../../server/repositories/BoosterRepository.js';
import { PartialActivationService } from '../../server/services/PartialActivationService.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

/**
 * PartialActivationService is a standalone, independently-tested accumulator engine — NOT wired
 * into the live matrix-placement crediting flow (see the service's own doc comment for why:
 * the client spec is ambiguous about whether reaching the funding threshold bypasses or must
 * coexist with the existing qualification-gated AutoUpgradeService). These tests exercise the
 * engine in isolation, calling recordContribution() directly.
 */
describe('PartialActivationService — standalone accumulator engine (not yet wired)', () => {
  beforeEach(() => {
    resetAllTestStores();
  });

  async function getBuilderLevel() {
    const levels = await BoosterRepository.getAllActiveLevelConfigs();
    return levels.find((l) => l.slug === 'builder')!;
  }

  it('accumulates Starter->Builder contributions (2+8 pattern) across 5 units, activating exactly at the 40 USDT threshold', async () => {
    const builder = await getBuilderLevel();
    const wallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: wallet.address });

    let result: any = null;
    for (let i = 1; i <= 5; i++) {
      result = await PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', `pos-${i}`);
      if (i < 5) {
        expect(result.activated).toBe(false);
        expect(result.accumulated).toBe(8 * i);
      }
    }

    expect(result.activated).toBe(true);
    expect(result.accumulated).toBe(40);
    expect(result.threshold).toBe(40);

    const updatedUser = await AuthRepository.findUserById(user.id);
    expect(updatedUser?.current_level_id).toBe(builder.id);

    const cycle = await prisma.matrixCycle.findUnique({ where: { id: `mc-${user.id}-${builder.id}-c1` } });
    expect(cycle).toBeDefined();
    expect(cycle?.total_positions).toBe(5);
  });

  it('is idempotent: replaying the same (sourceType, sourceId) contribution never double-counts', async () => {
    const builder = await getBuilderLevel();
    const wallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: wallet.address });

    await PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', 'pos-1');
    const second = await PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', 'pos-1');

    expect(second.accumulated).toBe(8);

    const ledgerCount = await prisma.walletLedger.count({
      where: { entry_type: 'PARTIAL_ACTIVATION_CREDIT', source_id: 'pos-1', user_id: user.id },
    });
    expect(ledgerCount).toBe(1);
  });

  it('never activates twice: contributions after the threshold is reached do not re-trigger activation or accumulate further', async () => {
    const builder = await getBuilderLevel();
    const wallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: wallet.address });

    for (let i = 1; i <= 5; i++) {
      await PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', `pos-${i}`);
    }
    const extra = await PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', 'pos-6');

    expect(extra.activated).toBe(true);
    expect(extra.accumulated).toBe(40); // not 48 — post-completion contributions are not accumulated further

    const upgradeCount = await prisma.upgradeHistory.count({
      where: { idempotency_key: `partial-activation-${user.id}-${builder.id}` },
    });
    expect(upgradeCount).toBe(1);
  });

  it('concurrent contributions racing to cross the threshold activate exactly once (no double-activation)', async () => {
    const builder = await getBuilderLevel();
    const wallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: wallet.address });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        PartialActivationService.recordContribution(user.id, builder.id, 8, 'test-position', `concurrent-${i}`)
      )
    );

    const activatedCount = results.filter((r) => r.activated).length;
    // At least one call must report activation; regardless of how many see it (race timing),
    // the UpgradeHistory row — the actual activation event — must exist exactly once.
    expect(activatedCount).toBeGreaterThanOrEqual(1);

    const upgradeHistoryRows = await prisma.upgradeHistory.count({
      where: { idempotency_key: `partial-activation-${user.id}-${builder.id}` },
    });
    expect(upgradeHistoryRows).toBe(1);

    const partial = await prisma.partialActivation.findUnique({
      where: { user_id_target_level_configuration_id: { user_id: user.id, target_level_configuration_id: builder.id } },
    });
    expect(parseFloat(partial!.accumulated_amount.toString())).toBe(40);
  });
});
