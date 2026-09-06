import React, { useState, useEffect } from 'react';
import { 
  Zap, Trophy, AlertTriangle, TrendingUp, CheckCircle2, 
  ShieldCheck, Clock, RefreshCw
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { cappingApi } from '../services/api';

export default function DailyCappingDashboard() {
  const { setActiveView } = useWeb3Store();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cappingStatus, setCappingStatus] = useState<any>(null);
  const [cappingLog, setCappingLog] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, historyRes] = await Promise.all([
        cappingApi.getStatus().catch(() => null),
        cappingApi.getHistory(1, 10).catch(() => null),
      ]);

      if (statusRes && statusRes.data) {
        setCappingStatus(statusRes.data);
      }

      if (historyRes && Array.isArray(historyRes.data?.history)) {
        const formattedLogs = historyRes.data.history.map((log: any) => {
          const allowedEarning = Number(log.allowedEarning ?? 0);
          const excessEarning = Number(log.excessEarning ?? 0);
          return {
            id: log.id,
            time: log.finalizedAt
              ? new Date(log.finalizedAt).toLocaleTimeString()
              : log.businessDate,
            type: log.levelName ? `${log.levelName.toUpperCase()}_CAPPING` : 'DAILY_CYCLE_CAPPING',
            amount: `+${allowedEarning.toFixed(2)} USDT`,
            capApplied: excessEarning > 0 ? `Capped (-${excessEarning.toFixed(2)} USDT to Upline)` : 'Pass (Limit Active)',
            status: allowedEarning > 0 ? 'APPROVED' : 'CAPPED',
          };
        });
        setCappingLog(formattedLogs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load daily capping details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pools = cappingStatus?.pools || [];
  const qualification = cappingStatus?.qualification || { builderCount: 0, leaderCount: 0, championCount: 0 };
  const qualifiesForSpillover = qualification.builderCount >= 2;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-amber-500" />
        <p className="text-sm text-sub font-mono">Loading real-time cycle metrics...</p>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {error && (
        <div className="p-4 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-between text-accent-red text-xs font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchData}
            className="px-3 py-1 rounded-xl bg-accent-red/20 hover:bg-accent-red/30 text-accent-red font-bold transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-500 border border-amber-500/20">
              <Zap size={14} />
              <span>Real-Time Cycle Capping Guard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Daily <span className="text-amber-500">Cycle Capping</span> Monitor
            </h1>
            <p className="text-xs sm:text-sm text-sub max-w-2xl leading-relaxed">
              Every Booster Pool limits the number of matrix cycles you can earn from daily.
              Qualify more direct referrals in higher tiers to increase your daily cycle limits.
            </p>
          </div>

          <button
            onClick={() => setActiveView('plans')}
            className="px-6 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all flex items-center space-x-2 shrink-0"
          >
            <Trophy size={16} />
            <span>Upgrade Active Plans</span>
          </button>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {pools.map((pool: any) => {
          const isCapped = pool.isCapped;
          const usagePercent = pool.dailyCycleLimit > 0 ? Math.min(100, (pool.completedCycleCount / pool.dailyCycleLimit) * 100) : 0;
          
          return (
            <div key={pool.poolName} className={`p-6 rounded-3xl border shadow-md space-y-4 ${isCapped ? 'bg-surface border-accent-red/30' : 'bg-surface border-border-theme'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-sub uppercase">{pool.poolName}</span>
                  <div className="text-2xl font-black font-mono text-prime">{pool.completedCycleCount} / {pool.dailyCycleLimit} Cycles</div>
                </div>
                {isCapped && (
                  <div className="px-2 py-1 rounded-md bg-accent-red/10 text-accent-red text-[10px] font-bold flex items-center space-x-1">
                    <AlertTriangle size={10} />
                    <span>CAPPED</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-border-theme h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${isCapped ? 'bg-accent-red' : 'bg-gradient-to-r from-emerald-500 to-amber-500'}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-sub font-mono">
                  <span>{pool.completedCycleCount} Completed</span>
                  <span>{pool.remainingCycles} Remaining</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-theme/50 flex justify-between items-center text-[11px]">
                <div className="text-sub">
                  <span className="block text-[9px] uppercase">Credited</span>
                  <span className="font-mono font-bold text-emerald-500">${Number(pool.creditedEarnings ?? 0).toFixed(2)}</span>
                </div>
                {pool.cappedCycleCount > 0 && (
                  <div className="text-right text-sub">
                    <span className="block text-[9px] uppercase text-accent-red">Capped Redirects</span>
                    <span className="font-mono font-bold text-accent-red">{pool.cappedCycleCount} Cycles</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Qualification Summary */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-prime flex items-center space-x-2">
            <ShieldCheck size={18} className="text-amber-500" />
            <span>Your Leadership Qualifications</span>
          </h2>
          <p className="text-xs text-sub mt-1">These directly determine your cycle cap limit (Minimum 5)</p>
        </div>
        <div className="flex space-x-4">
           <div className="text-center px-4 py-2 bg-surface-elevated rounded-xl border border-border-theme">
             <div className="text-2xl font-black text-emerald-500">{qualification.builderCount}</div>
             <div className="text-[10px] text-sub uppercase">Builders</div>
           </div>
           <div className="text-center px-4 py-2 bg-surface-elevated rounded-xl border border-border-theme">
             <div className="text-2xl font-black text-amber-500">{qualification.leaderCount}</div>
             <div className="text-[10px] text-sub uppercase">Leaders</div>
           </div>
           <div className="text-center px-4 py-2 bg-surface-elevated rounded-xl border border-border-theme">
             <div className="text-2xl font-black text-prime">{qualification.championCount}</div>
             <div className="text-[10px] text-sub uppercase">Champions</div>
           </div>
        </div>
      </div>

      {/* CAPPING LOG TABLE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border-theme">
          <h2 className="text-lg font-black text-prime flex items-center space-x-2">
            <Clock size={18} className="text-sub" />
            <span>Today's Distribution Audit Log</span>
          </h2>
          <span className="text-xs font-mono text-sub">{cappingLog.length} Verified Transactions</span>
        </div>

        {cappingLog.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-sub space-y-2">
            <Clock size={24} className="mx-auto text-sub/50" />
            <p>No distribution audit log entries recorded for today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Capping Status</th>
                  <th className="py-3 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {cappingLog.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-3.5 px-4 text-sub">{log.time}</td>
                    <td className="py-3.5 px-4 font-bold text-prime">{log.type}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-500">{log.amount}</td>
                    <td className="py-3.5 px-4 text-sub">{log.capApplied}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${log.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-accent-red/10 text-accent-red'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
