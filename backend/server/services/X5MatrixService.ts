import { BoosterConfigService, BoosterTierCode } from './BoosterConfigService.js';

export class X5MatrixService {
  static getTierSlotValue(tierCode: BoosterTierCode): number {
    return BoosterConfigService.assertTierConfig(tierCode).subscriptionAmount;
  }

  static calculatePendingSlots(filledSlots: number, slotsPerCycle = 5): number {
    return Math.max(0, slotsPerCycle - filledSlots);
  }

  static calculateCurrentCycleGeneratedAmount(tierCode: BoosterTierCode, filledSlots: number): number {
    return this.getTierSlotValue(tierCode) * filledSlots;
  }
}
