import { Prisma, LedgerEntryType, LedgerDirection, LedgerStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { FinancialDateService } from './FinancialDateService.js';

export interface WalletSummaryResult {
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalEarned: number;
  totalDebits: number;
  totalPaid: number;
  todaysEarnings: number;
}

export interface LedgerFilterParams {
  page?: number;
  limit?: number;
  entryType?: string;
  status?: string;
  direction?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionFilterParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class WalletService {
  private static readonly BSC_EXPLORER = process.env.BSC_EXPLORER_URL || 'https://testnet.bscscan.com/tx/';

  /**
   * Helper to format blockchain explorer URL
   */
  public static getExplorerUrl(hash?: string | null): string | null {
    if (!hash) return null;
    const cleanHash = hash.trim();
    if (cleanHash.startsWith('http')) return cleanHash;
    const baseUrl = this.BSC_EXPLORER.endsWith('/') ? this.BSC_EXPLORER : `${this.BSC_EXPLORER}/`;
    return `${baseUrl}${cleanHash}`;
  }

  /**
   * GET /api/wallet/summary
   * Calculates real-time wallet balances and metrics based strictly on immutable ledger records.
   */
  static async getSummary(userId: string, db: any = prisma): Promise<WalletSummaryResult> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // 1. Fetch all ledger entries for the user to compute immutable balance totals
    const ledgers = await db.walletLedger.findMany({
      where: { user_id: userId },
    });

    let availableBalance = 0;
    let pendingBalance = 0;
    let lockedBalance = 0;
    let totalEarned = 0;
    let totalDebits = 0;
    let totalPaid = 0;

    // Structural/internal fund allocations — never the user's own spendable income. Excluded
    // from availableBalance/totalEarned entirely (not locked, not pending: this money was never
    // theirs to begin with — it's Builder's Bititan reserve, or funding routed toward their own
    // next-tier activation). See MatrixRewardService's explicit-destination ledger entries and
    // getBititanSummary() below for a dedicated read surface on the Bititan portion.
    const STRUCTURAL_ENTRY_TYPES = new Set(['NEXT_TIER_ACTIVATION_FUNDING', 'BITITAN_CREDIT', 'PARTIAL_ACTIVATION_CREDIT']);

    for (const item of ledgers) {
      const amt = parseFloat(item.amount.toString());
      const isCredit = item.direction === 'CREDIT';
      const isDebit = item.direction === 'DEBIT';
      const isStructural = STRUCTURAL_ENTRY_TYPES.has(item.entry_type);

      if (isStructural) {
        continue;
      }

      if (item.status === 'AVAILABLE' || item.status === 'COMPLETED') {
        if (isCredit) {
          availableBalance += amt;
          totalEarned += amt;
        } else if (isDebit) {
          availableBalance -= amt;
          totalDebits += amt;

          if (item.entry_type === 'WITHDRAWAL') {
            totalPaid += amt;
          }
        }
      } else if (item.status === 'PENDING') {
        if (isCredit) {
          pendingBalance += amt;
        }
      } else if (item.status === 'LOCKED') {
        lockedBalance += amt;
      }

      if (item.entry_type === 'HELD_INCOME' || item.entry_type === 'CAPPED_INCOME') {
        lockedBalance += amt;
      }
    }

    // Ensure non-negative balances
    availableBalance = Math.max(0, availableBalance);
    pendingBalance = Math.max(0, pendingBalance);
    lockedBalance = Math.max(0, lockedBalance);
    totalEarned = Math.max(0, totalEarned);
    totalDebits = Math.max(0, totalDebits);
    totalPaid = Math.max(0, totalPaid);

    // 2. Compute today's earnings using FinancialDateService
    const { startUtc, endUtc } = FinancialDateService.getStartAndEndOfBusinessDay(
      FinancialDateService.getBusinessDate()
    );

    const todaysCreditLedgers = await db.walletLedger.findMany({
      where: {
        user_id: userId,
        direction: 'CREDIT',
        status: { in: ['AVAILABLE', 'COMPLETED'] },
        entry_type: { notIn: Array.from(STRUCTURAL_ENTRY_TYPES) },
        created_at: {
          gte: startUtc,
          lte: endUtc,
        },
      },
    });

    const todaysEarnings = todaysCreditLedgers.reduce(
      (sum: number, l: any) => sum + parseFloat(l.amount.toString()),
      0
    );

    return {
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      pendingBalance: parseFloat(pendingBalance.toFixed(2)),
      lockedBalance: parseFloat(lockedBalance.toFixed(2)),
      totalEarned: parseFloat(totalEarned.toFixed(2)),
      totalDebits: parseFloat(totalDebits.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      todaysEarnings: parseFloat(todaysEarnings.toFixed(2)),
    };
  }

  /**
   * Dedicated read surface for a user's Bititan Wallet reserve (Builder tier only).
   * Deliberately separate from getSummary()'s availableBalance/totalEarned — per spec,
   * the Bititan Wallet must never be merged with the user's Income Wallet.
   */
  static async getBititanSummary(userId: string, db: any = prisma): Promise<{ totalBititanReserve: number }> {
    const result = await db.walletLedger.aggregate({
      where: { user_id: userId, entry_type: 'BITITAN_CREDIT' },
      _sum: { amount: true },
    });
    const totalBititanReserve = result._sum.amount ? parseFloat(result._sum.amount.toString()) : 0;
    return { totalBititanReserve: parseFloat(totalBititanReserve.toFixed(2)) };
  }

  /**
   * GET /api/wallet/ledger
   * Returns paginated wallet ledger entries with filtering and search.
   */
  static async getLedger(userId: string, params: LedgerFilterParams, db: any = prisma) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 10);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.WalletLedgerWhereInput = {
      user_id: userId,
    };

    if (params.entryType && params.entryType !== 'ALL') {
      whereClause.entry_type = params.entryType as LedgerEntryType;
    }

    if (params.status && params.status !== 'ALL') {
      whereClause.status = params.status as LedgerStatus;
    }

    if (params.direction && params.direction !== 'ALL') {
      whereClause.direction = params.direction as LedgerDirection;
    }

    if (params.startDate || params.endDate) {
      whereClause.created_at = {};
      if (params.startDate) {
        whereClause.created_at.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.created_at.lte = end;
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { idempotency_key: { contains: q } },
        { source_id: { contains: q } },
        { source_type: { contains: q } },
      ];
    }

    const [total, records] = await Promise.all([
      db.walletLedger.count({ where: whereClause }),
      db.walletLedger.findMany({
        where: whereClause,
        include: {
          transaction: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedLedgers = records.map((r: any) => ({
      id: r.id,
      entryType: r.entry_type,
      direction: r.direction,
      amount: parseFloat(r.amount.toString()),
      availableAmount: parseFloat(r.available_amount.toString()),
      lockedAmount: parseFloat(r.locked_amount.toString()),
      pendingAmount: parseFloat(r.pending_amount.toString()),
      status: r.status,
      idempotencyKey: r.idempotency_key,
      sourceType: r.source_type,
      sourceId: r.source_id,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
      transactionHash: r.transaction?.blockchain_transaction_hash || null,
      explorerUrl: WalletService.getExplorerUrl(r.transaction?.blockchain_transaction_hash),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ledgers: formattedLedgers,
    };
  }

  /**
   * GET /api/transactions
   * Returns paginated transaction records with filtering and search.
   */
  static async getTransactions(userId: string, params: TransactionFilterParams, db: any = prisma) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 10);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TransactionWhereInput = {
      user_id: userId,
    };

    if (params.type && params.type !== 'ALL') {
      whereClause.transaction_type = params.type as TransactionType;
    }

    if (params.status && params.status !== 'ALL') {
      whereClause.status = params.status as TransactionStatus;
    }

    if (params.startDate || params.endDate) {
      whereClause.created_at = {};
      if (params.startDate) {
        whereClause.created_at.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.created_at.lte = end;
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { blockchain_transaction_hash: { contains: q } },
        { description: { contains: q } },
        { id: { contains: q } },
      ];
    }

    const [total, records] = await Promise.all([
      db.transaction.count({ where: whereClause }),
      db.transaction.findMany({
        where: whereClause,
        include: {
          payment_intent: true,
          wallet_ledgers: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedTransactions = records.map((t: any) => ({
      id: t.id,
      txHash: t.blockchain_transaction_hash || t.id,
      blockchainTransactionHash: t.blockchain_transaction_hash,
      type: t.transaction_type,
      amount: parseFloat(t.amount.toString()),
      amountUsdt: parseFloat(t.amount.toString()),
      currency: t.currency,
      status: t.status,
      description: t.description,
      fromAddress: t.payment_intent?.receiver_address || 'Protocol Smart Contract',
      timestamp: t.created_at.toISOString(),
      createdAt: t.created_at.toISOString(),
      completedAt: t.completed_at ? t.completed_at.toISOString() : null,
      explorerUrl: WalletService.getExplorerUrl(t.blockchain_transaction_hash),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      transactions: formattedTransactions,
    };
  }

  /**
   * GET /api/transactions/:id
   * Returns a single transaction by ID.
   */
  static async getTransactionById(userId: string, transactionId: string, db: any = prisma) {
    const record = await db.transaction.findFirst({
      where: {
        id: transactionId,
        user_id: userId,
      },
      include: {
        payment_intent: {
          include: {
            verifications: true,
          },
        },
        wallet_ledgers: true,
      },
    });

    if (!record) {
      throw new AppError('Transaction not found', 404);
    }

    return {
      id: record.id,
      userId: record.user_id,
      type: record.transaction_type,
      amount: parseFloat(record.amount.toString()),
      currency: record.currency,
      status: record.status,
      blockchainTransactionHash: record.blockchain_transaction_hash,
      explorerUrl: WalletService.getExplorerUrl(record.blockchain_transaction_hash),
      description: record.description,
      metadata: record.metadata,
      createdAt: record.created_at.toISOString(),
      completedAt: record.completed_at ? record.completed_at.toISOString() : null,
      paymentIntent: record.payment_intent,
      walletLedgers: record.wallet_ledgers,
    };
  }

  /**
   * GET /api/transactions/export
   * Generates a real CSV file for transactions matching filters.
   */
  static async exportTransactionsCSV(userId: string, params: TransactionFilterParams, db: any = prisma): Promise<string> {
    const whereClause: Prisma.TransactionWhereInput = {
      user_id: userId,
    };

    if (params.type && params.type !== 'ALL') {
      whereClause.transaction_type = params.type as TransactionType;
    }

    if (params.status && params.status !== 'ALL') {
      whereClause.status = params.status as TransactionStatus;
    }

    if (params.startDate || params.endDate) {
      whereClause.created_at = {};
      if (params.startDate) {
        whereClause.created_at.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.created_at.lte = end;
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { blockchain_transaction_hash: { contains: q } },
        { description: { contains: q } },
        { id: { contains: q } },
      ];
    }

    const records = await db.transaction.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 1000, // Export up to 1000 recent transactions
    });

    const headers = ['Transaction ID', 'Date & Time', 'Type', 'Amount (USDT)', 'Status', 'Blockchain Tx Hash', 'Description'];
    const rows = records.map((t: any) => [
      `"${t.id}"`,
      `"${t.created_at.toISOString()}"`,
      `"${t.transaction_type}"`,
      `"${parseFloat(t.amount.toString()).toFixed(2)}"`,
      `"${t.status}"`,
      `"${t.blockchain_transaction_hash || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Helper: Add an immutable ledger entry with strict idempotency and balance enforcement.
   */
  static async addLedgerEntry(
    data: {
      userId: string;
      transactionId?: string;
      entryType: LedgerEntryType;
      direction: LedgerDirection;
      amount: number;
      idempotencyKey: string;
      sourceType?: string;
      sourceId?: string;
      status?: LedgerStatus;
      metadata?: any;
    },
    db: any = prisma
  ) {
    const safeAmount = Math.max(0, data.amount);

    // 1. Check idempotency key
    const existing = await db.walletLedger.findUnique({
      where: { idempotency_key: data.idempotencyKey },
    });

    if (existing) {
      logger.info({ idempotencyKey: data.idempotencyKey }, 'Ledger entry already exists. Returning existing.');
      return existing;
    }

    // 2. Prevent negative available balance if DEBIT
    if (data.direction === 'DEBIT') {
      const summary = await this.getSummary(data.userId, db);
      if (summary.availableBalance < safeAmount) {
        throw new AppError(
          `Insufficient available balance (${summary.availableBalance} USDT) for debit of ${safeAmount} USDT`,
          400
        );
      }
    }

    // 3. Create immutable ledger record
    const newRecord = await db.walletLedger.create({
      data: {
        user_id: data.userId,
        transaction_id: data.transactionId || null,
        entry_type: data.entryType,
        direction: data.direction,
        amount: new Prisma.Decimal(safeAmount),
        available_amount: new Prisma.Decimal(data.direction === 'CREDIT' ? safeAmount : 0),
        status: data.status || 'AVAILABLE',
        idempotency_key: data.idempotencyKey,
        source_type: data.sourceType || null,
        source_id: data.sourceId || null,
        metadata: data.metadata || null,
      },
    });

    logger.info(
      { userId: data.userId, entryType: data.entryType, amount: safeAmount, direction: data.direction },
      'Immutable wallet ledger entry created'
    );

    return newRecord;
  }
}
