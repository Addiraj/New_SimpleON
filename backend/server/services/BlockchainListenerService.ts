import { ethers } from 'ethers';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { BoosterRepository } from '../repositories/BoosterRepository.js';
import { NotificationService } from './NotificationService.js';
import { NotificationType } from '@prisma/client';
import { MatrixPlacementService } from './MatrixPlacementService.js';

const abi = [
  "event UserRegistered(address indexed user, address indexed referrer)",
  "event BoosterUpgraded(address indexed user, uint8 newTier, uint256 amount)",
  "event MainPlanActivated(address indexed user, uint256 totalAmount)"
];

export class BlockchainListenerService {
  private provider: ethers.WebSocketProvider | ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private isListening = false;

  public async start() {
    if (this.isListening) return;

    const rpcUrl = env.BSC_TESTNET_WSS || env.BSC_TESTNET_RPC || 'wss://bsc-testnet.public.blastapi.io';
    const contractAddress = env.SIMPLEON_BOOSTER_ADDRESS;

    if (!contractAddress) {
      logger.warn('SIMPLEON_BOOSTER_ADDRESS is not set. Blockchain listener will not start.');
      return;
    }

    try {
      logger.info(`Starting Blockchain Listener on ${rpcUrl}...`);
      if (rpcUrl.startsWith('wss')) {
        this.provider = new ethers.WebSocketProvider(rpcUrl);
      } else {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      }

      this.contract = new ethers.Contract(contractAddress, abi, this.provider);

      this.contract.on("UserRegistered", async (userAddr: string, referrerAddr: string, event: any) => {
        logger.info(`[Blockchain] UserRegistered event: user=${userAddr} referrer=${referrerAddr}`);
        await this.handleUserRegistered(userAddr, referrerAddr);
      });

      this.contract.on("BoosterUpgraded", async (userAddr: string, newTier: number, amount: bigint, event: any) => {
        logger.info(`[Blockchain] BoosterUpgraded event: user=${userAddr} tier=${newTier}`);
        await this.handleBoosterUpgraded(userAddr, newTier, amount);
      });

      this.contract.on("MainPlanActivated", async (userAddr: string, totalAmount: bigint, event: any) => {
        logger.info(`[Blockchain] MainPlanActivated event: user=${userAddr}`);
        await this.handleMainPlanActivated(userAddr, totalAmount);
      });

      this.isListening = true;
      logger.info('Blockchain Listener is fully active.');
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to start Blockchain Listener');
    }
  }

  private async getLevelIdByOrder(order: number): Promise<string | null> {
    const plans = await BoosterRepository.getAllActiveLevelConfigs();
    const plan = plans.find(p => p.level_order === order);
    return plan ? plan.id : null;
  }

  private async handleUserRegistered(walletAddress: string, referrerAddress: string) {
    try {
      let user = await AuthRepository.findUserByWalletAddress(walletAddress);
      
      let sponsorId: string | undefined;
      if (referrerAddress && referrerAddress !== ethers.ZeroAddress) {
        const sponsor = await AuthRepository.findUserByWalletAddress(referrerAddress);
        if (sponsor) {
          sponsorId = sponsor.id;
        }
      }

      if (!user) {
        user = await AuthRepository.createUser({ walletAddress, sponsorId });
      }

      const starterLevelId = await this.getLevelIdByOrder(1);
      if (starterLevelId) {
        await AuthRepository.updateUser(user.id, { status: 'ACTIVE', current_level_id: starterLevelId });
        
        try {
          await MatrixPlacementService.placeUserInMatrix(user.id, starterLevelId);
        } catch (e: any) {
           logger.warn({ error: e.message }, 'Matrix placement error during UserRegistered');
        }

        try {
          await NotificationService.createNotification({
            userId: user.id,
            type: NotificationType.PLAN_ACTIVATED,
            title: 'Welcome to SimpleON!',
            message: `Your Starter Booster Plan is now fully active.`,
            data: { levelId: starterLevelId },
          });
        } catch (e) {}
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Error in handleUserRegistered');
    }
  }

  private async handleBoosterUpgraded(walletAddress: string, newTier: number, amount: bigint) {
    try {
      const user = await AuthRepository.findUserByWalletAddress(walletAddress);
      if (!user) {
        logger.warn(`BoosterUpgraded: user ${walletAddress} not found in DB`);
        return;
      }

      const targetLevelId = await this.getLevelIdByOrder(newTier);
      if (!targetLevelId) {
        logger.warn(`BoosterUpgraded: no active plan found for order ${newTier}`);
        return;
      }

      await AuthRepository.updateUser(user.id, { current_level_id: targetLevelId });
      
      try {
        await MatrixPlacementService.placeUserInMatrix(user.id, targetLevelId);
      } catch (e: any) {
         logger.warn({ error: e.message }, 'Matrix placement error during BoosterUpgraded');
      }

      try {
        await NotificationService.createNotification({
          userId: user.id,
          type: NotificationType.PLAN_ACTIVATED,
          title: 'Booster Upgraded',
          message: `Congratulations! You have been upgraded to Tier ${newTier}.`,
          data: { levelId: targetLevelId, amount: ethers.formatUnits(amount, 18) },
        });
      } catch (e) {}
    } catch (err: any) {
      logger.error({ error: err.message }, 'Error in handleBoosterUpgraded');
    }
  }

  private async handleMainPlanActivated(walletAddress: string, amount: bigint) {
    try {
      const user = await AuthRepository.findUserByWalletAddress(walletAddress);
      if (!user) {
        logger.warn(`MainPlanActivated: user ${walletAddress} not found in DB`);
        return;
      }

      const mainPlanId = await this.getLevelIdByOrder(5); // Assuming 5 is MAIN PLAN
      if (mainPlanId) {
        await AuthRepository.updateUser(user.id, { current_level_id: mainPlanId });
      }

      try {
        await NotificationService.createNotification({
          userId: user.id,
          type: NotificationType.PLAN_ACTIVATED,
          title: 'Main Plan Activated',
          message: `Your Main Plan is now active!`,
          data: { amount: ethers.formatUnits(amount, 18) },
        });
      } catch (e) {}
    } catch (err: any) {
      logger.error({ error: err.message }, 'Error in handleMainPlanActivated');
    }
  }

  public stop() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    this.isListening = false;
  }
}

export const blockchainListenerService = new BlockchainListenerService();
