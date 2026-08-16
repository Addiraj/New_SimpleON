import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Network, Layers, HelpCircle, CheckCircle2, ChevronRight, Layers2, ShieldAlert } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

export default function MatrixVisualizer() {
  const { basePlan } = useWeb3Store();
  const [selectedTab, setSelectedTab] = useState<'13level' | 'x5split' | 'x4passive'>('13level');

  const mainPlanCost = basePlan * 100;
  const perLevelReward = (mainPlanCost * 0.65) / 13;

  const matrixLevels = Array.from({ length: 13 }, (_, i) => {
    const level = i + 1;
    const capacity = Math.pow(3, level);
    return {
      level,
      capacity: capacity > 1000000 ? capacity.toExponential(2) : capacity.toLocaleString(),
      rewardPerNode: perLevelReward,
      allocation: '5%',
      sampleFilled: Math.min(3, level * 2)
    };
  });

  return (
    <div className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Ambient background glow orbs */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-accent-blue/20 blur-3xl animate-pulse-slow"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-accent-purple/20 blur-3xl animate-pulse-slow"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative space-y-8"
      >
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-black bg-accent-blue/10 text-accent-blue rounded-full uppercase tracking-wider">
            <Network size={14} />
            <span>Web3 Matrix Structure Visualizer</span>
          </span>
          <h2 className="text-3xl font-extrabold text-prime sm:text-4xl">
            SimpleOn 13-Level, X5 & X4 Matrix Engines
          </h2>
          <p className="text-sm text-sub leading-relaxed">
            Interactive placement hierarchy and real-time reward allocation mapping for your active Base Plan of <strong className="text-accent-blue font-mono">{basePlan.toFixed(2)} USDT</strong>.
          </p>
        </div>

        {/* Selector Tabs - pill segmented control */}
        <div className="flex justify-center">
          <div className="p-1 rounded-full bg-surface-elevated border border-border-theme inline-flex space-x-1">
            <button
              onClick={() => setSelectedTab('13level')}
              className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all duration-300 ${
                selectedTab === '13level'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-sub hover:text-prime'
              }`}
            >
              13-Level Forced Matrix (65%)
            </button>
            <button
              onClick={() => setSelectedTab('x5split')}
              className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all duration-300 ${
                selectedTab === 'x5split'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-sub hover:text-prime'
              }`}
            >
              X5 Matrix Split (15%)
            </button>
            <button
              onClick={() => setSelectedTab('x4passive')}
              className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all duration-300 ${
                selectedTab === 'x4passive'
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-sub hover:text-prime'
              }`}
            >
              X4 Passive Pool (20%)
            </button>
          </div>
        </div>

        {/* Tab 1: 13-Level Forced Matrix Table */}
        {selectedTab === '13level' && (
          <div className="rounded-2xl border border-border-theme bg-surface shadow-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 pb-4 border-b border-border-theme gap-4">
              <div>
                <h3 className="text-xl font-black text-prime">13-Level 3×3 Forced Matrix Breakdown</h3>
                <p className="text-xs text-sub mt-1">
                  65% of 100x Main Plan ({ (mainPlanCost * 0.65).toFixed(2) } USDT) distributed as <strong className="text-prime font-mono">{perLevelReward.toFixed(2)} USDT</strong> per level across 13 levels.
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-mono text-xs font-black">
                Per Level: {perLevelReward.toFixed(2)} USDT (5%)
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-elevated text-sub font-bold uppercase text-xs tracking-wide">
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Matrix Formula</th>
                    <th className="py-3 px-4">Level Capacity</th>
                    <th className="py-3 px-4">Reward / Node</th>
                    <th className="py-3 px-4">Total Level Potential</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-theme/60 font-mono">
                  {matrixLevels.map((lvl) => (
                    <tr key={lvl.level} className="hover:bg-surface-elevated/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-accent-blue/10 text-accent-blue font-bold text-xs">
                          {lvl.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sub">3<sup>{lvl.level}</sup> Nodes</td>
                      <td className="py-3.5 px-4 font-bold text-prime">{lvl.capacity}</td>
                      <td className="py-3.5 px-4 text-accent-blue font-bold">{lvl.rewardPerNode.toFixed(2)} USDT</td>
                      <td className="py-3.5 px-4 text-accent-green font-bold">
                        {(typeof lvl.capacity === 'number' ? (lvl.capacity * lvl.rewardPerNode) : 0).toLocaleString()} USDT
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-accent-green/10 text-accent-green">
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: X5 Matrix Split */}
        {selectedTab === 'x5split' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border-theme shadow-lg space-y-6">
            <div className="pb-4 border-b border-border-theme">
              <h3 className="text-xl font-black text-prime">X5 Matrix Split Engine (15%)</h3>
              <p className="text-xs text-sub mt-1">
                Allocates 15% of Main Plan ({ (mainPlanCost * 0.15).toFixed(2) } USDT) across a 5-position matrix.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-border-theme space-y-3 hover:border-accent-purple/40 transition-colors">
                <span className="text-xs font-black uppercase tracking-wider text-accent-purple">Position 1</span>
                <h4 className="text-base font-extrabold text-prime">Re-topup Wallet (20%)</h4>
                <p className="text-2xl font-mono font-black text-accent-purple">
                  {(mainPlanCost * 0.15 * 0.20).toFixed(2)} USDT
                </p>
                <p className="text-xs text-sub leading-relaxed">
                  Automatically reserved to fund your matrix re-subscription when cycle finishes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-border-theme space-y-3 hover:border-accent-blue/40 transition-colors">
                <span className="text-xs font-black uppercase tracking-wider text-accent-blue">Position 2</span>
                <h4 className="text-base font-extrabold text-prime">Upgrade Wallet (40%)</h4>
                <p className="text-2xl font-mono font-black text-accent-blue">
                  {(mainPlanCost * 0.15 * 0.40).toFixed(2)} USDT
                </p>
                <p className="text-xs text-sub leading-relaxed">
                  Accumulates capital to seamlessly auto-upgrade your account to subsequent matrix ranks.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-border-theme space-y-3 hover:border-accent-green/40 transition-colors">
                <span className="text-xs font-black uppercase tracking-wider text-accent-green">Position 3</span>
                <h4 className="text-base font-extrabold text-prime">Direct Net Income (40%)</h4>
                <p className="text-2xl font-mono font-black text-accent-green">
                  {(mainPlanCost * 0.15 * 0.40).toFixed(2)} USDT
                </p>
                <p className="text-xs text-sub leading-relaxed">
                  Distributed instantly to your web3 wallet without holding periods or manual withdrawal delays.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: X4 Passive Matrix */}
        {selectedTab === 'x4passive' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border-theme shadow-lg space-y-6">
            <div className="pb-4 border-b border-border-theme">
              <h3 className="text-xl font-black text-prime">X4 Passive 2×2 Spillover Matrix (20%)</h3>
              <p className="text-xs text-sub mt-1">
                Allocates 20% of Main Plan ({ (mainPlanCost * 0.20).toFixed(2) } USDT) into the global spillover recycling system.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-elevated/40 border border-border-theme flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-accent-blue">Spillover Placement Engine</span>
                <h4 className="text-lg font-bold text-prime">Passive Upline & Downline Team Support</h4>
                <p className="text-xs text-sub max-w-xl leading-relaxed">
                  The X4 Matrix utilizes a 2×2 forced placement algorithm. Slots are automatically populated from active upstream referrers or global network activity.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border-theme text-center font-mono">
                <span className="text-xs text-sub block">Passive Pool Value</span>
                <span className="text-2xl font-black text-accent-blue">{(mainPlanCost * 0.20).toFixed(2)} USDT</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
