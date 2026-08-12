import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { BoosterRepository, FormattedPlan } from '../repositories/BoosterRepository.js';
import { UpgradeEligibilityService } from './UpgradeEligibilityService.js';

export interface BoosterCalculationResult {
  basePlanAmount: number;
  tiers: Array<{
    name: string;
    slug: string;
    levelOrder: number;
    multiplier: string;
    joiningAmount: number;
    upgradeAmount: number;
    retopupAmount: number;
    collectionAmount: number;
    netIncome: number;
    dailyCap: number;
    matrixSize: number;
    requiredDirectReferrals: number;
    requiredQualifiedBuilders: number;
    description: string;
    accent: string;
    badgeBg: string;
    iconName: string;
  }>;
  mainPlan: {
    totalAmount: number;
    x5MatrixSplit: number;
    forcedLevelPool: number;
    perLevelIncome: number;
    x4MatrixAllocation: number;
  };
  totalInvestedToMain: number;
}

type PoolLevel = 'STARTER' | 'BUILDER' | 'LEADER' | 'CHAMPION';

const POOL_LEVELS = {
    STARTER: 1,
    BUILDER: 2,
    LEADER: 3,
    CHAMPION: 4
};

export class BoosterService {
    /**
     * Entry point for a user buying a Starter Plan ($10).
     */
    static async buyStarterPlan(newUserId: string, referralCode?: string) {
        return await prisma.$transaction(async (tx) => {
            // Check if user already has a booster wallet
            const existing = await tx.boosterWallet.findUnique({ where: { user_id: newUserId } });
            if (existing) {
                throw new Error("User is already in the Booster Plan.");
            }

            let sponsorId: string | null = null;
            if (referralCode) {
                const sponsorUser = await tx.user.findUnique({ where: { referral_code: referralCode } });
                if (!sponsorUser) throw new Error("Invalid referral code");
                sponsorId = sponsorUser.id;
            }

            if (!sponsorId) {
                // Independent Buy - Clean $10 goes to Admin
                await tx.adminWallet.upsert({
                    where: { id: 'ADMIN' },
                    update: { total_income: { increment: 10 } },
                    create: { id: 'ADMIN', total_income: 10 }
                });

                await tx.boosterWallet.create({
                    data: {
                        user_id: newUserId,
                        current_highest_pool: 'STARTER'
                    }
                });

                // Assuming newUserId is basically creating their own independent tree.
                await tx.transaction.create({
                    data: {
                        user_id: newUserId,
                        transaction_type: TransactionType.ADMIN_INCOME,
                        amount: 10,
                        description: `Independent purchase by ${newUserId}`
                    }
                });
                return { success: true, message: "Independent Starter Plan purchased." };
            } else {
                // Referral Buy
                await tx.boosterWallet.create({
                    data: {
                        user_id: newUserId,
                        current_highest_pool: 'STARTER'
                    }
                });

                // Process the distribution for the sponsor
                await this.processPoolDistribution(tx, sponsorId, newUserId, 'STARTER');
                return { success: true, message: "Referral Starter Plan purchased." };
            }
        });
    }

    /**
     * Finds the closest upline eligible for a specific pool distribution.
     * Uses roll-up/compression logic.
     */
    static async findEligibleUpline(tx: Prisma.TransactionClient, startingSponsorId: string, requiredPool: PoolLevel): Promise<string | 'ADMIN'> {
        let currentId: string | null = startingSponsorId;
        const reqLevel = POOL_LEVELS[requiredPool];

        while (currentId !== null) {
            const user = await tx.user.findUnique({
                where: { id: currentId },
                include: { booster_wallet: true }
            });

            if (!user) break;

            if (user.booster_wallet) {
                const userLevel = POOL_LEVELS[user.booster_wallet.current_highest_pool as keyof typeof POOL_LEVELS];
                if (userLevel >= reqLevel) {
                    return currentId;
                }
            }
            currentId = user.sponsor_id;
        }
        return 'ADMIN';
    }

    /**
     * Processes the core distribution logic based on the pool.
     */
    static async processPoolDistribution(tx: Prisma.TransactionClient, sponsorId: string, fromUserId: string, poolLevel: PoolLevel) {
        const eligibleReceiver = await this.findEligibleUpline(tx, sponsorId, poolLevel);

        if (eligibleReceiver === 'ADMIN') {
            const amount = poolLevel === 'STARTER' ? 10 : (poolLevel === 'BUILDER' ? 40 : (poolLevel === 'LEADER' ? 80 : 320));
            await tx.adminWallet.upsert({
                where: { id: 'ADMIN' },
                update: { total_income: { increment: amount } },
                create: { id: 'ADMIN', total_income: amount }
            });
            // Admin transaction
            await tx.transaction.create({
                data: {
                    user_id: fromUserId,
                    transaction_type: TransactionType.ADMIN_INCOME,
                    amount: amount,
                    description: `${poolLevel} distribution roll-up to Admin from ${fromUserId}`
                }
            });
            return;
        }

        const receiverId = eligibleReceiver as string;
        
        // Fetch Receiver's Booster Wallet
        const receiverWallet = await tx.boosterWallet.findUnique({ where: { user_id: receiverId } });
        if (!receiverWallet) throw new Error("Receiver booster wallet not found");

        if (poolLevel === 'STARTER') {
            await this.processStarter(tx, receiverWallet, receiverId, fromUserId);
        } else if (poolLevel === 'BUILDER') {
            await this.processBuilder(tx, receiverWallet, receiverId, fromUserId);
        } else if (poolLevel === 'LEADER') {
            await this.processLeader(tx, receiverWallet, receiverId, fromUserId);
        } else if (poolLevel === 'CHAMPION') {
            await this.processChampion(tx, receiverWallet, receiverId, fromUserId);
        }
    }

    private static async processStarter(tx: Prisma.TransactionClient, wallet: any, receiverId: string, fromUserId: string) {
        let newCount = wallet.starter_members_count + 1;
        
        if (wallet.starter_cycle === 1) {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    starter_members_count: newCount,
                    starter_resubscribe_fund: { increment: 2 },
                    builder_activation_fund: { increment: 8 }
                }
            });
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 2, `Starter Cycle 1 Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 8, `Starter Cycle 1 Builder Fund from ${fromUserId}`);

            if (newCount === 5) {
                // Cycle Complete
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        starter_members_count: 0,
                        starter_cycle: { increment: 1 },
                        current_highest_pool: POOL_LEVELS[wallet.current_highest_pool as PoolLevel] < POOL_LEVELS['BUILDER'] ? 'BUILDER' : wallet.current_highest_pool,
                        starter_resubscribe_fund: { decrement: 10 }, // Consumed to re-enter
                        builder_activation_fund: { decrement: 40 } // Consumed to activate
                    }
                });
                
                // Sponsor Upgrade Trigger (Receiver just upgraded to BUILDER, find THEIR sponsor)
                const receiverUser = await tx.user.findUnique({ where: { id: receiverId } });
                if (receiverUser && receiverUser.sponsor_id) {
                    await this.processPoolDistribution(tx, receiverUser.sponsor_id, receiverId, 'BUILDER');
                }
            }
        } else {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    starter_members_count: newCount,
                    starter_resubscribe_fund: { increment: 2 },
                    income_wallet: { increment: 8 }
                }
            });
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 2, `Starter Cycle ${wallet.starter_cycle} Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 8, `Starter Cycle ${wallet.starter_cycle} Income from ${fromUserId}`);

            if (newCount === 5) {
                // Cycle Complete
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        starter_members_count: 0,
                        starter_cycle: { increment: 1 },
                        starter_resubscribe_fund: { decrement: 10 } // Consumed
                    }
                });
            }
        }
    }

    private static async processBuilder(tx: Prisma.TransactionClient, wallet: any, receiverId: string, fromUserId: string) {
        let newCount = wallet.builder_members_count + 1;
        
        if (wallet.builder_cycle === 1) {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    builder_members_count: newCount,
                    builder_resubscribe_fund: { increment: 8 },
                    leader_activation_fund: { increment: 16 },
                    b_titan_reserve_fund: { increment: 16 }
                }
            });
            // Log all fund movements for audit trail (no income_wallet credit in Cycle 1)
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 8, `Builder Cycle 1 Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 16, `Builder Cycle 1 Leader Activation Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 16, `Builder Cycle 1 B-Titan Reserve Fund from ${fromUserId}`);

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        builder_members_count: 0,
                        builder_cycle: { increment: 1 },
                        current_highest_pool: POOL_LEVELS[wallet.current_highest_pool as PoolLevel] < POOL_LEVELS['LEADER'] ? 'LEADER' : wallet.current_highest_pool,
                        builder_resubscribe_fund: { decrement: 40 }, 
                        leader_activation_fund: { decrement: 80 } 
                        // Note: $80 B-Titan Reserve remains untouched (Complete)
                    }
                });
                
                const receiverUser = await tx.user.findUnique({ where: { id: receiverId } });
                if (receiverUser && receiverUser.sponsor_id) {
                    await this.processPoolDistribution(tx, receiverUser.sponsor_id, receiverId, 'LEADER');
                }
            }
        } else {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    builder_members_count: newCount,
                    builder_resubscribe_fund: { increment: 8 },
                    income_wallet: { increment: 32 }
                }
            });
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 8, `Builder Cycle ${wallet.builder_cycle} Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 32, `Builder Cycle ${wallet.builder_cycle} Income from ${fromUserId}`);

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        builder_members_count: 0,
                        builder_cycle: { increment: 1 },
                        builder_resubscribe_fund: { decrement: 40 }
                    }
                });
            }
        }
    }

    private static async processLeader(tx: Prisma.TransactionClient, wallet: any, receiverId: string, fromUserId: string) {
        let newCount = wallet.leader_members_count + 1;
        
        if (wallet.leader_cycle === 1) {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    leader_members_count: newCount,
                    leader_resubscribe_fund: { increment: 16 },
                    champion_activation_fund: { increment: 64 }
                }
            });
            // Log all fund movements for audit trail (no income_wallet credit in Cycle 1)
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 16, `Leader Cycle 1 Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 64, `Leader Cycle 1 Champion Activation Fund from ${fromUserId}`);

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        leader_members_count: 0,
                        leader_cycle: { increment: 1 },
                        current_highest_pool: POOL_LEVELS[wallet.current_highest_pool as PoolLevel] < POOL_LEVELS['CHAMPION'] ? 'CHAMPION' : wallet.current_highest_pool,
                        leader_resubscribe_fund: { decrement: 80 }, 
                        champion_activation_fund: { decrement: 320 } 
                    }
                });
                
                const receiverUser = await tx.user.findUnique({ where: { id: receiverId } });
                if (receiverUser && receiverUser.sponsor_id) {
                    await this.processPoolDistribution(tx, receiverUser.sponsor_id, receiverId, 'CHAMPION');
                }
            }
        } else {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    leader_members_count: newCount,
                    leader_resubscribe_fund: { increment: 16 },
                    income_wallet: { increment: 64 }
                }
            });
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 16, `Leader Cycle ${wallet.leader_cycle} Resubscribe Fund from ${fromUserId}`);
            await this.logTransaction(tx, receiverId, TransactionType.BOOSTER_REWARD, 64, `Leader Cycle ${wallet.leader_cycle} Income from ${fromUserId}`);

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        leader_members_count: 0,
                        leader_cycle: { increment: 1 },
                        leader_resubscribe_fund: { decrement: 80 }
                    }
                });
            }
        }
    }

    private static async processChampion(tx: Prisma.TransactionClient, wallet: any, receiverId: string, fromUserId: string) {
        let newCount = wallet.champion_members_count + 1;
        
        if (wallet.champion_cycle === 1) {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    champion_members_count: newCount,
                    champion_resubscribe_fund: { increment: 64 },
                    main_plan_reserve_fund: { increment: 100 },
                    income_wallet: { increment: 156 }
                }
            });

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        champion_members_count: 0,
                        champion_cycle: { increment: 1 },
                        champion_resubscribe_fund: { decrement: 320 } 
                        // Progression stops here. $500 stays in main_plan_reserve_fund
                    }
                });
            }
        } else {
            await tx.boosterWallet.update({
                where: { id: wallet.id },
                data: { 
                    champion_members_count: newCount,
                    champion_resubscribe_fund: { increment: 64 },
                    income_wallet: { increment: 256 }
                }
            });

            if (newCount === 5) {
                await tx.boosterWallet.update({
                    where: { id: wallet.id },
                    data: {
                        champion_members_count: 0,
                        champion_cycle: { increment: 1 },
                        champion_resubscribe_fund: { decrement: 320 }
                    }
                });
            }
        }
    }

    private static async logTransaction(tx: Prisma.TransactionClient, userId: string, type: TransactionType, amount: number, description: string) {
        await tx.transaction.create({
            data: {
                user_id: userId,
                transaction_type: type,
                amount: amount,
                description: description,
                status: 'COMPLETED'
            }
        });
    }

  /**
   * Fetch all active Booster Plans from MySQL
   */
  static async getActivePlans(): Promise<FormattedPlan[]> {
    return await BoosterRepository.getActivePlans();
  }

  /**
   * Fetch a single Booster Plan by slug
   */
  static async getPlanBySlug(slug: string): Promise<FormattedPlan | null> {
    return await BoosterRepository.getPlanBySlug(slug);
  }

  /**
   * Update plan joining amount by slug
   */
  static async updatePlanBySlug(slug: string, newAmount: string): Promise<boolean> {
    return await BoosterRepository.updatePlanBySlug(slug, newAmount);
  }

  /**
   * Get user's active booster level, history, and status from MySQL
   */
  static async getUserCurrentPlan(userId: string) {
    return await BoosterRepository.getUserLevelData(userId);
  }

  /**
   * Check user eligibility on the backend for joining/upgrading booster levels
   */
  static async checkEligibility(userId: string, targetSlug?: string) {
    const evalResult = await UpgradeEligibilityService.evaluateEligibility(userId, targetSlug);
    return {
      eligible: evalResult.eligible,
      currentLevel: evalResult.currentLevel?.name || 'None',
      currentLevelOrder: evalResult.currentLevelOrder,
      targetLevel: evalResult.targetLevel?.name || 'Starter Booster',
      targetSlug: evalResult.targetLevel?.slug || 'starter',
      targetLevelOrder: evalResult.targetLevelOrder,
      requirements: evalResult.requirements,
      reasons: evalResult.reasons,
      eligibilitySnapshot: evalResult.eligibilitySnapshot,
    };
  }

  /**
   * Backend calculation engine: computes financial metrics loaded directly from MySQL
   */
  static async calculateBoosterMetrics(basePlan: number = 1.0): Promise<BoosterCalculationResult> {
    const safeBasePlan = Math.max(0.1, Number(basePlan) || 1.0);
    const plans = await BoosterRepository.getActivePlans();

    const uiThemes: Record<string, { accent: string; badgeBg: string; iconName: string }> = {
      starter: { accent: 'border-red-500 dark:border-red-600', badgeBg: 'bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-500', iconName: 'rocket' },
      builder: { accent: 'border-blue-500 dark:border-blue-600', badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-500', iconName: 'trending-up' },
      leader: { accent: 'border-orange-500 dark:border-orange-600', badgeBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/25 dark:text-orange-500', iconName: 'users' },
      champion: { accent: 'border-purple-500 dark:border-purple-600', badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-500', iconName: 'trophy' },
    };

    const tiers = plans.map((plan) => {
      const joiningAmtNum = parseFloat(plan.joiningAmount) * safeBasePlan;
      const upgradeAmtNum = parseFloat(plan.upgradeAmount) * safeBasePlan;
      const retopupAmtNum = parseFloat(plan.retopupAmount) * safeBasePlan;
      const collectionAmtNum = joiningAmtNum * plan.matrixSize;
      
      const netIncome = plan.slug === 'champion' ? safeBasePlan * 780.0 : 0.0;
      const theme = uiThemes[plan.slug] || uiThemes.starter;

      let desc = `Out of ${collectionAmtNum.toFixed(2)} USDT collected from ${plan.matrixSize} partners, ${retopupAmtNum.toFixed(2)} USDT recycles ${plan.name} and ${upgradeAmtNum.toFixed(2)} USDT upgrades position.`;
      if (plan.slug === 'champion') {
        desc = `Total collection of ${collectionAmtNum.toFixed(2)} USDT is distributed: ${retopupAmtNum.toFixed(2)} USDT for Champion re-topup, ${upgradeAmtNum.toFixed(2)} USDT to activate Main Plan, leaving ${netIncome.toFixed(2)} USDT as First Net Income.`;
      }

      return {
        name: plan.name,
        slug: plan.slug,
        levelOrder: plan.levelOrder,
        multiplier: `${parseFloat(plan.joiningAmount)}x`,
        joiningAmount: joiningAmtNum,
        upgradeAmount: upgradeAmtNum,
        retopupAmount: retopupAmtNum,
        collectionAmount: collectionAmtNum,
        netIncome,
        dailyCap: parseFloat(plan.dailyCap),
        matrixSize: plan.matrixSize,
        requiredDirectReferrals: plan.requiredDirectReferrals,
        requiredQualifiedBuilders: plan.requiredQualifiedBuilders,
        description: desc,
        accent: theme.accent,
        badgeBg: theme.badgeBg,
        iconName: theme.iconName,
      };
    });

    const mainPlanTotal = safeBasePlan * 500.0;
    const x5MatrixSplit = mainPlanTotal * 0.15;
    const forcedLevelPool = mainPlanTotal * 0.65;
    const perLevelIncome = forcedLevelPool / 13;
    const x4MatrixAllocation = mainPlanTotal * 0.20;

    return {
      basePlanAmount: safeBasePlan,
      tiers,
      mainPlan: {
        totalAmount: mainPlanTotal,
        x5MatrixSplit,
        forcedLevelPool,
        perLevelIncome,
        x4MatrixAllocation,
      },
      totalInvestedToMain: mainPlanTotal,
    };
  }
}
