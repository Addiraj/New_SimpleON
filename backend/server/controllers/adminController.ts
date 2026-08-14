import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export class AdminController {
  
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const activePlans = await prisma.boosterWallet.count(); // Approximate active booster plans
      
      const adminWallet = await prisma.adminWallet.findUnique({ where: { id: 'ADMIN' } });
      const totalVolume = adminWallet?.total_income || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysDistributions = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          created_at: { gte: today },
          status: 'COMPLETED'
        }
      });
      
      // Charts data
      const boosterWallets = await prisma.boosterWallet.findMany();
      const planDistribution = [
        { name: 'Starter', value: boosterWallets.filter(w => w.current_highest_pool === 'STARTER').length, color: '#DC2626' },
        { name: 'Builder', value: boosterWallets.filter(w => w.current_highest_pool === 'BUILDER').length, color: '#2563EB' },
        { name: 'Leader', value: boosterWallets.filter(w => w.current_highest_pool === 'LEADER').length, color: '#F59E0B' },
        { name: 'Champion', value: boosterWallets.filter(w => w.current_highest_pool === 'CHAMPION').length, color: '#9333EA' },
      ];

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

      // Recent Users
      const recentUsers = await prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { booster_wallet: true }
      });

      // Admin Transactions overview
      const adminTransactions = await prisma.transaction.findMany({
         where: { transaction_type: { in: ['ADMIN_INCOME'] } },
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
          adminWallet,
          adminTransactions
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
          include: { booster_wallet: true }
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
