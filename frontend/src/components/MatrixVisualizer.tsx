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
    <div className="section-container relative py-24 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-accent-blue/10 blur-[120px] animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-[600px] h-[600px] rounded-full bg-accent-purple/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative space-y-12"
      >
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-blue bg-accent-blue/10 border-accent-blue/20">
              <Network size={12} />
              <span>Matrix Visualizer</span>
            </span>
          </div>
          <h2 className="section-title">
            SimpleOn 13-Level, X5 & X4 Matrix Engines
          </h2>
          <p className="section-subtitle mx-auto">
            Interactive placement hierarchy and real-time reward allocation mapping for your active Base Plan of <strong className="text-accent-blue font-mono">{basePlan.toFixed(2)} USDT</strong>.
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex justify-center">
          <div className="p-1 rounded-full bg-surface-elevated border border-border-subtle inline-flex shadow-sm">
            {[
              { id: '13level', label: '13-Level Forced Matrix (65%)' },
              { id: 'x5split', label: 'X5 Matrix Split (15%)' },
              { id: 'x4passive', label: 'X4 Passive Pool (20%)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-full font-bold text-[13px] transition-all duration-200 ${
                  selectedTab === tab.id
                    ? 'bg-accent-blue text-white shadow-md'
                    : 'text-sub hover:text-prime hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Wrapper with Coming Soon Overlay */}
        <div className="relative mt-8">
          {/* Obscured/Blurred Content */}
          <div className="opacity-30 blur-[4px] pointer-events-none select-none transition-all duration-300">
            {/* Tab 1: 13-Level Forced Matrix Table */}
        {selectedTab === '13level' && (
          <div className="card overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 pb-6 border-b border-border-subtle gap-4 bg-surface-sunken">
              <div>
                <h3 className="text-[17px] font-extrabold text-prime">13-Level 3×3 Forced Matrix Breakdown</h3>
                <p className="text-[13px] text-sub mt-1.5">
                  65% of 100x Main Plan ({ (mainPlanCost * 0.65).toFixed(2) } USDT) distributed as <strong className="text-prime font-mono">{perLevelReward.toFixed(2)} USDT</strong> per level across 13 levels.
                </p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-mono text-[13px] font-black shrink-0">
                Per Level: {perLevelReward.toFixed(2)} USDT (5%)
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-surface-elevated text-muted font-bold uppercase text-[11px] tracking-wider border-b border-border-subtle">
                    <th className="py-4 px-6">Level</th>
                    <th className="py-4 px-6">Matrix Formula</th>
                    <th className="py-4 px-6">Level Capacity</th>
                    <th className="py-4 px-6">Reward / Node</th>
                    <th className="py-4 px-6">Total Level Potential</th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                  {matrixLevels.map((lvl) => (
                    <tr key={lvl.level} className="hover:bg-surface-elevated transition-colors">
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-accent-blue/10 text-accent-blue font-bold text-[13px]">
                          {lvl.level}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sub">3<sup>{lvl.level}</sup> Nodes</td>
                      <td className="py-4 px-6 font-bold text-prime">{lvl.capacity}</td>
                      <td className="py-4 px-6 text-accent-blue font-bold">{lvl.rewardPerNode.toFixed(2)} USDT</td>
                      <td className="py-4 px-6 text-accent-green font-bold">
                        {(typeof lvl.capacity === 'number' ? (lvl.capacity * lvl.rewardPerNode) : 0).toLocaleString()} USDT
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="badge badge-success px-2.5 py-1">
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
          <div className="card p-6 sm:p-8 space-y-8">
            <div className="pb-6 border-b border-border-subtle">
              <h3 className="text-[17px] font-extrabold text-prime">X5 Matrix Split Engine (15%)</h3>
              <p className="text-[13px] text-sub mt-1.5">
                Allocates 15% of Main Plan ({ (mainPlanCost * 0.15).toFixed(2) } USDT) across a 5-position matrix.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Position 1', title: 'Re-topup Wallet (20%)', amount: mainPlanCost * 0.15 * 0.20, color: 'text-accent-purple', borderHover: 'hover:border-accent-purple/30', desc: 'Automatically reserved to fund your matrix re-subscription when cycle finishes.' },
                { label: 'Position 2', title: 'Upgrade Wallet (40%)', amount: mainPlanCost * 0.15 * 0.40, color: 'text-accent-blue', borderHover: 'hover:border-accent-blue/30', desc: 'Accumulates capital to seamlessly auto-upgrade your account to subsequent matrix ranks.' },
                { label: 'Position 3', title: 'Direct Net Income (40%)', amount: mainPlanCost * 0.15 * 0.40, color: 'text-accent-green', borderHover: 'hover:border-accent-green/30', desc: 'Distributed instantly to your web3 wallet without holding periods or manual withdrawal delays.' }
              ].map((pos, idx) => (
                <div key={idx} className={`p-6 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3 transition-colors ${pos.borderHover}`}>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${pos.color}`}>{pos.label}</span>
                  <h4 className="text-[15px] font-extrabold text-prime">{pos.title}</h4>
                  <p className={`text-2xl font-mono font-black ${pos.color}`}>
                    {pos.amount.toFixed(2)} USDT
                  </p>
                  <p className="text-[13px] text-sub leading-relaxed pt-2 border-t border-border-subtle/50">
                    {pos.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: X4 Passive Matrix */}
        {selectedTab === 'x4passive' && (
          <div className="card p-6 sm:p-8 space-y-8">
            <div className="pb-6 border-b border-border-subtle">
              <h3 className="text-[17px] font-extrabold text-prime">X4 Passive 2×2 Spillover Matrix (20%)</h3>
              <p className="text-[13px] text-sub mt-1.5">
                Allocates 20% of Main Plan ({ (mainPlanCost * 0.20).toFixed(2) } USDT) into the global spillover recycling system.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-surface-sunken border border-border-subtle flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3">
                <span className="badge badge-brand text-accent-blue bg-accent-blue/10 border-accent-blue/20 uppercase tracking-wider text-[10px]">
                  Spillover Placement Engine
                </span>
                <h4 className="text-[17px] font-extrabold text-prime">Passive Upline & Downline Team Support</h4>
                <p className="text-[13px] text-sub max-w-xl leading-relaxed">
                  The X4 Matrix utilizes a 2×2 forced placement algorithm. Slots are automatically populated from active upstream referrers or global network activity.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-border-subtle text-center font-mono shadow-sm min-w-[200px]">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">Passive Pool Value</span>
                <span className="text-3xl font-black text-accent-blue">{(mainPlanCost * 0.20).toFixed(2)}</span>
                <span className="text-sub font-bold text-sm ml-1">USDT</span>
              </div>
            </div>
          </div>
        )}
          </div>

          {/* Coming Soon Overlay Box */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
             <div className="bg-surface/80 backdrop-blur-md border border-border-theme p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col items-center">
               <ShieldAlert className="text-amber-500 w-12 h-12 mb-4" />
               <h3 className="text-2xl font-black text-prime mb-3">Main Plan is Coming Soon</h3>
               <p className="text-sm text-sub leading-relaxed">
                 The 13-Level Pool, X5 Matrix Split, and X4 Passive Spillover structures are part of the upcoming Main Plan system upgrade.
               </p>
               <button className="mt-6 px-6 py-2.5 rounded-full bg-accent-blue/10 text-accent-blue font-bold text-sm border border-accent-blue/20">
                 Stay Tuned
               </button>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
