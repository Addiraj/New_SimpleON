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
    <div className="py-10 space-y-10">
      
      {/* Header Banner */}
      <div className="card p-8 sm:p-10 relative overflow-hidden bg-gradient-to-br from-surface-sunken to-surface">
        <div className="absolute top-0 right-0 p-32 bg-accent-red/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <div className="mb-2">
              <span className="badge badge-brand text-accent-red bg-accent-red/10 border-accent-red/20 shadow-sm">
                <ShieldCheck size={12} />
                <span>SimpleOn Protocol Admin Console</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Admin Control & <span className="text-accent-red">System Governance</span>
            </h1>
            <p className="text-[13px] sm:text-[14px] text-sub max-w-2xl leading-relaxed">
              Global smart contract telemetry, daily income distributions, user directory management, and circuit breaker actions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSystemPaused(!systemPaused)}
              className={`btn ${
                systemPaused ? 'bg-accent-green hover:bg-accent-green/90 text-slate-900 border-accent-green/50 shadow-accent-green/20' : 'btn-primary bg-color-negative border-color-negative/50 hover:bg-color-negative/90 shadow-color-negative/20'
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
            <div key={idx} className="card p-6 flex flex-col gap-3 hover:-translate-y-1">
              <div className="flex justify-between items-center text-sub">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{s.title}</span>
                <div className="p-2 rounded-xl bg-surface-sunken border border-border-subtle shrink-0">
                  {s.icon}
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-prime">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* DYNAMIC PLAN CONFIGURATION */}
      <div className="card p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
          <div className="p-2 rounded-xl bg-accent-red/10 border border-accent-red/20">
            <Layers size={18} className="text-accent-red" />
          </div>
          <h2 className="text-[15px] font-black text-prime uppercase tracking-wider">Dynamic Plan Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[11px] font-mono font-bold text-sub block uppercase tracking-wider">Select Plan to Modify</label>
            <select 
              value={selectedPlanSlug}
              onChange={(e) => setSelectedPlanSlug(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-surface-sunken border border-border-subtle text-prime text-[13px] font-mono font-bold focus:outline-none focus:border-accent-red transition-colors"
            >
              <option value="starter">Starter Booster Tier</option>
              <option value="builder">Builder Booster Tier</option>
              <option value="leader">Leader Booster Tier</option>
              <option value="champion">Champion Booster Tier</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className="text-sub uppercase tracking-wider">Plan Joining Value (USDT)</span>
              <span className="text-accent-red flex items-center gap-1.5 bg-accent-red/10 px-2 py-0.5 rounded border border-accent-red/20">
                {isLoadingPlan ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : null}
                ${planValue.toFixed(2)} USDT
              </span>
            </div>
            <div className="pt-2">
              <input
                type="range"
                min="1"
                max="1000"
                step="1"
                value={planValue}
                onChange={(e) => setPlanValue(parseFloat(e.target.value))}
                disabled={isLoadingPlan}
                className={`w-full h-2 bg-surface-sunken rounded-lg appearance-none cursor-pointer accent-accent-red ${isLoadingPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-border-subtle flex justify-end">
          <button
            onClick={handleSavePlan}
            disabled={isSaving}
            className={`btn btn-primary ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* WARNING POPUP MODAL */}
      <AnimatePresence>
        {showWarningPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-amber-500 text-slate-950 p-6 rounded-2xl shadow-2xl flex items-start gap-4 border border-amber-400">
              <div className="p-2 bg-slate-950/10 rounded-xl shrink-0">
                <AlertOctagon className="shrink-0" size={24} />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="font-black text-[14px] uppercase tracking-wider">Global System Warning</h3>
                <p className="text-[12px] font-semibold opacity-90 leading-relaxed">
                  You are about to dynamically modify the plan value. 
                  <br />
                  <span className="font-black underline decoration-slate-950/30 underline-offset-2">This will immediately affect all user websites, calculation logic, and future joining fees.</span>
                </p>
                <div className="flex gap-2 pt-3">
                  <button 
                    onClick={confirmSavePlan}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-[12px] font-black shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
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
                    className="px-5 py-2.5 bg-amber-400/50 border border-amber-400 text-slate-950 rounded-xl text-[12px] font-black transition-all hover:bg-amber-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <button onClick={() => setShowWarningPopup(false)} disabled={isSaving} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-1">
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
          <div className="lg:col-span-8 card p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <div className="p-2 rounded-xl bg-accent-red/10 border border-accent-red/20">
                <Activity size={18} className="text-accent-red" />
              </div>
              <h2 className="text-[15px] font-black text-prime font-mono uppercase tracking-wider">Daily Income Distributions (USDT)</h2>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyIncomeData}>
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', color: '#FFF' }} />
                  <Bar dataKey="volume" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution Pie */}
          <div className="lg:col-span-4 card p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <div className="p-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20">
                <Layers size={18} className="text-accent-blue" />
              </div>
              <h2 className="text-[15px] font-black text-prime font-mono uppercase tracking-wider">Plan Distribution</h2>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {planDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', color: '#FFF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT DIRECTORY (RECENT) */}
      <div className="card p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-prime/5 border border-border-subtle">
              <Users size={18} className="text-prime" />
            </div>
            <h2 className="text-[15px] font-black text-prime tracking-wider uppercase">Recent Registered Users</h2>
          </div>
          <button onClick={() => setActiveAdminTab('users')} className="text-accent-red font-bold text-[13px] hover:underline flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-surface">
            View All Users <ChevronRight size={14} />
          </button>
        </div>

        {isLoadingStats ? (
           <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-accent-red" size={24} /></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left font-mono text-[13px] border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border-subtle text-sub uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-4 font-bold">User Address</th>
                  <th className="py-4 px-4 font-bold">Role</th>
                  <th className="py-4 px-4 font-bold">Joined Date</th>
                  <th className="py-4 px-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {recentUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="py-4 px-4 font-bold text-prime">
                      <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle">
                        {u.wallet_address}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-accent-blue">{u.role}</td>
                    <td className="py-4 px-4 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${u.status === 'ACTIVE' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted text-[13px]">No recent users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADMIN WALLET & TRANSACTION HISTORY */}
      <div className="card p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign size={18} className="text-emerald-500" />
            </div>
            <h2 className="text-[15px] font-black text-prime tracking-wider uppercase">Recent Admin Transactions</h2>
          </div>
          <button onClick={() => setActiveAdminTab('transactions')} className="text-emerald-500 font-bold text-[13px] hover:underline flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-surface">
            View All Transactions <ChevronRight size={14} />
          </button>
        </div>

        {isLoadingStats ? (
          <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-emerald-500" size={24} /></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left font-mono text-[13px] border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border-subtle text-sub uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-4 font-bold">Tx Hash / ID</th>
                  <th className="py-4 px-4 font-bold">Type</th>
                  <th className="py-4 px-4 font-bold">Amount</th>
                  <th className="py-4 px-4 font-bold">From User</th>
                  <th className="py-4 px-4 font-bold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {adminTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="py-4 px-4 font-bold text-prime max-w-[120px] truncate" title={tx.blockchain_transaction_hash || tx.id}>
                      <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle">
                        {tx.blockchain_transaction_hash || tx.id}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg border border-accent-blue/20 bg-accent-blue/10 text-accent-blue font-bold text-[10px] uppercase tracking-wider">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-emerald-500">
                      +${parseFloat(tx.amount).toFixed(2)} <span className="text-[10px] text-emerald-500/70">{tx.currency}</span>
                    </td>
                    <td className="py-4 px-4 text-muted truncate max-w-[120px]">
                      {tx.user?.wallet_address ? (
                        <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle text-[11px] font-bold">
                          {tx.user.wallet_address}
                        </span>
                      ) : (
                        <span className="text-prime font-bold text-[11px] uppercase tracking-wider bg-surface-sunken px-2 py-1 rounded border border-border-subtle">System</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right text-muted">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {adminTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted text-[13px]">No recent transactions found.</td>
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
