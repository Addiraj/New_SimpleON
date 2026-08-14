import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, Layers, DollarSign, Activity, Search, Filter, 
  TrendingUp, Download, AlertOctagon, Lock, RefreshCw, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { api, adminApi } from '../services/api';

export default function AdminDashboard({ setActiveAdminTab }: { setActiveAdminTab: (tab: any) => void }) {
  const [systemPaused, setSystemPaused] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('starter');
  const [planValue, setPlanValue] = useState(1.0);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlanValue = async () => {
      setIsLoadingPlan(true);
      try {
        const response: any = await api.get(`/booster/plans/${selectedPlanSlug}`);
        if (isMounted && response?.success && response?.data) {
          const val = parseFloat(response.data.joiningAmount || response.data.joining_amount || 1.0);
          setPlanValue(val);
        }
      } catch (err) {
        console.error('Failed to fetch plan value', err);
      } finally {
        if (isMounted) setIsLoadingPlan(false);
      }
    };
    fetchPlanValue();
    return () => { isMounted = false; };
  }, [selectedPlanSlug]);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardStats = async () => {
      setIsLoadingStats(true);
      try {
        const res = await adminApi.getDashboardStats();
        if (isMounted && res.success) {
          setStatsData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    };
    fetchDashboardStats();
    return () => { isMounted = false; };
  }, []);
  
  const handleSavePlan = () => {
    setShowWarningPopup(true);
  };

  const confirmSavePlan = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await api.put(`/booster/plans/${selectedPlanSlug}`, { joiningAmount: planValue });
      setShowWarningPopup(false);
    } catch (err) {
      console.error('Failed to update plan', err);
      alert('Failed to update plan');
    } finally {
      setIsSaving(false);
    }
  };

  const kpis = [
    { title: 'Total Registered Users', value: statsData?.stats?.totalUsers || 0, icon: <Users size={18} className="text-accent-red" /> },
    { title: 'Total Active Plans', value: statsData?.stats?.activePlans || 0, icon: <Layers size={18} className="text-accent-blue" /> },
    { title: 'Total Admin Volume', value: `$${parseFloat(statsData?.stats?.totalVolume || '0').toFixed(2)} USDT`, icon: <DollarSign size={18} className="text-emerald-500" /> },
    { title: 'Today\'s Distributions', value: `$${parseFloat(statsData?.stats?.todaysDistributions || '0').toFixed(2)} USDT`, icon: <TrendingUp size={18} className="text-amber-500" /> },
  ];

  const planDistribution = statsData?.charts?.planDistribution || [];
  const dailyIncomeData = statsData?.charts?.dailyIncomeData || [];
  const recentUsers = statsData?.recentUsers || [];
  const adminTransactions = statsData?.adminTransactions || [];

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-3.5 py-1 text-xs font-bold text-accent-red border border-accent-red/20">
              <ShieldCheck size={14} />
              <span>SimpleOn Protocol Admin Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Admin Control & <span className="text-accent-red">System Governance</span>
            </h1>
            <p className="text-xs sm:text-sm text-sub max-w-2xl leading-relaxed">
              Global smart contract telemetry, daily income distributions, user directory management, and circuit breaker actions.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSystemPaused(!systemPaused)}
              className={`px-5 py-3 rounded-2xl font-black text-xs shadow-md transition-all flex items-center space-x-2 ${
                systemPaused ? 'bg-emerald-500 text-white' : 'bg-accent-red text-white'
              }`}
            >
              <AlertOctagon size={16} />
              <span>{systemPaused ? 'Resume Smart Contract' : 'Pause Emergency Breaker'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Stats */}
      {isLoadingStats ? (
        <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-accent-red" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((s, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-2">
              <div className="flex justify-between items-center text-sub">
                <span className="text-[10px] font-mono font-bold uppercase">{s.title}</span>
                {s.icon}
              </div>
              <div className="text-3xl font-black font-mono text-prime">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* DYNAMIC PLAN CONFIGURATION */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex items-center space-x-2 pb-4 border-b border-border-theme">
          <Layers size={20} className="text-accent-red" />
          <h2 className="text-lg font-black text-prime uppercase">Dynamic Plan Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-xs font-mono font-bold text-sub block">Select Plan to Modify</label>
            <select 
              value={selectedPlanSlug}
              onChange={(e) => setSelectedPlanSlug(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime text-sm font-mono font-bold focus:outline-none focus:border-accent-red"
            >
              <option value="starter">Starter Booster Tier</option>
              <option value="builder">Builder Booster Tier</option>
              <option value="leader">Leader Booster Tier</option>
              <option value="champion">Champion Booster Tier</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className="text-sub">Plan Joining Value (USDT)</span>
              <span className="text-accent-red">
                {isLoadingPlan ? (
                  <RefreshCw size={14} className="animate-spin inline-block mr-1" />
                ) : null}
                ${planValue.toFixed(2)} USDT
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="1000"
              step="1"
              value={planValue}
              onChange={(e) => setPlanValue(parseFloat(e.target.value))}
              disabled={isLoadingPlan}
              className={`w-full py-3 accent-accent-red ${isLoadingPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSavePlan}
            disabled={isSaving}
            className={`px-6 py-3 rounded-2xl bg-accent-red text-white text-sm font-black shadow-lg shadow-accent-red/20 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-accent-red/90'}`}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* WARNING POPUP MODAL */}
      <AnimatePresence>
        {showWarningPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-2xl flex items-start space-x-3 border-2 border-amber-400">
              <AlertOctagon className="shrink-0 mt-0.5" size={24} />
              <div className="flex-1 space-y-3">
                <h3 className="font-black text-sm uppercase">Global System Warning</h3>
                <p className="text-xs font-semibold opacity-90 mt-1">
                  You are about to dynamically modify the plan value. 
                  <br />
                  <span className="font-black underline">This will immediately affect all user websites, calculation logic, and future joining fees.</span>
                </p>
                <div className="flex space-x-2 pt-2">
                  <button 
                    onClick={confirmSavePlan}
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-black shadow transition-all hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Yes, I Approve</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowWarningPopup(false)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-400/50 text-slate-900 rounded-lg text-xs font-black transition-all hover:bg-amber-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <button onClick={() => setShowWarningPopup(false)} disabled={isSaving} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHARTS ROW */}
      {!isLoadingStats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Income Chart */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-4">
            <h2 className="text-base font-black text-prime font-mono uppercase">Daily Income Distributions (USDT)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyIncomeData}>
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#FFF' }} />
                  <Bar dataKey="volume" fill="#DC2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution Pie */}
          <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-4">
            <h2 className="text-base font-black text-prime font-mono uppercase">Plan Distribution</h2>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                    {planDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT DIRECTORY (RECENT) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-theme">
          <h2 className="text-lg font-black text-prime">Recent Registered Users</h2>
          <button onClick={() => setActiveAdminTab('users')} className="text-accent-red font-bold text-sm hover:underline flex items-center">
            View All Users <ChevronRight size={16} />
          </button>
        </div>

        {isLoadingStats ? (
           <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-accent-red" size={24} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px]">
                  <th className="py-3 px-4">User Address</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {recentUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-prime">{u.wallet_address}</td>
                    <td className="py-3.5 px-4 font-bold text-accent-blue">{u.role}</td>
                    <td className="py-3.5 px-4 text-sub">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sub">No recent users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADMIN WALLET & TRANSACTION HISTORY */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border-theme">
          <div className="flex items-center space-x-2">
            <DollarSign size={20} className="text-emerald-500" />
            <h2 className="text-lg font-black text-prime uppercase">Recent Admin Transactions</h2>
          </div>
          <button onClick={() => setActiveAdminTab('transactions')} className="text-emerald-500 font-bold text-sm hover:underline flex items-center">
            View All Transactions <ChevronRight size={16} />
          </button>
        </div>

        {isLoadingStats ? (
          <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-emerald-500" size={24} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px]">
                  <th className="py-3 px-4">Tx Hash / ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">From User</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {adminTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-prime max-w-[120px] truncate" title={tx.blockchain_transaction_hash || tx.id}>
                      {tx.blockchain_transaction_hash || tx.id}
                    </td>
                    <td className="py-3.5 px-4"><span className="px-2 py-1 rounded bg-accent-blue/10 text-accent-blue font-bold text-[10px]">{tx.transaction_type}</span></td>
                    <td className="py-3.5 px-4 font-bold text-emerald-500">
                      +${parseFloat(tx.amount).toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-3.5 px-4 text-sub truncate max-w-[120px]">{tx.user?.wallet_address || 'System'}</td>
                    <td className="py-3.5 px-4 text-right text-sub">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {adminTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sub">No recent transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
