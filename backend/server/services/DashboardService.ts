import { prisma } from '../config/database.js';
import { WalletService } from './WalletService.js';
import { logger } from '../config/logger.js';

export class DashboardService {
  /**
   * Helper to format short address
   */
  private static formatShortAddress(address?: string | null): string {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Find user by ID or wallet address
   */
  private static async findUser(userId?: string, walletAddress?: string) {
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { current_level: true },
      });
      if (user) return user;
    }

    if (walletAddress) {
      const cleanAddr = walletAddress.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { wallet_address: { equals: cleanAddr } },
        include: { current_level: true },
      });
      if (user) return user;
    }

    return null;
  }

  /**
   * Get full dashboard data
   */
  static async getDashboard(userId?: string, walletAddress?: string, hostHeader?: string) {
    const host = hostHeader || 'simpleon.io';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const user = await this.findUser(userId, walletAddress);

    // Default response for unauthenticated / non-existent user
    if (!user) {
      const targetAddress = walletAddress || '';
      return {
        walletAddress: targetAddress,
        shortWalletAddress: this.formatShortAddress(targetAddress),
        referralCode: '',
        referralLink: targetAddress ? `${protocol}://${host}/?ref=${targetAddress}` : '',
        currentLevel: 'None',
        nextLevel: 'Launch ($5)',
        levelProgress: 0,
        currentPlan: 'None',
        activeMatrixCycle: 0,
        matrixPositionsFilled: 0,
        matrixPositionsRemaining: 0,
        matrixSize: 3, // Launch (the entry tier) is X3
        completedCycles: 0,
        directReferrals: 0,
        indirectReferrals: 0,
        totalTeam: 0,
        qualifiedBuilders: 0,
        availableBalance: 0,
        pendingBalance: 0,
        lockedBalance: 0,
        totalEarnings: 0,
        todaysEarnings: 0,
        dailyCap: 0,
        remainingDailyCap: 0,
        recentTransactions: [],
        unreadNotificationCount: 0,
        accountStatus: 'PENDING',
        currentBlockchainNetwork: 'BNB Smart Chain Testnet (Chain ID 97)',
      };
    }

    const referralLink = `${protocol}://${host}/?ref=${user.referral_code}`;

    // Parallel execution for all user metrics to prevent N+1 queries
    const [
      walletSummary,
      matrixCycles,
      directCount,
      indirectCount,
      builderCount,
      allLevels,
      rawTransactions,
      unreadNotifCount,
    ] = await Promise.all([
      WalletService.getSummary(user.id).catch(() => ({
        availableBalance: 0,
        pendingBalance: 0,
        lockedBalance: 0,
        totalEarned: 0,
        todaysEarnings: 0,
      })),
      prisma.matrixCycle.findMany({
        where: { user_id: user.id },
        include: { level_configuration: true },
        orderBy: { cycle_number: 'desc' },
      }),
      prisma.referralRelation.count({
        where: { sponsor_user_id: user.id, depth: 1, status: 'ACTIVE' },
      }),
      prisma.referralRelation.count({
        where: { sponsor_user_id: user.id, depth: { gt: 1 }, status: 'ACTIVE' },
      }),
      prisma.referralRelation.count({
        where: {
          sponsor_user_id: user.id,
          depth: 1,
          status: 'ACTIVE',
          referred: {
            current_level: {
              level_order: { gte: 3 },
            },
          },
        },
      }),
      prisma.levelConfiguration.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { level_order: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.notification.count({
        where: { user_id: user.id, is_read: false },
      }),
    ]);

    // Active cycle & Matrix calculations
    const activeCycle = matrixCycles.find((c) => c.status === 'ACTIVE');
    const completedCyclesCount = matrixCycles.filter((c) => c.status === 'COMPLETED').length;

    const activeMatrixCycle = activeCycle ? activeCycle.cycle_number : (matrixCycles.length > 0 ? matrixCycles[0].cycle_number : 0);
    const matrixPositionsFilled = activeCycle ? activeCycle.filled_positions : 0;
    const matrixPositionsRemaining = activeCycle ? Math.max(0, activeCycle.total_positions - activeCycle.filled_positions) : 0;
    // Matrix width is per-tier (3 for Launch/Visionary's X3 leg, 5 for Starter-Champion) — never
    // assume 5. Falls back to the user's current tier's configured size if no cycle exists yet.
    const matrixSize = activeCycle?.total_positions || user.current_level?.matrix_size || 5;

    // Current & Next Level / Plan calculations
    let currentLevelName = 'None';
    let currentPlanName = 'None';
    let nextLevelName = 'Launch ($5)';
    let levelProgress = 0;
    let dailyCap = 0;

    if (user.current_level) {
      currentLevelName = user.current_level.name;
      const joinAmt = parseFloat(user.current_level.joining_amount.toString());
      currentPlanName = `${user.current_level.name} ($${joinAmt})`;
      dailyCap = parseFloat(user.current_level.daily_cap.toString());

      const currentOrder = user.current_level.level_order;
      const nextLevelObj = allLevels.find((l) => l.level_order > currentOrder);

      if (nextLevelObj) {
        const nextAmt = parseFloat(nextLevelObj.joining_amount.toString());
        nextLevelName = `${nextLevelObj.name} ($${nextAmt})`;
      } else {
        nextLevelName = 'Max Level Reached';
      }

      if (allLevels.length > 0) {
        levelProgress = Math.min(100, Math.round((currentOrder / allLevels.length) * 100));
      }
    } else if (allLevels.length > 0) {
      const firstLevel = allLevels[0];
      const firstAmt = parseFloat(firstLevel.joining_amount.toString());
      nextLevelName = `${firstLevel.name} ($${firstAmt})`;
    }

    const remainingDailyCap = Math.max(0, dailyCap - walletSummary.todaysEarnings);

    // Format recent transactions
    const recentTransactions = rawTransactions.map((tx) => {
      const amtNum = tx.amount ? parseFloat(tx.amount.toString()) : 0;
      const txTypeStr = String(tx.transaction_type || '');
      const isNegative = txTypeStr.includes('WITHDRAWAL') || txTypeStr.includes('RETOPUP') || txTypeStr.includes('UPGRADE');
      const formattedAmount = `${isNegative ? '-' : '+'}$${amtNum.toFixed(2)} USDT`;

      let category = 'Commission';
      if (txTypeStr.includes('MATRIX')) category = 'Matrix';
      else if (txTypeStr.includes('PLAN') || txTypeStr.includes('DEPOSIT')) category = 'Deposit';

      const hashStr = tx.blockchain_transaction_hash || '';

      return {
        id: tx.id,
        type: txTypeStr,
        transactionType: txTypeStr,
        amount: formattedAmount,
        amountUsdt: amtNum,
        status: tx.status,
        txHash: hashStr,
        hash: hashStr,
        time: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
        createdAt: tx.created_at,
        category,
        description: tx.description || `${txTypeStr} event on BSC`,
        explorerUrl: WalletService.getExplorerUrl(hashStr),
      };
    });

    return {
      walletAddress: user.wallet_address,
      shortWalletAddress: this.formatShortAddress(user.wallet_address),
      referralCode: user.referral_code,
      referralLink,
      currentLevel: currentLevelName,
      nextLevel: nextLevelName,
      levelProgress,
      currentPlan: currentPlanName,
      activeMatrixCycle,
      matrixPositionsFilled,
      matrixPositionsRemaining,
      matrixSize,
      completedCycles: completedCyclesCount,
      directReferrals: directCount,
      indirectReferrals: indirectCount,
      totalTeam: directCount + indirectCount,
      qualifiedBuilders: builderCount,
      availableBalance: walletSummary.availableBalance,
      pendingBalance: walletSummary.pendingBalance,
      lockedBalance: walletSummary.lockedBalance,
      totalEarnings: walletSummary.totalEarned,
      todaysEarnings: walletSummary.todaysEarnings,
      dailyCap,
      remainingDailyCap,
      recentTransactions,
      unreadNotificationCount: unreadNotifCount,
      accountStatus: user.status,
      currentBlockchainNetwork: 'BNB Smart Chain Testnet (Chain ID 97)',
    };
  }

  /**
   * Get summary subset
   */
  static async getSummary(userId?: string, walletAddress?: string, hostHeader?: string) {
    const full = await this.getDashboard(userId, walletAddress, hostHeader);
    const { recentTransactions, ...summary } = full;
    return summary;
  }

  /**
   * Get recent transactions subset
   */
  static async getRecentTransactions(userId?: string, walletAddress?: string, limit = 10) {
    const full = await this.getDashboard(userId, walletAddress);
    return full.recentTransactions.slice(0, limit);
  }
}
