import crypto from 'crypto';
import { ethers } from 'ethers';
import { NotificationType } from '@prisma/client';
import { PaymentRepository, PaymentIntentRecord } from '../repositories/PaymentRepository.js';
import { BoosterRepository, LevelConfigRecord } from '../repositories/BoosterRepository.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { MatrixPlacementService } from './MatrixPlacementService.js';
import { NotificationService } from './NotificationService.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';

export interface FormattedPaymentIntent {
  id: string;
  paymentReference: string;
  paymentType: 'JOIN' | 'UPGRADE' | 'RETOPUP' | 'PARTIAL_UPGRADE';
  expectedAmount: string;
  tokenAddress: string;
  receiverAddress: string;
  networkId: string;
  expiresAt: string;
  status: string;
  level?: {
    id: string;
    name: string;
    slug: string;
    levelOrder: number;
  };
  createdAt: string;
}

export class PaymentService {
  /**
   * Helper to format a raw PaymentIntentRecord for API responses
   */
  private static formatIntentResponse(
    intent: PaymentIntentRecord,
    levelConfig?: LevelConfigRecord | null
  ): FormattedPaymentIntent {
    return {
      id: intent.id,
      paymentReference: intent.payment_reference,
      paymentType: intent.payment_type,
      expectedAmount: intent.expected_amount,
      tokenAddress: intent.token_address || env.MOCK_USDT_ADDRESS,
      receiverAddress: intent.receiver_address || env.SIMPLEON_BOOSTER_ADDRESS,
      networkId: intent.network_id || '97',
      expiresAt: intent.expires_at.toISOString(),
      status: intent.status,
      ...(levelConfig && {
        level: {
          id: levelConfig.id,
          name: levelConfig.name,
          slug: levelConfig.slug,
          levelOrder: levelConfig.level_order,
        },
      }),
      createdAt: intent.created_at.toISOString(),
    };
  }

  /**
   * Helper to resolve target level configuration from input
   */
  private static async resolveLevelConfig(params: {
    levelId?: string;
    levelOrder?: number;
    levelSlug?: string;
    defaultOrder?: number;
  }): Promise<LevelConfigRecord> {
    const allPlans = await BoosterRepository.getAllActiveLevelConfigs();

    if (params.levelId) {
      const match = allPlans.find((p) => p.id === params.levelId);
      if (match) return match;
    }

    if (params.levelSlug) {
      const match = allPlans.find((p) => p.slug.toLowerCase() === params.levelSlug!.toLowerCase());
      if (match) return match;
    }

    if (params.levelOrder !== undefined && params.levelOrder !== null) {
      const match = allPlans.find((p) => p.level_order === Number(params.levelOrder));
      if (match) return match;
      throw new AppError(`Level configuration not found for requested plan`, 404);
    }

    const defaultOrder = params.defaultOrder || 1;
    const defaultMatch = allPlans.find((p) => p.level_order === defaultOrder);
    if (!defaultMatch) {
      throw new AppError(`Level configuration not found for requested plan`, 404);
    }
    return defaultMatch;
  }

  /**
   * 1. Create Join Payment Intent
   */
  static async createJoinIntent(
    userId: string,
    options?: { levelSlug?: string; levelOrder?: number; levelId?: string }
  ): Promise<FormattedPaymentIntent> {
    // 1. Authenticate & validate user eligibility
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent duplicate joins
    if (user.current_level_id) {
      throw new AppError('User is already active', 400); // Handled by controller to return 200
    }

    // 2. Load target level (Order 1 / Starter by default)
    const targetLevel = await this.resolveLevelConfig({
      ...options,
      defaultOrder: 1,
    });

    // 3. Check for existing active, unexpired pending intent (Idempotency / Prevent Duplicate)
    const existingIntent = await PaymentRepository.findActiveIntent(userId, 'JOIN', targetLevel.id);
    if (existingIntent) {
      logger.info({ userId, intentId: existingIntent.id }, 'Returning active existing JOIN payment intent');
      return this.formatIntentResponse(existingIntent, targetLevel);
    }

    // 4. Amount loaded strictly from database (never from frontend!)
    const expectedAmount = targetLevel.joining_amount;
    const tokenAddress = env.MOCK_USDT_ADDRESS;
    const receiverAddress = env.SIMPLEON_BOOSTER_ADDRESS;
    const networkId = '97';

    // 5. Create unique reference & expiration (30 minutes)
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const paymentReference = `PAY-JOIN-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    // 6. Store pending intent in DB
    const newIntent = await PaymentRepository.createIntent({
      userId,
      levelConfigurationId: targetLevel.id,
      paymentReference,
      paymentType: 'JOIN',
      expectedAmount,
      tokenAddress,
      receiverAddress,
      networkId,
      expiresAt,
      metadata: {
        planName: targetLevel.name,
        planSlug: targetLevel.slug,
        levelOrder: targetLevel.level_order,
      },
    });

    return this.formatIntentResponse(newIntent, targetLevel);
  }

  /**
   * 2. Create Upgrade Payment Intent
   */
  static async createUpgradeIntent(
    userId: string,
    options?: { levelSlug?: string; levelOrder?: number; levelId?: string }
  ): Promise<FormattedPaymentIntent> {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // 1. Resolve current user level order
    let currentOrder = 0;
    if (user.current_level_id) {
      const currentLevelConfig = await BoosterRepository.findLevelConfigById(user.current_level_id);
      if (currentLevelConfig) {
        currentOrder = currentLevelConfig.level_order;
      }
    } else if (user.status === 'ACTIVE') {
      currentOrder = 1; // Default joined order
    }

    // 2. Resolve target level configuration
    const targetLevel = await this.resolveLevelConfig({
      ...options,
      defaultOrder: currentOrder > 0 ? currentOrder + 1 : 2,
    });

    // Prevent invalid level upgrades (Cannot upgrade to same or lower level)
    if (targetLevel.level_order <= currentOrder) {
      throw new AppError(
        `Invalid level upgrade. Target level order (${targetLevel.level_order}) must be higher than current level order (${currentOrder}).`,
        400
      );
    }

    // 3. Check for active unexpired pending intent
    const existingIntent = await PaymentRepository.findActiveIntent(userId, 'UPGRADE', targetLevel.id);
    if (existingIntent) {
      logger.info({ userId, intentId: existingIntent.id }, 'Returning active existing UPGRADE payment intent');
      return this.formatIntentResponse(existingIntent, targetLevel);
    }

    // 4. Amount loaded strictly from database
    const expectedAmount = targetLevel.upgrade_amount;
    const tokenAddress = env.MOCK_USDT_ADDRESS;
    const receiverAddress = env.SIMPLEON_BOOSTER_ADDRESS;
    const networkId = '97';

    // 5. Unique reference & expiration
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const paymentReference = `PAY-UPG-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 6. Store pending intent in DB
    const newIntent = await PaymentRepository.createIntent({
      userId,
      levelConfigurationId: targetLevel.id,
      paymentReference,
      paymentType: 'UPGRADE',
      expectedAmount,
      tokenAddress,
      receiverAddress,
      networkId,
      expiresAt,
      metadata: {
        fromLevelOrder: currentOrder,
        toLevelOrder: targetLevel.level_order,
        planName: targetLevel.name,
        planSlug: targetLevel.slug,
      },
    });

    return this.formatIntentResponse(newIntent, targetLevel);
  }

  /**
   * 2b. Create Partial-Upgrade Payment Intent — accepts a caller-supplied amount LESS than the
   * target tier's full price, to be accumulated toward it via PartialActivationService (e.g.
   * Starter's 10 USDT = 2 reactivation + 8 toward Builder). Validated against the remaining
   * threshold so a user can never contribute more than what's still needed.
   */
  static async createPartialUpgradeIntent(
    userId: string,
    amount: number,
    options?: { levelSlug?: string; levelOrder?: number; levelId?: string }
  ): Promise<FormattedPaymentIntent> {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!amount || amount <= 0) {
      throw new AppError('Partial upgrade amount must be greater than zero', 400);
    }

    const targetLevel = await this.resolveLevelConfig(options);

    const existing = await prisma.partialActivation.findUnique({
      where: {
        user_id_target_level_configuration_id: {
          user_id: userId,
          target_level_configuration_id: targetLevel.id,
        },
      },
    });

    const threshold = existing ? parseFloat(existing.threshold_amount.toString()) : parseFloat(targetLevel.joining_amount.toString());
    const accumulated = existing ? parseFloat(existing.accumulated_amount.toString()) : 0;
    const remaining = threshold - accumulated;

    if (existing?.status === 'COMPLETED' || remaining <= 0) {
      throw new AppError(`${targetLevel.name} activation is already fully funded`, 400);
    }
    if (amount > remaining) {
      throw new AppError(`Amount exceeds remaining balance needed (${remaining} USDT) toward ${targetLevel.name}`, 400);
    }

    const existingIntent = await PaymentRepository.findActiveIntent(userId, 'PARTIAL_UPGRADE', targetLevel.id);
    if (existingIntent && parseFloat(existingIntent.expected_amount) === amount) {
      logger.info({ userId, intentId: existingIntent.id }, 'Returning active existing PARTIAL_UPGRADE payment intent');
      return this.formatIntentResponse(existingIntent, targetLevel);
    }

    const tokenAddress = env.MOCK_USDT_ADDRESS;
    const receiverAddress = env.SIMPLEON_BOOSTER_ADDRESS;
    const networkId = '97';

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const paymentReference = `PAY-PARTIAL-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const newIntent = await PaymentRepository.createIntent({
      userId,
      levelConfigurationId: targetLevel.id,
      paymentReference,
      paymentType: 'PARTIAL_UPGRADE',
      expectedAmount: amount.toString(),
      tokenAddress,
      receiverAddress,
      networkId,
      expiresAt,
      metadata: {
        planName: targetLevel.name,
        planSlug: targetLevel.slug,
        remainingBeforeThisContribution: remaining,
      },
    });

    return this.formatIntentResponse(newIntent, targetLevel);
  }

  /**
   * 3. Create Re-Topup Payment Intent
   */
  static async createRetopupIntent(
    userId: string,
    options?: { levelSlug?: string; levelOrder?: number; levelId?: string }
  ): Promise<FormattedPaymentIntent> {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Resolve level config
    const targetLevel = await this.resolveLevelConfig({
      ...options,
      defaultOrder: 1,
    });

    if (!targetLevel.retopup_enabled) {
      throw new AppError(`Re-topup is currently disabled for ${targetLevel.name} plan`, 400);
    }

    // Check for existing active pending intent
    const existingIntent = await PaymentRepository.findActiveIntent(userId, 'RETOPUP', targetLevel.id);
    if (existingIntent) {
      logger.info({ userId, intentId: existingIntent.id }, 'Returning active existing RETOPUP payment intent');
      return this.formatIntentResponse(existingIntent, targetLevel);
    }

    // Amount strictly from database
    const expectedAmount = targetLevel.retopup_amount;
    const tokenAddress = env.MOCK_USDT_ADDRESS;
    const receiverAddress = env.SIMPLEON_BOOSTER_ADDRESS;
    const networkId = '97';

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const paymentReference = `PAY-TOP-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const newIntent = await PaymentRepository.createIntent({
      userId,
      levelConfigurationId: targetLevel.id,
      paymentReference,
      paymentType: 'RETOPUP',
      expectedAmount,
      tokenAddress,
      receiverAddress,
      networkId,
      expiresAt,
      metadata: {
        planName: targetLevel.name,
        planSlug: targetLevel.slug,
      },
    });

    return this.formatIntentResponse(newIntent, targetLevel);
  }

  /**
   * 4. Get Payment Intent by ID
   */
  static async getPaymentById(id: string, userId?: string): Promise<FormattedPaymentIntent> {
    const intent = await PaymentRepository.findById(id);
    if (!intent) {
      throw new AppError('Payment intent not found', 404);
    }

    if (userId && intent.user_id !== userId) {
      throw new AppError('Unauthorized access to payment intent', 403);
    }

    let levelConfig: LevelConfigRecord | null = null;
    if (intent.level_configuration_id) {
      levelConfig = await BoosterRepository.findLevelConfigById(intent.level_configuration_id);
    }

    return this.formatIntentResponse(intent, levelConfig);
  }

  /**
   * 5. Get Payment Intent by Reference
   */
  static async getPaymentByReference(reference: string, userId?: string): Promise<FormattedPaymentIntent> {
    const intent = await PaymentRepository.findByReference(reference);
    if (!intent) {
      throw new AppError('Payment intent not found for provided reference', 404);
    }

    if (userId && intent.user_id !== userId) {
      throw new AppError('Unauthorized access to payment intent', 403);
    }

    let levelConfig: LevelConfigRecord | null = null;
    if (intent.level_configuration_id) {
      levelConfig = await BoosterRepository.findLevelConfigById(intent.level_configuration_id);
    }

    return this.formatIntentResponse(intent, levelConfig);
  }

  /**
   * 6. Confirm Mock Payment (Gated by MOCK_PAYMENT_ENABLED)
   */
  static async confirmMockPayment(id: string, userId: string, txHash?: string): Promise<FormattedPaymentIntent> {
    const intent = await PaymentRepository.findById(id);
    if (!intent) {
      throw new AppError('Payment intent not found', 404);
    }

    if (intent.user_id !== userId) {
      throw new AppError('Unauthorized access to payment intent', 403);
    }

    if (intent.status === 'EXPIRED') {
      throw new AppError('Payment intent has expired', 400);
    }

    if (intent.status === 'CONFIRMED') {
      let levelConfig: LevelConfigRecord | null = null;
      if (intent.level_configuration_id) {
        levelConfig = await BoosterRepository.findLevelConfigById(intent.level_configuration_id);
      }
      return this.formatIntentResponse(intent, levelConfig);
    }

    const updated = await PaymentRepository.confirmPayment(id, txHash);
    let levelConfig: LevelConfigRecord | null = null;
    if (updated.level_configuration_id) {
      levelConfig = await BoosterRepository.findLevelConfigById(updated.level_configuration_id);

      if (updated.payment_type === 'JOIN' || updated.payment_type === 'UPGRADE') {
        try {
          await MatrixPlacementService.placeUserInMatrix(
            updated.user_id,
            updated.level_configuration_id
          );
        } catch (mErr: any) {
          logger.warn({ error: mErr.message }, '[PaymentService] Matrix placement notification warning');
        }
      }
    }

    return this.formatIntentResponse(updated, levelConfig);
  }

  /**
   * 7. Verify Blockchain Payment via Ethers.js
   */
  static async verifyPayment(
    userId: string,
    paymentIntentId: string,
    txHash: string
  ): Promise<{
    status: string;
    message: string;
    paymentIntent: FormattedPaymentIntent;
    verification: any;
    transaction: any;
    ledger: any;
    planActionResult: any;
  }> {
    if (!paymentIntentId) {
      throw new AppError('Payment intent ID is required', 400);
    }
    if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
      throw new AppError('Valid blockchain transaction hash starting with 0x is required', 400);
    }

    const cleanTxHash = txHash.trim().toLowerCase();

    // 1. Load the payment intent
    const intent = await PaymentRepository.findById(paymentIntentId);
    if (!intent) {
      throw new AppError('Payment intent not found', 404);
    }

    // 2. Check that it belongs to the authenticated user
    if (intent.user_id !== userId) {
      throw new AppError('Unauthorized access to payment intent', 403);
    }

    // 3. Check if already confirmed
    if (intent.status === 'CONFIRMED') {
      let levelConfig: LevelConfigRecord | null = null;
      if (intent.level_configuration_id) {
        levelConfig = await BoosterRepository.findLevelConfigById(intent.level_configuration_id);
      }
      return {
        status: 'CONFIRMED',
        message: 'Payment has already been verified and confirmed',
        paymentIntent: this.formatIntentResponse(intent, levelConfig),
        verification: null,
        transaction: null,
        ledger: null,
        planActionResult: null,
      };
    }

    // Check if expired or failed
    if (intent.status === 'EXPIRED') {
      throw new AppError('Payment intent has expired', 400);
    }
    if (intent.status === 'FAILED') {
      throw new AppError('Payment intent is in failed status', 400);
    }
    if (intent.expires_at <= new Date()) {
      await PaymentRepository.markIntentFailed(intent.id, 'Payment intent expired before verification');
      throw new AppError('Payment intent has expired', 400);
    }

    // 4. Ensure the transaction hash was not already processed
    const existingVerification = await PaymentRepository.findVerificationByTxHash(cleanTxHash);
    if (existingVerification) {
      throw new AppError('This blockchain transaction hash has already been processed', 400);
    }

    // 5. Fetch user details for sender wallet verification
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('Authenticated user not found', 404);
    }

    const expectedTokenAddress = (intent.token_address || env.MOCK_USDT_ADDRESS).toLowerCase();
    const expectedReceiverAddress = (intent.receiver_address || env.SIMPLEON_BOOSTER_ADDRESS).toLowerCase();
    const expectedSenderAddress = (user.wallet_address || '').toLowerCase();
    const expectedAmountStr = intent.expected_amount.toString();
    const expectedNetworkId = intent.network_id || '97';

    let fromAddress = '';
    let toAddress = '';
    let tokenAddress = expectedTokenAddress;
    let confirmedAmount = expectedAmountStr;
    let blockNumber = 0;
    let confirmationCount = 1;
    let rawReceipt: any = null;

    // Determine RPC endpoint
    const rpcUrl =
      expectedNetworkId === '56'
        ? env.BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/'
        : env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/';


      // Real Blockchain Verification via Ethers.js
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // Fetch transaction receipt
        const receipt = await provider.getTransactionReceipt(cleanTxHash);
        if (!receipt) {
          throw new AppError('Transaction receipt not found or still pending on blockchain', 202);
        }

        rawReceipt = JSON.parse(JSON.stringify(receipt));

        // Confirm receipt status
        if (receipt.status !== 1) {
          await PaymentRepository.markIntentFailed(intent.id, 'Transaction reverted or failed on blockchain');
          throw new AppError('Transaction failed or reverted on blockchain', 400);
        }

        // Standard ERC-20 Transfer event signature: Transfer(address,address,uint256)
        const transferTopic = ethers.id('Transfer(address,address,uint256)');
        const erc20Interface = new ethers.Interface([
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        ]);

        let matchedTransfer: any = null;

        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === expectedTokenAddress &&
            log.topics &&
            log.topics[0] === transferTopic
          ) {
            try {
              const parsed = erc20Interface.parseLog({
                topics: [...log.topics],
                data: log.data,
              });
              if (parsed && parsed.name === 'Transfer') {
                matchedTransfer = parsed;
                break;
              }
            } catch (e) {
              // skip unparseable log
            }
          }
        }

        if (!matchedTransfer) {
          await PaymentRepository.markIntentFailed(intent.id, 'No matching token Transfer event found in receipt');
          throw new AppError(`No matching ERC-20 Transfer event found for token contract ${expectedTokenAddress}`, 400);
        }

        fromAddress = (matchedTransfer.args.from || '').toLowerCase();
        toAddress = (matchedTransfer.args.to || '').toLowerCase();
        const rawValueBigInt = matchedTransfer.args.value; // BigInt
        // USDT on BSC has 18 decimals (or 6 depending on contract, but BSC BEP20 USDT uses 18)
        const parsedAmountUnits = ethers.formatUnits(rawValueBigInt, 18);
        confirmedAmount = parsedAmountUnits;

        blockNumber = receipt.blockNumber;
        const currentBlock = await provider.getBlockNumber();
        confirmationCount = Math.max(1, currentBlock - receipt.blockNumber + 1);

        // Confirm Sender Wallet
        if (expectedSenderAddress && fromAddress !== expectedSenderAddress) {
          await PaymentRepository.markIntentFailed(
            intent.id,
            `Sender address mismatch: expected ${expectedSenderAddress}, got ${fromAddress}`
          );
          throw new AppError(
            `Sender wallet mismatch: transaction came from ${fromAddress}, expected ${expectedSenderAddress}`,
            400
          );
        }

        // Confirm Receiver Wallet
        if (toAddress !== expectedReceiverAddress) {
          await PaymentRepository.markIntentFailed(
            intent.id,
            `Receiver address mismatch: expected ${expectedReceiverAddress}, got ${toAddress}`
          );
          throw new AppError(
            `Receiver wallet mismatch: transaction was sent to ${toAddress}, expected ${expectedReceiverAddress}`,
            400
          );
        }

        // Confirm Token Amount
        const confirmedNum = parseFloat(confirmedAmount);
        const expectedNum = parseFloat(expectedAmountStr);
        if (isNaN(confirmedNum) || confirmedNum < expectedNum - 0.0001) {
          await PaymentRepository.markIntentFailed(
            intent.id,
            `Amount mismatch: expected ${expectedAmountStr}, got ${confirmedAmount}`
          );
          throw new AppError(
            `Transferred token amount (${confirmedAmount}) is less than expected amount (${expectedAmountStr})`,
            400
          );
        }

        // Confirm Minimum Confirmations
        if (confirmationCount < 1) {
          throw new AppError('Transaction needs at least 1 confirmation on blockchain', 202);
        }
      } catch (err: any) {
        if (err instanceof AppError) {
          throw err;
        }
        logger.error({ error: err.message, txHash: cleanTxHash }, 'RPC Blockchain verification error');
        throw new AppError(`Blockchain RPC verification failed: ${err.message}`, 500);
      }

    // Save verification info, confirm intent, create transaction record, create ledger, trigger plan action atomically
    const result = await PaymentRepository.executeVerifiedPaymentTx({
      intent,
      txHash: cleanTxHash,
      fromAddress: fromAddress || expectedSenderAddress,
      toAddress: toAddress || expectedReceiverAddress,
      tokenAddress: tokenAddress || expectedTokenAddress,
      networkId: expectedNetworkId,
      blockNumber,
      confirmedAmount,
      confirmationCount,
      rawReceipt,
    });

    let levelConfig: LevelConfigRecord | null = null;
    if (result.paymentIntent.level_configuration_id) {
      levelConfig = await BoosterRepository.findLevelConfigById(result.paymentIntent.level_configuration_id);

      // Perform X5 Matrix placement for JOIN or UPGRADE
      if (result.paymentIntent.payment_type === 'JOIN' || result.paymentIntent.payment_type === 'UPGRADE') {
        try {
          await MatrixPlacementService.placeUserInMatrix(
            result.paymentIntent.user_id,
            result.paymentIntent.level_configuration_id
          );
        } catch (mErr: any) {
          logger.warn({ error: mErr.message }, '[PaymentService] Matrix placement notification warning');
        }
      }
    }

    // Trigger notifications for PAYMENT_CONFIRMED and PLAN_ACTIVATED
    try {
      await NotificationService.createNotification({
        userId: result.paymentIntent.user_id,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Payment Confirmed',
        message: `Your payment of ${result.paymentIntent.expected_amount} USDT (${result.paymentIntent.payment_type}) has been verified on-chain.`,
        data: { txHash: cleanTxHash, paymentType: result.paymentIntent.payment_type },
      });

      if (result.paymentIntent.payment_type === 'JOIN') {
        await NotificationService.createNotification({
          userId: result.paymentIntent.user_id,
          type: NotificationType.PLAN_ACTIVATED,
          title: 'Plan Activated',
          message: `Congratulations! Your ${levelConfig?.name || 'Starter'} Booster Plan is now fully active.`,
          data: { levelId: result.paymentIntent.level_configuration_id },
        });
      }
    } catch (notifErr: any) {
      logger.warn({ error: notifErr.message }, '[PaymentService] Notification dispatch error');
    }

    return {
      status: 'CONFIRMED',
      message: 'Payment verified and confirmed successfully',
      paymentIntent: this.formatIntentResponse(result.paymentIntent, levelConfig),
      verification: result.verification,
      transaction: result.transaction,
      ledger: result.ledger,
      planActionResult: result.planActionResult,
    };
  }
}
