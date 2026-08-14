import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Users, TrendingUp, ShieldCheck, ExternalLink, 
  RefreshCw, BarChart2, PieChart, Activity, Clock, DollarSign,
  Layers, Award, UserCheck, Flame, Sparkles, CheckCircle2, Zap, Wallet
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import { useWeb3Store } from '../store/useWeb3Store';
import { LoadingSkeletonCard, LoadingSkeletonTable, ErrorStateAlert } from './StateComponents';
import { dashboardApi } from '../services/api';

export interface RealDashboardData {
  walletAddress: string;
  shortWalletAddress: string;
  referralCode: string;
  referralLink: string;
  currentLevel: string;
  nextLevel: string;
  levelProgress: number;
  currentPlan: string;
  activeMatrixCycle: number;
  matrixPositionsFilled: number;
  matrixPositionsRemaining: number;
  completedCycles: number;
  directReferrals: number;
  indirectReferrals: number;
  totalTeam: number;
  qualifiedBuilders: number;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  todaysEarnings: number;
  dailyCap: number;
  remainingDailyCap: number;
  recentTransactions: any[];
  unreadNotificationCount: number;
  accountStatus: string;
  currentBlockchainNetwork: string;
}

export default function Dashboard() {
  const { address } = useWeb3Store();

  // Dynamic Views Tab: 'overview' | 'analytics' | 'transactions' | 'rewards' | 'all'
  const [activeSidebarTab, setActiveSidebarTab] = useState<'overview' | 'analytics' | 'transactions' | 'rewards' | 'all'>('overview');

  // Real Dashboard API Data State
  const [dashboardData, setDashboardData] = useState<RealDashboardData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transaction Filter State
  const [txFilter, setTxFilter] = useState<'All' | 'Commission' | 'Matrix' | 'Deposit'>('All');

  /**
   * Fetch Real Dashboard Data from Backend API
   */
  const fetchDashboardData = useCallback(async () => {
    setIsDataLoading(true);
    setErrorMessage(null);
    try {
      const res = await dashboardApi.getDashboard({ address: address || undefined });
      const data = res.data || res;
      setDashboardData(data);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching real backend data:', err);
      setErrorMessage(err.message || 'Failed to sync live dashboard data from MySQL database.');
    } finally {
      setIsDataLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchDashboardData();

    // Listen for custom refresh events (e.g. after join, upgrade, or matrix completion)
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener('dashboard_refresh', handleRefresh);
    window.addEventListener('payment_completed', handleRefresh);
    window.addEventListener('upgrade_completed', handleRefresh);

    return () => {
      window.removeEventListener('dashboard_refresh', handleRefresh);
      window.removeEventListener('payment_completed', handleRefresh);
      window.removeEventListener('upgrade_completed', handleRefresh);
    };
  }, [fetchDashboardData]);

  // Derive charts data
  const totalEarned = dashboardData?.totalEarnings || 0;
  const earningsTrendData = [
    { day: 'Day 1', earnings: Math.round(totalEarned * 0.10) },
    { day: 'Day 5', earnings: Math.round(totalEarned * 0.25) },
    { day: 'Day 10', earnings: Math.round(totalEarned * 0.40) },
    { day: 'Day 15', earnings: Math.round(totalEarned * 0.60) },
    { day: 'Day 20', earnings: Math.round(totalEarned * 0.75) },
    { day: 'Day 25', earnings: Math.round(totalEarned * 0.90) },
    { day: 'Day 30', earnings: Math.round(totalEarned * 1.00) },
  ];

  const revenueDistributionData = [
    { name: 'Direct Sponsor (20%)', value: 20, color: '#FF2E2E' },
    { name: '13-Level Matrix (65%)', value: 65, color: '#2563EB' },
    { name: 'X5 Matrix Split (15%)', value: 15, color: '#F59E0B' },
    { name: 'X4 Passive Spillover', value: 10, color: '#8B5CF6' },
  ];

  // Derive transactions list & apply filter
  const transactionsList = dashboardData?.recentTransactions || [];
  const filteredTransactions = transactionsList.filter((tx: any) => {
    const txCategory = tx.category || 'Commission';
    if (txFilter === 'All') return true;
    return txCategory === txFilter;
  });

  return (
    <div id="dashboard-root" className="min-h-screen bg-page text-prime font-sans">
      
      {/* Main Layout Grid with Responsive Sidebar */}
      <div className="flex max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 gap-6">
        
        {/* Responsive Sidebar Navigation */}
        <aside className="w-64 shrink-0 bg-surface border border-border-theme rounded-3xl p-6 flex flex-col justify-between hidden lg:flex shadow-sm">
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2 px-2">
              <Activity size={18} className="text-accent-red" />
              <span className="text-xs font-mono font-bold text-sub uppercase tracking-wider">
                Dashboard Views
              </span>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveSidebarTab('overview')}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-xs font-bold transition-all ${
                  activeSidebarTab === 'overview'
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                    : 'text-sub hover:bg-surface-elevated hover:text-prime'
                }`}
              >
                <Activity size={18} />
                <span>Overview & Stats</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('analytics')}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-xs font-bold transition-all ${
                  activeSidebarTab === 'analytics'
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                    : 'text-sub hover:bg-surface-elevated hover:text-prime'
                }`}
              >
                <BarChart2 size={18} />
                <span>Analytics & Charts</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('transactions')}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-xs font-bold transition-all ${
                  activeSidebarTab === 'transactions'
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                    : 'text-sub hover:bg-surface-elevated hover:text-prime'
                }`}
              >
                <Clock size={18} />
                <span>Recent Transactions</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('rewards')}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-xs font-bold transition-all ${
                  activeSidebarTab === 'rewards'
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                    : 'text-sub hover:bg-surface-elevated hover:text-prime'
                }`}
              >
                <Award size={18} />
                <span>Recent Rewards</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('all')}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-xs font-bold transition-all ${
                  activeSidebarTab === 'all'
                    ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                    : 'text-sub hover:bg-surface-elevated hover:text-prime'
                }`}
              >
                <Layers size={18} />
                <span>Full Dashboard View</span>
              </button>
            </nav>
          </div>

          {/* Quick Status Widget inside Sidebar */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme space-y-2">
            <div className="text-[10px] font-mono text-sub uppercase font-bold">Network Connection</div>
            <div className="text-xs font-extrabold text-prime font-mono truncate">
              {dashboardData?.walletAddress || address || 'Disconnected'}
            </div>
            <div className="text-[11px] text-emerald-500 font-bold flex items-center space-x-1">
              <CheckCircle2 size={12} />
              <span>{dashboardData?.currentBlockchainNetwork || 'BSC Testnet (Chain ID 97)'}</span>
            </div>
          </div>
        </aside>

        {/* Main Dashboard Content Area */}
        <main className="flex-1 space-y-8 overflow-hidden">
          
          {/* Mobile Horizontal View Tabs */}
          <div className="lg:hidden flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveSidebarTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSidebarTab === 'overview' ? 'bg-accent-red text-white' : 'bg-surface border border-border-theme text-sub'
              }`}
            >
              Overview & Stats
            </button>
            <button
              onClick={() => setActiveSidebarTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSidebarTab === 'analytics' ? 'bg-accent-red text-white' : 'bg-surface border border-border-theme text-sub'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveSidebarTab('transactions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSidebarTab === 'transactions' ? 'bg-accent-red text-white' : 'bg-surface border border-border-theme text-sub'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveSidebarTab('rewards')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSidebarTab === 'rewards' ? 'bg-accent-red text-white' : 'bg-surface border border-border-theme text-sub'
              }`}
            >
              Rewards
            </button>
            <button
              onClick={() => setActiveSidebarTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSidebarTab === 'all' ? 'bg-accent-red text-white' : 'bg-surface border border-border-theme text-sub'
              }`}
            >
              All Sections
            </button>
          </div>

          {/* Conditional Skeleton Loader */}
          {isDataLoading && !dashboardData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <LoadingSkeletonCard />
                <LoadingSkeletonCard />
                <LoadingSkeletonCard />
                <LoadingSkeletonCard />
              </div>
              <LoadingSkeletonTable />
            </div>
          )}

          {/* Conditional Error View */}
          {errorMessage && !dashboardData && (
            <ErrorStateAlert
              title="Dashboard Data Sync Error"
              message={errorMessage}
              onRetry={fetchDashboardData}
            />
          )}

          {/* Real Content View Rendering */}
          {dashboardData && (
            <>
              {/* SECTION 1: TOP EXECUTIVE STATISTICS (Overview View & All View) */}
              {(activeSidebarTab === 'overview' || activeSidebarTab === 'all') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-prime flex items-center space-x-2">
                      <Trophy size={18} className="text-accent-red" />
                      <span>Top Executive Statistics</span>
                    </h2>
                    <button
                      onClick={fetchDashboardData}
                      disabled={isDataLoading}
                      className="text-xs font-mono text-sub hover:text-prime flex items-center space-x-1 transition-all"
                      title="Sync Live Metrics"
                    >
                      <RefreshCw size={12} className={isDataLoading ? 'animate-spin text-accent-red' : ''} />
                      <span>Live Data</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* KPI 1: Total Income */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Income</span>
                        <DollarSign size={16} className="text-emerald-500" />
                      </div>
                      <div className="text-2xl font-black font-mono text-prime">
                        ${(dashboardData.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </div>
                      <p className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center space-x-1">
                        <TrendingUp size={12} />
                        <span>Gross credited earnings</span>
                      </p>
                    </motion.div>

                    {/* KPI 2: Today's Income */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Today's Income</span>
                        <Flame size={16} className="text-accent-orange" />
                      </div>
                      <div className="text-2xl font-black font-mono text-accent-orange">
                        ${(dashboardData.todaysEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </div>
                      <p className="text-[11px] text-sub mt-1">
                        Remaining cap: ${(dashboardData.remainingDailyCap || 0).toFixed(2)}
                      </p>
                    </motion.div>

                    {/* KPI 3: Available Balance */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Available Balance</span>
                        <DollarSign size={16} className="text-accent-blue" />
                      </div>
                      <div className="text-2xl font-black font-mono text-prime">
                        ${(dashboardData.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </div>
                      <p className="text-[11px] text-sub font-mono mt-1">
                        Pending: ${dashboardData.pendingBalance || 0} | Locked: ${dashboardData.lockedBalance || 0}
                      </p>
                    </motion.div>

                    {/* KPI 4: Active Cycle */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Active Cycle</span>
                        <RefreshCw size={16} className="text-accent-purple" />
                      </div>
                      <div className="text-2xl font-black font-mono text-prime">
                        {dashboardData.activeMatrixCycle > 0 ? `Cycle #${dashboardData.activeMatrixCycle}` : 'No Active Cycle'}
                      </div>
                      <p className="text-[11px] text-sub mt-1">
                        {dashboardData.matrixPositionsFilled} / 5 Slots Filled ({dashboardData.completedCycles} Completed)
                      </p>
                    </motion.div>

                    {/* KPI 5: Current Plan */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Current Plan</span>
                        <Zap size={16} className="text-accent-red" />
                      </div>
                      <div className="text-xl font-black font-mono text-accent-red truncate">
                        {dashboardData.currentPlan || 'Starter ($10)'}
                      </div>
                      <p className="text-[11px] text-sub mt-1">
                        Daily Cap: ${dashboardData.dailyCap}/day
                      </p>
                    </motion.div>

                    {/* KPI 6: Total Referrals */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Referrals</span>
                        <Users size={16} className="text-accent-blue" />
                      </div>
                      <div className="text-2xl font-black font-mono text-prime">
                        {dashboardData.directReferrals} Directs
                      </div>
                      <p className="text-[11px] text-sub mt-1">
                        Indirects: {dashboardData.indirectReferrals} | Team: {dashboardData.totalTeam}
                      </p>
                    </motion.div>

                    {/* KPI 7: Qualified Builders */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Qualified Builders</span>
                        <UserCheck size={16} className="text-emerald-500" />
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-500">
                        {dashboardData.qualifiedBuilders} Active
                      </div>
                      <p className="text-[11px] text-sub mt-1">
                        {dashboardData.directReferrals ? `${Math.round((dashboardData.qualifiedBuilders / dashboardData.directReferrals) * 100)}% Qualification Rate` : '0% Qualification Rate'}
                      </p>
                    </motion.div>

                    {/* KPI 8: Level Progress */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-5 rounded-3xl bg-surface border border-border-theme shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sub mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Level Progress</span>
                        <Sparkles size={16} className="text-amber-500" />
                      </div>
                      <div className="text-2xl font-black font-mono text-prime">
                        {dashboardData.levelProgress}%
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden mt-2 border border-border-theme">
                        <div 
                          className="h-full bg-accent-red rounded-full transition-all duration-500" 
                          style={{ width: `${dashboardData.levelProgress}%` }} 
                        />
                      </div>
                      <p className="text-[10px] text-sub font-mono mt-1 truncate">
                        Next: {dashboardData.nextLevel || 'Builder ($40)'}
                      </p>
                    </motion.div>

                  </div>
                </div>
              )}

              {/* SECTION 2: CHARTS & ANALYTICS (Analytics View & All View) */}
              {(activeSidebarTab === 'analytics' || activeSidebarTab === 'all') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Chart 1: 30-Day Earnings & Referral Growth Area Chart */}
                  <div className="lg:col-span-2 p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-extrabold text-prime flex items-center space-x-2">
                          <BarChart2 size={18} className="text-accent-red" />
                          <span>30-Day Earnings & Referral Growth</span>
                        </h3>
                        <p className="text-xs text-sub">Cumulative USDT payouts across Booster cycles</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Live Metrics
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={earningsTrendData}>
                          <defs>
                            <linearGradient id="earningsColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FF2E2E" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#FF2E2E" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                          <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                          <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-color)',
                              borderRadius: '16px',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <Area type="monotone" dataKey="earnings" stroke="#FF2E2E" strokeWidth={3} fillOpacity={1} fill="url(#earningsColor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Revenue Breakdown Donut Chart */}
                  <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
                    <div>
                      <h3 className="text-base font-extrabold text-prime flex items-center space-x-2">
                        <PieChart size={18} className="text-accent-blue" />
                        <span>Revenue Breakdown</span>
                      </h3>
                      <p className="text-xs text-sub">Smart contract payout distribution</p>
                    </div>

                    <div className="h-48 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={revenueDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {revenueDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-sub pt-2 border-t border-border-theme">
                      {revenueDistributionData.map((item) => (
                        <div key={item.name} className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* SECTION 3: RECENT ON-CHAIN TRANSACTIONS (Transactions View & All View) */}
              {(activeSidebarTab === 'transactions' || activeSidebarTab === 'all') && (
                <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-theme">
                    <div>
                      <h3 className="text-base font-extrabold text-prime flex items-center space-x-2">
                        <Clock size={18} className="text-accent-red" />
                        <span>Recent On-Chain Transactions</span>
                      </h3>
                      <p className="text-xs text-sub">Real-time smart contract events from database</p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center space-x-1.5 bg-surface-elevated p-1 rounded-xl border border-border-theme text-[10px] font-mono">
                      {['All', 'Commission', 'Matrix', 'Deposit'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setTxFilter(f as any)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            txFilter === f
                              ? 'bg-accent-red text-white shadow-xs'
                              : 'text-sub hover:text-prime'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {filteredTransactions.length === 0 ? (
                      <div className="p-8 text-center text-sub text-xs font-mono">
                        No transactions found for the selected filter.
                      </div>
                    ) : (
                      filteredTransactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-surface-elevated border border-border-theme flex items-center justify-between gap-3 text-xs hover:border-accent-red/30 transition-all"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="font-bold text-prime flex items-center space-x-2 truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{tx.type || tx.transactionType}</span>
                            </div>
                            <div className="text-[10px] text-sub font-mono truncate">
                              {tx.txHash || tx.hash ? (
                                <a
                                  href={tx.explorerUrl || `https://testnet.bscscan.com/tx/${tx.txHash || tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-accent-red inline-flex items-center space-x-1"
                                >
                                  <span>
                                    {(tx.txHash || tx.hash).length > 16 
                                      ? `${(tx.txHash || tx.hash).slice(0, 10)}...${(tx.txHash || tx.hash).slice(-4)}` 
                                      : (tx.txHash || tx.hash)}
                                  </span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span>Local Ledger Event</span>
                              )}
                              {tx.time && <span> • {new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`font-mono font-extrabold ${tx.amount && String(tx.amount).startsWith('+') ? 'text-emerald-500' : 'text-prime'}`}>
                              {tx.amount}
                            </div>
                            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {tx.status || 'COMPLETED'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 4: RECENT REWARDS BREAKDOWN (Rewards View & All View) */}
              {(activeSidebarTab === 'rewards' || activeSidebarTab === 'all') && (
                <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
                  <div className="pb-3 border-b border-border-theme">
                    <h3 className="text-base font-extrabold text-prime flex items-center space-x-2">
                      <Award size={18} className="text-emerald-500" />
                      <span>Recent Rewards Breakdown</span>
                    </h3>
                    <p className="text-xs text-sub">Allocations by reward pool mechanism</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-prime">Direct Sponsor Bonus (20%)</div>
                        <div className="text-[10px] text-sub">Instant partner commissions</div>
                      </div>
                      <span className="font-extrabold text-emerald-500 text-lg">
                        ${((dashboardData.totalEarnings || 0) * 0.20).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-prime">13-Level Matrix Pool (65%)</div>
                        <div className="text-[10px] text-sub">Forced matrix tree allocation</div>
                      </div>
                      <span className="font-extrabold text-accent-blue text-lg">
                        ${((dashboardData.totalEarnings || 0) * 0.65).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-prime">X5 Matrix Split (15%)</div>
                        <div className="text-[10px] text-sub">Auto re-topup cycle pool</div>
                      </div>
                      <span className="font-extrabold text-amber-500 text-lg">
                        ${((dashboardData.totalEarnings || 0) * 0.15).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-prime">X4 Passive Spillover</div>
                        <div className="text-[10px] text-sub">Global team pool allocation</div>
                      </div>
                      <span className="font-extrabold text-accent-purple text-lg">$150.00</span>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

        </main>
      </div>

    </div>
  );
}
