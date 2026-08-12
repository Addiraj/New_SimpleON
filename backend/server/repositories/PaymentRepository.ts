import { Prisma, NotificationType } from '@prisma/client';
import { prisma, isDatabaseAvailable } from '../config/database.js';
import { logger } from '../config/logger.js';
import { BoosterRepository, LevelConfigRecord } from './BoosterRepository.js';
import { AuthRepository } from './AuthRepository.js';
import { NotificationService } from '../services/NotificationService.js';

export interface PaymentIntentRecord {
  id: string;
  user_id: string;
  level_configuration_id: string | null;
  payment_reference: string;
  payment_type: 'JOIN' | 'UPGRADE' | 'RETOPUP';
  expected_amount: string; // Serialized string representation of Decimal
  token_address: string | null;
  receiver_address: string | null;
  network_id: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
  expires_at: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

// In-memory fallback store when DB connection is lost
const memoryPaymentIntents = new Map<string, PaymentIntentRecord>();
const memoryVerifiedTxHashes = new Set<string>();

export class PaymentRepository {
  /**
   * Expire any pending payment intents for a user or globally where expires_at <= NOW()
   */
  static async expireOldIntents(userId?: string): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    try {
      const whereClause: any = {
        status: 'PENDING',
        expires_at: { lte: now },
      };
      if (userId) {
        whereClause.user_id = userId;
      }

      const res = await prisma.paymentIntent.updateMany({
        where: whereClause,
        data: { status: 'EXPIRED' },
      });
      expiredCount = res.count;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, expiring payment intents in memory store');
      for (const intent of memoryPaymentIntents.values()) {
        if (
          intent.status === 'PENDING' &&
          intent.expires_at <= now &&
          (!userId || intent.user_id === userId)
        ) {
          intent.status = 'EXPIRED';
          intent.updated_at = now;
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }

  /**
   * Find an existing active (PENDING & unexpired) payment intent for a user, type, and level
   */
  static async findActiveIntent(
    userId: string,
    paymentType: 'JOIN' | 'UPGRADE' | 'RETOPUP',
    levelConfigurationId?: string | null
  ): Promise<PaymentIntentRecord | null> {
    await this.expireOldIntents(userId);
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const whereCondition: any = {
        user_id: userId,
        payment_type: paymentType,
        status: 'PENDING',
        expires_at: { gt: now },
      };

      if (levelConfigurationId) {
        whereCondition.level_configuration_id = levelConfigurationId;
      }

      const dbIntent = await prisma.paymentIntent.findFirst({
        where: whereCondition,
        orderBy: { created_at: 'desc' },
      });

      if (dbIntent) {
        return {
          ...dbIntent,
          expected_amount: dbIntent.expected_amount.toString(),
        } as unknown as PaymentIntentRecord;
      }
      return null;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, searching active payment intent in memory');
      for (const intent of memoryPaymentIntents.values()) {
        if (
          intent.user_id === userId &&
          intent.payment_type === paymentType &&
          intent.status === 'PENDING' &&
          intent.expires_at > now &&
          (!levelConfigurationId || intent.level_configuration_id === levelConfigurationId)
        ) {
          return intent;
        }
      }
      return null;
    }
  }

  /**
   * Find payment intent by ID
   */
  static async findById(id: string): Promise<PaymentIntentRecord | null> {
    try {
      const dbIntent = await prisma.paymentIntent.findUnique({
        where: { id },
      });

      if (dbIntent) {
        // Auto expire if past expiry
        if (dbIntent.status === 'PENDING' && dbIntent.expires_at <= new Date()) {
          await prisma.paymentIntent.update({
            where: { id },
            data: { status: 'EXPIRED' },
          });
          dbIntent.status = 'EXPIRED';
        }

        return {
          ...dbIntent,
          expected_amount: dbIntent.expected_amount.toString(),
        } as unknown as PaymentIntentRecord;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[PaymentRepository] Database query error in findById, checking memory');
    }

    const intent = memoryPaymentIntents.get(id);
    if (intent && intent.status === 'PENDING' && intent.expires_at <= new Date()) {
      intent.status = 'EXPIRED';
      intent.updated_at = new Date();
    }
    return intent || null;
  }

  /**
   * Find payment intent by Reference
   */
  static async findByReference(reference: string): Promise<PaymentIntentRecord | null> {
    try {
      const dbIntent = await prisma.paymentIntent.findUnique({
        where: { payment_reference: reference },
      });

      if (dbIntent) {
        if (dbIntent.status === 'PENDING' && dbIntent.expires_at <= new Date()) {
          await prisma.paymentIntent.update({
            where: { id: dbIntent.id },
            data: { status: 'EXPIRED' },
          });
          dbIntent.status = 'EXPIRED';
        }

        return {
          ...dbIntent,
          expected_amount: dbIntent.expected_amount.toString(),
        } as unknown as PaymentIntentRecord;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[PaymentRepository] Database query error in findByReference, checking memory');
    }

    for (const intent of memoryPaymentIntents.values()) {
      if (intent.payment_reference === reference) {
        if (intent.status === 'PENDING' && intent.expires_at <= new Date()) {
          intent.status = 'EXPIRED';
          intent.updated_at = new Date();
        }
        return intent;
      }
    }
    return null;
  }

  /**
   * Create new Payment Intent in DB
   */
  static async createIntent(data: {
    userId: string;
    levelConfigurationId?: string | null;
    paymentReference: string;
    paymentType: 'JOIN' | 'UPGRADE' | 'RETOPUP';
    expectedAmount: string;
    tokenAddress: string;
    receiverAddress: string;
    networkId: string;
    expiresAt: Date;
    metadata?: any;
  }): Promise<PaymentIntentRecord> {
    const id = `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const dbIntent = await prisma.paymentIntent.create({
        data: {
          id,
          user_id: data.userId,
          level_configuration_id: data.levelConfigurationId || null,
          payment_reference: data.paymentReference,
          payment_type: data.paymentType,
          expected_amount: new Prisma.Decimal(data.expectedAmount),
          token_address: data.tokenAddress,
          receiver_address: data.receiverAddress,
          network_id: data.networkId,
          status: 'PENDING',
          expires_at: data.expiresAt,
          metadata: data.metadata || {},
        },
      });

      const record: PaymentIntentRecord = {
        ...dbIntent,
        expected_amount: dbIntent.expected_amount.toString(),
      } as unknown as PaymentIntentRecord;

      memoryPaymentIntents.set(id, record);
      return record;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, persisting payment intent in memory store');
      const record: PaymentIntentRecord = {
        id,
        user_id: data.userId,
        level_configuration_id: data.levelConfigurationId || null,
        payment_reference: data.paymentReference,
        payment_type: data.paymentType,
        expected_amount: data.expectedAmount,
        token_address: data.tokenAddress,
        receiver_address: data.receiverAddress,
        network_id: data.networkId,
        status: 'PENDING',
        expires_at: data.expiresAt,
        metadata: data.metadata || {},
        created_at: now,
        updated_at: now,
      };
      memoryPaymentIntents.set(id, record);
      return record;
    }
  }

  /**
   * Confirm Payment Intent (updates user status and user_level)
   */
  static async confirmPayment(intentId: string, txHash?: string): Promise<PaymentIntentRecord> {
    const intent = await this.findById(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    const now = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark PaymentIntent as CONFIRMED
        await tx.paymentIntent.update({
          where: { id: intentId },
          data: { status: 'CONFIRMED', updated_at: now },
        });

        // 2. Update User status & current level
        await tx.user.update({
          where: { id: intent.user_id },
          data: {
            status: 'ACTIVE',
            ...(intent.level_configuration_id && { current_level_id: intent.level_configuration_id }),
            joined_at: now,
          },
        });

        // 3. Upsert UserLevel
        if (intent.level_configuration_id) {
          await tx.userLevel.upsert({
            where: {
              id: `ul-${intent.user_id}-${intent.level_configuration_id}`,
            },
            create: {
              id: `ul-${intent.user_id}-${intent.level_configuration_id}`,
              user_id: intent.user_id,
              level_configuration_id: intent.level_configuration_id,
              status: 'COMPLETED',
              activated_at: now,
              completed_at: now,
            },
            update: {
              status: 'COMPLETED',
              activated_at: now,
              completed_at: now,
            },
          });
        }
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma transaction failed, updating confirm status in memory');
    }

    intent.status = 'CONFIRMED';
    intent.updated_at = now;
    memoryPaymentIntents.set(intentId, intent);

    return intent;
  }

  /**
   * Check if a transaction hash has already been verified / processed
   */
  static async findVerificationByTxHash(txHash: string): Promise<any | null> {
    const cleanHash = txHash.toLowerCase().trim();
    if (memoryVerifiedTxHashes.has(cleanHash)) {
      return { transaction_hash: cleanHash, status: 'CONFIRMED' };
    }
    try {
      const pv = await prisma.paymentVerification.findUnique({
        where: { transaction_hash: cleanHash },
      });
      if (pv) return pv;

      const tx = await prisma.transaction.findUnique({
        where: { blockchain_transaction_hash: cleanHash },
      });
      if (tx) return tx;

      return null;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, checking tx hash in memory');
      return null;
    }
  }

  /**
   * Mark Payment Intent as FAILED
   */
  static async markIntentFailed(intentId: string, reason: string): Promise<void> {
    const now = new Date();
    try {
      const intent = await prisma.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: 'FAILED',
          metadata: { failure_reason: reason },
          updated_at: now,
        },
      });

      if (intent && intent.user_id) {
        await NotificationService.createNotification({
          userId: intent.user_id,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payment Failed',
          message: `Payment verification failed: ${reason}`,
          data: { paymentIntentId: intentId, reason },
        });
      }
    } catch (err: any) {
      const intent = memoryPaymentIntents.get(intentId);
      if (intent) {
        intent.status = 'FAILED';
        intent.metadata = { ...intent.metadata, failure_reason: reason };
        intent.updated_at = now;
      }
    }
  }

  /**
   * Atomic execution of verified payment (Verification, Intent Status, Transaction, Ledger, and Matrix Plan Trigger)
   */
  static async executeVerifiedPaymentTx(params: {
    intent: PaymentIntentRecord;
    txHash: string;
    fromAddress: string;
    toAddress: string;
    tokenAddress: string;
    networkId: string;
    blockNumber: number;
    confirmedAmount: string;
    confirmationCount: number;
    rawReceipt: any;
  }): Promise<{
    verification: any;
    transaction: any;
    ledger: any;
    paymentIntent: PaymentIntentRecord;
    planActionResult: any;
  }> {
    const now = new Date();
    const cleanTxHash = params.txHash.toLowerCase().trim();
    const verificationId = `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ledgerId = `wl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `ledger-${params.intent.id}-${cleanTxHash}`;

    let verificationRecord: any = null;
    let transactionRecord: any = null;
    let ledgerRecord: any = null;
    let planActionResult: any = null;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark PaymentIntent as CONFIRMED
        await tx.paymentIntent.update({
          where: { id: params.intent.id },
          data: {
            status: 'CONFIRMED',
            updated_at: now,
          },
        });

        // 2. Create PaymentVerification Record
        verificationRecord = await tx.paymentVerification.create({
          data: {
            id: verificationId,
            payment_intent_id: params.intent.id,
            transaction_hash: cleanTxHash,
            from_address: params.fromAddress,
            to_address: params.toAddress,
            token_address: params.tokenAddress,
            network_id: params.networkId,
            block_number: BigInt(params.blockNumber),
            confirmed_amount: new Prisma.Decimal(params.confirmedAmount),
            confirmation_count: params.confirmationCount,
            status: 'CONFIRMED',
            raw_receipt: params.rawReceipt || {},
            verified_at: now,
          },
        });

        // 3. Create Transaction Record
        const txType =
          params.intent.payment_type === 'JOIN'
            ? 'PLAN_JOIN'
            : params.intent.payment_type === 'UPGRADE'
            ? 'UPGRADE'
            : 'RETOPUP';

        transactionRecord = await tx.transaction.create({
          data: {
            id: transactionId,
            user_id: params.intent.user_id,
            payment_intent_id: params.intent.id,
            transaction_type: txType as any,
            amount: new Prisma.Decimal(params.confirmedAmount),
            currency: 'USDT',
            blockchain_transaction_hash: cleanTxHash,
            status: 'COMPLETED',
            description: `Verified ${params.intent.payment_type} payment via tx ${cleanTxHash}`,
            completed_at: now,
          },
        });

        // 4. Create Wallet Ledger Record
        ledgerRecord = await tx.walletLedger.create({
          data: {
            id: ledgerId,
            user_id: params.intent.user_id,
            transaction_id: transactionId,
            entry_type: 'DEPOSIT',
            direction: 'CREDIT',
            amount: new Prisma.Decimal(params.confirmedAmount),
            available_amount: new Prisma.Decimal(params.confirmedAmount),
            status: 'AVAILABLE',
            idempotency_key: idempotencyKey,
            source_type: 'PAYMENT_VERIFICATION',
            source_id: verificationId,
            metadata: {
              paymentType: params.intent.payment_type,
              txHash: cleanTxHash,
            },
          },
        });

        // 5. Trigger Plan Action depending on payment type
        if (params.intent.payment_type === 'JOIN') {
          // Activate User & UserLevel
          await tx.user.update({
            where: { id: params.intent.user_id },
            data: {
              status: 'ACTIVE',
              ...(params.intent.level_configuration_id && {
                current_level_id: params.intent.level_configuration_id,
              }),
              joined_at: now,
            },
          });

          if (params.intent.level_configuration_id) {
            await tx.userLevel.upsert({
              where: {
                id: `ul-${params.intent.user_id}-${params.intent.level_configuration_id}`,
              },
              create: {
                id: `ul-${params.intent.user_id}-${params.intent.level_configuration_id}`,
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
                status: 'COMPLETED',
                activated_at: now,
                completed_at: now,
              },
              update: {
                status: 'COMPLETED',
                activated_at: now,
                completed_at: now,
              },
            });

            // Create first matrix cycle
            const cycleId = `mc-${params.intent.user_id}-${params.intent.level_configuration_id}-c1`;
            const existingCycle = await tx.matrixCycle.findFirst({
              where: {
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
                cycle_number: 1,
              },
            });

            if (!existingCycle) {
              const newCycle = await tx.matrixCycle.create({
                data: {
                  id: cycleId,
                  user_id: params.intent.user_id,
                  level_configuration_id: params.intent.level_configuration_id,
                  cycle_number: 1,
                  status: 'ACTIVE',
                  started_at: now,
                },
              });
              planActionResult = { action: 'JOIN_ACTIVATED', cycle: newCycle };
            } else {
              planActionResult = { action: 'JOIN_ACTIVATED', cycle: existingCycle };
            }
          }
        } else if (params.intent.payment_type === 'UPGRADE') {
          if (params.intent.level_configuration_id) {
            // Update current user level
            await tx.user.update({
              where: { id: params.intent.user_id },
              data: {
                current_level_id: params.intent.level_configuration_id,
              },
            });

            await tx.userLevel.upsert({
              where: {
                id: `ul-${params.intent.user_id}-${params.intent.level_configuration_id}`,
              },
              create: {
                id: `ul-${params.intent.user_id}-${params.intent.level_configuration_id}`,
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
                status: 'COMPLETED',
                activated_at: now,
                completed_at: now,
              },
              update: {
                status: 'COMPLETED',
                activated_at: now,
                completed_at: now,
              },
            });

            // Ensure matrix cycle exists for upgraded level
            const existingCycle = await tx.matrixCycle.findFirst({
              where: {
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
                cycle_number: 1,
              },
            });

            if (!existingCycle) {
              const cycleId = `mc-${params.intent.user_id}-${params.intent.level_configuration_id}-c1`;
              const newCycle = await tx.matrixCycle.create({
                data: {
                  id: cycleId,
                  user_id: params.intent.user_id,
                  level_configuration_id: params.intent.level_configuration_id,
                  cycle_number: 1,
                  status: 'ACTIVE',
                  started_at: now,
                },
              });
              planActionResult = { action: 'UPGRADED', cycle: newCycle };
            } else {
              planActionResult = { action: 'UPGRADED', cycle: existingCycle };
            }
          }
        } else if (params.intent.payment_type === 'RETOPUP') {
          if (params.intent.level_configuration_id) {
            // Find highest cycle_number
            const lastCycle = await tx.matrixCycle.findFirst({
              where: {
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
              },
              orderBy: { cycle_number: 'desc' },
            });

            const nextCycleNum = (lastCycle?.cycle_number || 0) + 1;
            const cycleId = `mc-${params.intent.user_id}-${params.intent.level_configuration_id}-c${nextCycleNum}`;

            const newCycle = await tx.matrixCycle.create({
              data: {
                id: cycleId,
                user_id: params.intent.user_id,
                level_configuration_id: params.intent.level_configuration_id,
                cycle_number: nextCycleNum,
                status: 'ACTIVE',
                started_at: now,
              },
            });

            planActionResult = { action: 'RETOPUP_COMPLETED', newCycle };
          }
        }
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma transaction failed during verification, proceeding with in-memory execution');
      verificationRecord = {
        id: verificationId,
        payment_intent_id: params.intent.id,
        transaction_hash: cleanTxHash,
        from_address: params.fromAddress,
        to_address: params.toAddress,
        token_address: params.tokenAddress,
        network_id: params.networkId,
        block_number: params.blockNumber,
        confirmed_amount: params.confirmedAmount,
        confirmation_count: params.confirmationCount,
        status: 'CONFIRMED',
        raw_receipt: params.rawReceipt || {},
        verified_at: now,
        created_at: now,
      };

      transactionRecord = {
        id: transactionId,
        user_id: params.intent.user_id,
        payment_intent_id: params.intent.id,
        transaction_type: params.intent.payment_type,
        amount: params.confirmedAmount,
        currency: 'USDT',
        blockchain_transaction_hash: cleanTxHash,
        status: 'CONFIRMED',
        completed_at: now,
      };

      ledgerRecord = {
        id: ledgerId,
        user_id: params.intent.user_id,
        transaction_id: transactionId,
        entry_type: 'DEPOSIT',
        direction: 'CREDIT',
        amount: params.confirmedAmount,
        status: 'AVAILABLE',
        idempotency_key: idempotencyKey,
      };

      if (params.intent.payment_type === 'JOIN' || params.intent.payment_type === 'UPGRADE') {
        const user = await AuthRepository.findUserById(params.intent.user_id);
        if (user) {
          if (params.intent.payment_type === 'JOIN') {
            user.status = 'ACTIVE';
            user.joined_at = now;
          }
          if (params.intent.level_configuration_id) {
            user.current_level_id = params.intent.level_configuration_id;
          }
          await AuthRepository.updateUser(user.id, {
            status: user.status,
            current_level_id: user.current_level_id,
            joined_at: user.joined_at,
          });
        }
      }

      planActionResult = { action: `${params.intent.payment_type}_COMPLETED` };
    }

    params.intent.status = 'CONFIRMED';
    params.intent.updated_at = now;
    memoryPaymentIntents.set(params.intent.id, params.intent);
    memoryVerifiedTxHashes.add(cleanTxHash);

    return {
      verification: verificationRecord,
      transaction: transactionRecord,
      ledger: ledgerRecord,
      paymentIntent: params.intent,
      planActionResult,
    };
  }

  static resetMemoryStore(): void {
    memoryPaymentIntents.clear();
    memoryVerifiedTxHashes.clear();
  }
}
