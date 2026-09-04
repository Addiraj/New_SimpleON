import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

// Tier chart colors — Launch through Visionary, matching Plans.tsx's palette.
const TIER_COLORS: Record<string, string> = {
  launch: '#10B981',
  starter: '#DC2626',
  builder: '#2563EB',
  leader: '#F59E0B',
  champion: '#9333EA',
  visionary: '#16A34A',
};

export class AdminController {

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const activePlans = await prisma.userLevel.count({ where: { status: 'ACTIVE' } });

      // Total Volume: real gross sum of every completed transaction (no fictional admin wallet —
      // the previous "adminWallet.total_income" was only ever populated by dead/orphaned code
      // and was always 0 in practice).
      const totalVolumeAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      });
      const totalVolume = totalVolumeAgg._sum.amount || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysDistributions = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          created_at: { gte: today },
          status: 'COMPLETED'
        }
      });

      // Charts data: real per-tier active-user counts (Launch through Visionary), replacing the
      // old booster_wallets-derived counts (that table was never populated — always zero).
      const levelConfigs = await prisma.levelConfiguration.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { level_order: 'asc' },
        select: { id: true, name: true, slug: true },
      });
      const planDistribution = await Promise.all(
        levelConfigs.map(async (level) => ({
          name: level.name,
          value: await prisma.user.count({ where: { current_level_id: level.id } }),
          color: TIER_COLORS[level.slug] || '#64748B',
        }))
      );

      // Daily Income (last 7 days)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 6);
      last7Days.setHours(0, 0, 0, 0);

      const transactions = await prisma.transaction.findMany({
        where: {
          created_at: { gte: last7Days },
          status: 'COMPLETED'
        },
        select: {
          amount: true,
          created_at: true
        }
      });

      const dailyIncomeMap: Record<string, number> = {};

      // Initialize last 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayString = d.toISOString().split('T')[0];
        dailyIncomeMap[dayString] = 0;
      }

      transactions.forEach(t => {
        const day = t.created_at.toISOString().split('T')[0];
        if (dailyIncomeMap[day] !== undefined) {
          dailyIncomeMap[day] += Number(t.amount);
        }
      });

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const dailyIncomeData = Object.entries(dailyIncomeMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, volume]) => ({
          day: daysOfWeek[new Date(day).getDay()],
          date: day,
          volume
        }));

      // Recent Users — real current tier, replacing the always-empty booster_wallet include.
      const recentUsers = await prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { current_level: true }
      });

      // Recent transactions overview (any type — the previous ADMIN_INCOME-only filter matched
      // a transaction type that was exclusively created by dead/orphaned code and would now
      // always be empty going forward).
      const recentTransactions = await prisma.transaction.findMany({
         orderBy: { created_at: 'desc' },
         take: 5,
         include: { user: { select: { wallet_address: true } } }
      });

      return res.status(200).json({
        success: true,
        data: {
          stats: {
            totalUsers,
            activePlans,
            totalVolume,
            todaysDistributions: todaysDistributions._sum.amount || 0
          },
          charts: {
            planDistribution,
            dailyIncomeData
          },
          recentUsers,
          recentTransactions
        }
      });
    } catch (error: any) {
      console.error('getDashboardStats error:', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: { current_level: true }
        }),
        prisma.user.count()
      ]);

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('getUsers error:', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getTransactions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: { user: { select: { wallet_address: true } } }
        }),
        prisma.transaction.count()
      ]);

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('getTransactions error:', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
