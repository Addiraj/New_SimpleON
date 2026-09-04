import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Network, ShieldAlert } from 'lucide-react';
import { getBoosterTierConfig, formatUsdt } from '../data/boosterPlan';

export default function MatrixVisualizer() {
  const visionary = getBoosterTierConfig('visionary')!;
  const [selectedTab, setSelectedTab] = useState<'part1' | 'part2'>('part1');

  const part1Amount = visionary.visionaryPart1Amount ?? 200;
  const part2Amount = visionary.visionaryPart2Amount ?? 300;
  const unitAmount = 15;
  const part2Levels = part2Amount / unitAmount; // 300 / 15 = 20

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
            Visionary's Dual Matrix Structure
          </h2>
          <p className="section-subtitle mx-auto">
            Visionary (<strong className="text-accent-blue font-mono">{formatUsdt(visionary.subscriptionAmount)}</strong>) is the top tier of the booster ladder, reached after Champion, and splits activation into two independent components.
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex justify-center">
          <div className="p-1 rounded-full bg-surface-elevated border border-border-subtle inline-flex shadow-sm">
            {[
              { id: 'part1', label: `Part 1 — X3 Matrix (${formatUsdt(part1Amount)})` },
              { id: 'part2', label: `Part 2 — 3×3, ${part2Levels} Levels (${formatUsdt(part2Amount)})` }
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

        {/* Tab Content */}
        <div className="relative mt-8">
          {/* Tab 1: Part 1 — X3 Recycling Matrix */}
          {selectedTab === 'part1' && (
            <div className="card p-6 sm:p-8 space-y-8">
              <div className="pb-6 border-b border-border-subtle">
                <h3 className="text-[17px] font-extrabold text-prime">Part 1 — X3 Recycling Matrix</h3>
                <p className="text-[13px] text-sub mt-1.5">
                  {formatUsdt(part1Amount)} of your Visionary activation funds a 3-position recycling matrix, structured the same way as Launch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-accent-purple">Cycle 1</span>
                  <h4 className="text-[15px] font-extrabold text-prime">Re-subscription</h4>
                  <p className="text-[13px] text-sub leading-relaxed">
                    Your first cycle's collection re-subscribes you into the next pool, keeping your matrix position active.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-accent-green">Cycle 2+</span>
                  <h4 className="text-[15px] font-extrabold text-prime">Income + Re-subscription</h4>
                  <p className="text-[13px] text-sub leading-relaxed">
                    Subsequent cycles pay income to your wallet alongside the re-subscription — uncapped, with no daily cycle limit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Part 2 — Forced 3-Wide, 20-Level Matrix */}
          {selectedTab === 'part2' && (
            <div className="card p-6 sm:p-8 space-y-8">
              <div className="pb-6 border-b border-border-subtle">
                <h3 className="text-[17px] font-extrabold text-prime">Part 2 — Forced 3-Wide, {part2Levels}-Level Matrix</h3>
                <p className="text-[13px] text-sub mt-1.5">
                  {formatUsdt(part2Amount)} of your Visionary activation funds a forced 3-wide matrix spanning {part2Levels} depth levels.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">Total Value</span>
                  <span className="text-2xl font-black text-accent-blue font-mono">{formatUsdt(part2Amount)}</span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">Width</span>
                  <span className="text-2xl font-black text-accent-blue font-mono">3-wide</span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">Depth</span>
                  <span className="text-2xl font-black text-accent-blue font-mono">{part2Levels} levels</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-surface-sunken border border-border-subtle flex items-start space-x-3">
                <ShieldAlert className="text-amber-500 w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-[13px] text-sub leading-relaxed">
                  Sized in {formatUsdt(unitAmount)} units ({part2Amount} ÷ {unitAmount} = {part2Levels} base units). Placement and occupancy tracking is fully live; reward and recycling rules for this component have not yet been finalized and will be published once confirmed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-sub max-w-lg mx-auto">
          Visionary is reached by completing Champion and is the ladder's final tier — there is no further upgrade target above it.
        </div>
      </motion.div>
    </div>
  );
}
