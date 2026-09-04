import { ethers } from 'ethers';
import crypto from 'crypto';
import { Prisma, NotificationType } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { BoosterRepository } from '../repositories/BoosterRepository.js';
import { NotificationService } from './NotificationService.js';
import { MatrixPlacementService } from './MatrixPlacementService.js';
import { prisma } from '../config/database.js';

const abi = [
  "event UserRegistered(address indexed user, address indexed referrer)",
  "event BoosterUpgraded(address indexed user, uint8 newTier, uint256 amount)",
  "event MainPlanActivated(address indexed user, uint256 totalAmount)"
];

// The deployed SimpleOnBooster contract's BoosterTier enum is fixed forever (no redeploy
// planned — see off-chain-only decision): NONE=0, STARTER=1, BUILDER=2, LEADER=3, CHAMPION=4,
// MAIN_PLAN=5. This numbering is intentionally decoupled from LevelConfiguration.level_order,
// which now starts at Launch=1 and can be renumbered freely without affecting on-chain event
// handling. MAIN_PLAN is the contract's name for what the product now calls Visionary.
const CONTRACT_TIER_TO_SLUG: Record<number, string> = {
  1: 'starter',
  2: 'builder',
  3: 'leader',
  4: 'champion',
  5: 'visionary',
};

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
        await this.handleUserRegistered(userAddr, referrerAddr, event);
      });

      this.contract.on("BoosterUpgraded", async (userAddr: string, newTier: number, amount: bigint, event: any) => {
        logger.info(`[Blockchain] BoosterUpgraded event: user=${userAddr} tier=${newTier}`);
        await this.handleBoosterUpgraded(userAddr, newTier, amount, event);
      });

      this.contract.on("MainPlanActivated", async (userAddr: string, totalAmount: bigint, event: any) => {
        logger.info(`[Blockchain] MainPlanActivated event: user=${userAddr}`);
        await this.handleMainPlanActivated(userAddr, totalAmount, event);
      });

      this.isListening = true;
      logger.info('Blockchain Listener is fully active.');
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to start Blockchain Listener');
    }
  }

  private async getLevelIdByContractTier(contractTier: number): Promise<string | null> {
    const slug = CONTRACT_TIER_TO_SLUG[contractTier];
    if (!slug) return null;
    const plans = await BoosterRepository.getAllActiveLevelConfigs();
    const plan = plans.find(p => p.slug === slug);
    return plan ? plan.id : null;
  }

  private getEventIdentity(event: any, eventName: string) {
    const txHash = (event?.log?.transactionHash || event?.transactionHash || '').toString().toLowerCase();
    const logIndex = event?.log?.index ?? event?.logIndex ?? 0;
    const blockNumber = event?.log?.blockNumber ?? event?.blockNumber ?? null;
    const key = txHash
      ? `chain-${eventName}-${txHash}-${logIndex}`
      : `chain-${eventName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return {
      key,
      txReference: txHash ? `${txHash}:${logIndex}` : key,
      txHash: txHash || null,
      logIndex,
      blockNumber,
    };
  }

  private async createReferralRelations(tx: any, userId: string, sponsorId?: string | null, maxDepth = 13) {
    if (!sponsorId || sponsorId === userId) return;

    await tx.user.updateMany({
      where: { id: userId, sponsor_id: null },
      data: { sponsor_id: sponsorId },
    });

    await tx.referralRelation.upsert({
      where: {
        sponsor_user_id_referred_user_id: {
          sponsor_user_id: sponsorId,
          referred_user_id: userId,
        },
      },
      create: {
        sponsor_user_id: sponsorId,
        referred_user_id: userId,
        depth: 1,
        status: 'ACTIVE',
      },
      update: { depth: 1, status: 'ACTIVE' },
    });

    let currentSponsorId: string | null = sponsorId;
    let depth = 2;
    while (currentSponsorId && depth <= maxDepth) {
      const sponsor = await tx.user.findUnique({
        where: { id: currentSponsorId },
        select: { sponsor_id: true },
      });
      currentSponsorId = sponsor?.sponsor_id || null;
      if (!currentSponsorId || currentSponsorId === userId) break;

      await tx.referralRelation.upsert({
        where: {
          sponsor_user_id_referred_user_id: {
            sponsor_user_id: currentSponsorId,
            referred_user_id: userId,
          },
        },
        create: {
          sponsor_user_id: currentSponsorId,
          referred_user_id: userId,
          depth,
          status: 'ACTIVE',
        },
        update: { depth, status: 'ACTIVE' },
      });
      depth++;
    }
  }

  private async activateLevelFromChain(params: {
    walletAddress: string;
    /** The deployed contract's fixed BoosterTier enum value (1=STARTER..5=MAIN_PLAN) — see CONTRACT_TIER_TO_SLUG. */
    contractTier: number;
    amount: bigint;
    eventName: 'UserRegistered' | 'BoosterUpgraded' | 'MainPlanActivated';
    event: any;
    sponsorAddress?: string;
  }) {
    const cleanWallet = params.walletAddress.toLowerCase();
    const cleanSponsor = params.sponsorAddress?.toLowerCase();
    const eventIdentity = this.getEventIdentity(params.event, params.eventName);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.idempotencyKey.findUnique({
        where: { key: eventIdentity.key },
      });
      if (existingEvent?.status === 'COMPLETED') {
        return { alreadyProcessed: true, userId: existingEvent.user_id, levelId: null };
      }

      await tx.idempotencyKey.upsert({
        where: { key: eventIdentity.key },
        create: {
          key: eventIdentity.key,
          operation: `BLOCKCHAIN_${params.eventName}`,
          request_hash: eventIdentity.key,
          status: 'PROCESSING',
          expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
        update: { status: 'PROCESSING' },
      });

      const targetSlug = CONTRACT_TIER_TO_SLUG[params.contractTier];
      const level = targetSlug
        ? await tx.levelConfiguration.findFirst({
            where: { slug: targetSlug, status: 'ACTIVE' },
            orderBy: { version: 'desc' },
          })
        : null;
      if (!level) {
        throw new Error(`No active level found for contract tier ${params.contractTier}`);
      }

      let sponsorId: string | null = null;
      if (cleanSponsor && cleanSponsor !== ethers.ZeroAddress.toLowerCase()) {
        const sponsor = await tx.user.findUnique({
          where: { wallet_address: cleanSponsor },
          select: { id: true },
        });
        sponsorId = sponsor?.id || null;
      }

      let user = await tx.user.findUnique({ where: { wallet_address: cleanWallet } });
      if (!user) {
        user = await tx.user.create({
          data: {
            wallet_address: cleanWallet,
            referral_code: `SO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            sponsor_id: sponsorId,
            status: 'ACTIVE',
            current_level_id: level.id,
            joined_at: now,
            last_login_at: now,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            current_level_id: level.id,
            joined_at: user.joined_at || now,
          },
        });
      }

      await this.createReferralRelations(tx, user.id, sponsorId);

      const userLevelId = `ul-${user.id}-${level.id}`;
      await tx.userLevel.upsert({
        where: { id: userLevelId },
        create: {
          id: userLevelId,
          user_id: user.id,
          level_configuration_id: level.id,
          status: params.contractTier === 1 ? 'COMPLETED' : 'ACTIVE',
          activated_at: now,
          completed_at: params.contractTier === 1 ? now : null,
          configuration_snapshot: {
            id: level.id,
            name: level.name,
            slug: level.slug,
            levelOrder: level.level_order,
            source: 'BLOCKCHAIN_EVENT',
            eventKey: eventIdentity.key,
          },
        },
        update: {
          status: params.contractTier === 1 ? 'COMPLETED' : 'ACTIVE',
          activated_at: now,
        },
      });

      const eventAmount = Number(ethers.formatUnits(params.amount || 0n, 18));
      const configuredAmount =
        params.contractTier === 1
          ? parseFloat(level.joining_amount.toString())
          : parseFloat(level.upgrade_amount.toString());
      const amount = Number.isFinite(eventAmount) && eventAmount > 0 ? eventAmount : configuredAmount;
      const transaction = await tx.transaction.create({
        data: {
          user_id: user.id,
          transaction_type: params.contractTier === 1 ? 'PLAN_JOIN' : 'UPGRADE',
          amount: new Prisma.Decimal(Number.isFinite(amount) ? amount : 0),
          currency: 'USDT',
          blockchain_transaction_hash: eventIdentity.txReference,
          status: 'COMPLETED',
          description: `${params.eventName} confirmed on-chain`,
          metadata: {
            eventName: params.eventName,
            eventKey: eventIdentity.key,
            transactionHash: eventIdentity.txHash,
            logIndex: eventIdentity.logIndex,
            blockNumber: eventIdentity.blockNumber,
            contractTier: params.contractTier,
          },
          completed_at: now,
        },
      });

      await tx.walletLedger.upsert({
        where: { idempotency_key: `ledger-${eventIdentity.key}` },
        create: {
          user_id: user.id,
          transaction_id: transaction.id,
          entry_type: params.contractTier === 1 ? 'PLAN_JOIN' : 'UPGRADE_DEBIT',
          direction: 'DEBIT',
          amount: new Prisma.Decimal(Number.isFinite(amount) ? amount : 0),
          status: 'COMPLETED',
          idempotency_key: `ledger-${eventIdentity.key}`,
          source_type: 'BLOCKCHAIN_EVENT',
          source_id: eventIdentity.key,
          metadata: {
            eventName: params.eventName,
            transactionHash: eventIdentity.txHash,
            logIndex: eventIdentity.logIndex,
          },
        },
        update: {},
      });

      if (params.contractTier > 1) {
        await tx.upgradeHistory.upsert({
          where: { idempotency_key: `upgrade-${eventIdentity.key}` },
          create: {
            user_id: user.id,
            from_level_id: null,
            to_level_id: level.id,
            upgrade_type: 'PAID',
            status: 'COMPLETED',
            amount: new Prisma.Decimal(Number.isFinite(amount) ? amount : 0),
            eligibility_snapshot: {
              source: 'BLOCKCHAIN_EVENT',
              eventKey: eventIdentity.key,
              contractTier: params.contractTier,
            },
            transaction_id: transaction.id,
            idempotency_key: `upgrade-${eventIdentity.key}`,
            upgraded_at: now,
          },
          update: {
            status: 'COMPLETED',
            transaction_id: transaction.id,
            upgraded_at: now,
          },
        });
      }

      await tx.matrixCycle.upsert({
        where: {
          user_id_level_configuration_id_cycle_number: {
            user_id: user.id,
            level_configuration_id: level.id,
            cycle_number: 1,
          },
        },
        create: {
          id: `mc-${user.id}-${level.id}-c1`,
          user_id: user.id,
          level_configuration_id: level.id,
          cycle_number: 1,
          total_positions: level.matrix_size,
          filled_positions: 0,
          status: 'ACTIVE',
          configuration_snapshot: {
            id: level.id,
            name: level.name,
            slug: level.slug,
            matrix_size: level.matrix_size,
            source: 'BLOCKCHAIN_EVENT',
          },
          started_at: now,
        },
        update: { status: 'ACTIVE' },
      });

      await tx.idempotencyKey.update({
        where: { key: eventIdentity.key },
        data: {
          user_id: user.id,
          status: 'COMPLETED',
          response_data: { userId: user.id, levelId: level.id },
        },
      });

      return { alreadyProcessed: false, userId: user.id, levelId: level.id };
    });

    if (!result.alreadyProcessed && result.levelId) {
      try {
        await MatrixPlacementService.placeUserInMatrix(result.userId!, result.levelId);
      } catch (e: any) {
        logger.warn({ error: e.message }, `Matrix placement error during ${params.eventName}`);
      }
    }

    return result;
  }

  private async handleUserRegistered(walletAddress: string, referrerAddress: string, event: any) {
    try {
      const result = await this.activateLevelFromChain({
        walletAddress,
        sponsorAddress: referrerAddress,
        contractTier: 1,
        amount: 0n,
        eventName: 'UserRegistered',
        event,
      });

      if (!result.alreadyProcessed && result.userId) {
        try {
          await NotificationService.createNotification({
            userId: result.userId,
            type: NotificationType.PLAN_ACTIVATED,
            title: 'Welcome to SimpleON!',
            message: `Your Starter Booster Plan is now fully active.`,
            data: { levelId: result.levelId },
          });
        } catch (e) {}
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Error in handleUserRegistered');
    }
  }

  private async handleBoosterUpgraded(walletAddress: string, newTier: number, amount: bigint, event: any) {
    try {
      const result = await this.activateLevelFromChain({
        walletAddress,
        contractTier: newTier,
        amount,
        eventName: 'BoosterUpgraded',
        event,
      });

      if (!result.alreadyProcessed && result.userId) {
      try {
        await NotificationService.createNotification({
          userId: result.userId,
          type: NotificationType.PLAN_ACTIVATED,
          title: 'Booster Upgraded',
          message: `Congratulations! You have been upgraded to Tier ${newTier}.`,
          data: { levelId: result.levelId, amount: ethers.formatUnits(amount, 18) },
        });
      } catch (e) {}
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Error in handleBoosterUpgraded');
    }
  }

  private async handleMainPlanActivated(walletAddress: string, amount: bigint, event: any) {
    try {
      const user = await AuthRepository.findUserByWalletAddress(walletAddress);
      if (!user) {
        logger.warn(`MainPlanActivated: user ${walletAddress} not found in DB`);
        return;
      }

      const visionaryId = await this.getLevelIdByContractTier(5); // contract's MAIN_PLAN slot === Visionary
      if (visionaryId) {
        await AuthRepository.updateUser(user.id, { current_level_id: visionaryId });
      }

      try {
        await NotificationService.createNotification({
          userId: user.id,
          type: NotificationType.PLAN_ACTIVATED,
          title: 'Visionary Activated',
          message: `Your Visionary tier is now active!`,
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
