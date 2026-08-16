import React from 'react';
import { motion } from 'motion/react';
import { Network, ArrowUpRight, Zap, Target, Sparkles, CheckCircle } from 'lucide-react';

export default function About() {
  const steps = [
    {
      number: '01',
      title: 'Enter with 1 USDT',
      description: 'Subscribe to the Starter Booster Plan for just 10 USDT base plan. This unlocks your Starter matrix position.'
    },
    {
      number: '02',
      title: 'Refer & Collect',
      description: 'Refer partners. Direct collections automatically fund your active subscription and trigger automated upgrades.'
    },
    {
      number: '03',
      title: 'Booster Upgrades',
      description: 'Automatically advance from Starter (10) to Builder (40), Leader (80), and Champion (320) tiers as team members scale up.'
    },
    {
      number: '04',
      title: 'Trigger Main Plan (Coming Soon)',
      description: 'Upgrade from Champion into the Main Plan (500 USDT). Unlock the 15% X5 split, 65% 13-Level Pool, and 20% X4 Spillover modules.'
    }
  ];

  return (
    <section id="about-section" className="py-16 transition-colors duration-300">
      <div id="about-container" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div id="about-header" className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="about-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl">
            How SimpleOn Works
          </h2>
          <p id="about-subheading" className="mt-4 text-base text-sub">
            A frictionless, fully automated crypto referral system designed to accelerate growth on a low, accessible entry budget.
          </p>
        </div>

        {/* Steps Grid */}
        <div id="about-steps-grid" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              id={`about-step-card-${index}`}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative p-6 rounded-2xl bg-surface border border-border-theme transition-shadow hover:shadow-md"
            >
              <div id={`about-step-num-${index}`} className="absolute top-4 right-4 text-3xl font-black text-accent-red/10 select-none font-mono">
                {step.number}
              </div>
              <div id={`about-step-indicator-${index}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/10 text-accent-red font-extrabold text-sm mb-4">
                {index + 1}
              </div>
              <h3 id={`about-step-title-${index}`} className="text-lg font-bold text-prime mb-2">{step.title}</h3>
              <p id={`about-step-desc-${index}`} className="text-sm text-sub leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>

        {/* ===========================================
            2. TRUST PILLARS SECTION
           =========================================== */}
        <div id="trust-pillars-section" className="mt-20 pt-12 border-t border-border-theme/40">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-wider mb-2">
              Security & Transparency
            </span>
            <h3 className="text-2xl font-black text-prime">Unalterable Distribution Pillars</h3>
            <p className="text-sm text-sub mt-2">
              Our matrix runs on highly structured, transparent mathematical principles designed for maximum stability.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-surface border border-border-theme shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-accent-red/10 text-accent-red flex items-center justify-center mb-4">
                  <Zap size={20} />
                </div>
                <h4 className="text-base font-bold text-prime mb-2">Fully Automated</h4>
                <p className="text-xs text-sub leading-relaxed">
                  No manual approvals or delay bottlenecks. The calculation engine processes every matrix upgrade and position split instantly.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-surface border border-border-theme shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-4">
                  <ArrowUpRight size={20} />
                </div>
                <h4 className="text-base font-bold text-prime mb-2">Instant Distribution</h4>
                <p className="text-xs text-sub leading-relaxed">
                  Funds flow directly to partner wallets without holding periods, following peer-to-peer payout flows.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-surface border border-border-theme shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-accent-orange/10 text-accent-orange flex items-center justify-center mb-4">
                  <Network size={20} />
                </div>
                <h4 className="text-base font-bold text-prime mb-2">Transparent Rules</h4>
                <p className="text-xs text-sub leading-relaxed">
                  Every split, percentage limit, level fee, and cycle capping rule is hardcoded and fully visible. No hidden modifiers.
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-surface border border-border-theme shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mb-4">
                  <CheckCircle size={20} />
                </div>
                <h4 className="text-base font-bold text-prime mb-2">No Central Control</h4>
                <p className="text-xs text-sub leading-relaxed">
                  The mathematical layout ensures no administrator can modify, freeze, or alter a user's achieved position once confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Card / Detail */}
        <div id="about-matrix-breakdown" className="mt-20 rounded-3xl bg-surface-elevated p-8 md:p-12 border border-border-theme relative overflow-hidden">
          <div id="about-glow" className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent-red/5 blur-2xl pointer-events-none" />

          <div id="about-flex-container" className="grid gap-8 lg:grid-cols-12 items-center relative z-10">
            <div id="about-left-col" className="lg:col-span-7 space-y-6">
              <span id="about-eyebrow" className="inline-flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-accent-red">
                <Sparkles size={12} />
                <span>Modern Matrix Technology</span>
              </span>
              <h3 id="about-intro-title" className="text-2xl font-black text-prime md:text-3xl">
                The X5 / X4 Dual Matrix Advantage
              </h3>
              <p id="about-intro-p1" className="text-sm md:text-base text-sub leading-relaxed">
                SimpleOn splits rewards in real-time, eliminating the bottleneck of typical MLM structures. Our booster plan handles fast upgrades and re-topups, while the Main Plan implements a global forced matrix with deep placement spillovers.
              </p>

              <div id="about-list-group" className="grid sm:grid-cols-2 gap-4">
                {[
                  '100% Peer-to-Peer Distribution',
                  'Unlimited Retopup Cycles',
                  '13 levels of structured forced matrix',
                  'Transparent, unalterable rules',
                  'Dynamic referral-linked limits',
                  'Secure smart contract security'
                ].map((feature, i) => (
                  <div key={i} id={`about-list-item-${i}`} className="flex items-center space-x-2 text-sm text-prime">
                    <CheckCircle size={16} className="text-accent-red flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ===========================================
                3. STRUCTURE VISUALIZATION UPGRADE
               =========================================== */}
            <div id="about-right-col" className="lg:col-span-5 flex justify-center">
              <div id="about-visual-box" className="p-6 sm:p-8 rounded-2xl bg-surface border border-border-theme shadow-sm w-full max-w-md space-y-6">
                <div id="about-visual-badge" className="flex items-center space-x-2 pb-3 border-b border-border-theme justify-between">
                  <div className="flex items-center space-x-2">
                    <Network className="text-accent-red" size={18} />
                    <span id="about-visual-title" className="font-extrabold text-sm text-prime">Active Placement Engine</span>
                  </div>
                  <span className="text-[9px] bg-accent-red/10 text-accent-red px-2 py-0.5 rounded font-black tracking-widest uppercase">
                    Interactive Preview
                  </span>
                </div>

                {/* 2-Level Interactive Structural Tree with Tooltips */}
                <div id="about-placement-diagram" className="flex flex-col items-center py-2 space-y-4 relative">

                  {/* Root Level (Row 1) */}
                  <div className="relative group cursor-pointer z-10">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-110">
                      You
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-neutral-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-30 text-center font-bold">
                      Your Root Position<br />
                      <span className="text-accent-red font-mono">13-Level Forced Matrix</span>
                    </div>
                  </div>

                  {/* Root Connectors */}
                  <div className="w-40 h-3 relative pointer-events-none -mt-4 mb-1">
                    <svg className="w-full h-full text-border-theme/80 stroke-current" viewBox="0 0 100 10" fill="none">
                      <path d="M50,0 L50,5 M50,5 L10,5 L10,10 M50,5 L90,5 L90,10 M50,5 L50,10" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Level 1 Nodes (Row 2) */}
                  <div className="flex justify-between w-full px-4 relative z-10">
                    {/* Node A (Direct) */}
                    <div className="flex flex-col items-center relative group cursor-pointer w-1/3">
                      <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-surface flex items-center justify-center text-[10px] font-black text-white shadow-md transition-transform hover:scale-115">
                        A
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-neutral-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-30 text-center">
                        <span className="font-bold text-accent-red">Node A</span><br />
                        Direct Referral<br />
                        <span className="font-mono font-bold">Level 1 — 5.00 USDT</span>
                      </div>
                      {/* Sub-connectors */}
                      <svg className="w-12 h-3 mt-1 text-border-theme stroke-current" viewBox="0 0 100 20" fill="none">
                        <path d="M50,0 L50,10 M50,10 L15,10 L15,20 M50,10 L85,10 L85,20" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Node B (Direct) */}
                    <div className="flex flex-col items-center relative group cursor-pointer w-1/3">
                      <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-surface flex items-center justify-center text-[10px] font-black text-white shadow-md transition-transform hover:scale-115">
                        B
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-neutral-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-30 text-center">
                        <span className="font-bold text-accent-red">Node B</span><br />
                        Direct Referral<br />
                        <span className="font-mono font-bold">Level 1 — 5.00 USDT</span>
                      </div>
                      {/* Sub-connectors */}
                      <svg className="w-12 h-3 mt-1 text-border-theme stroke-current" viewBox="0 0 100 20" fill="none">
                        <path d="M50,0 L50,10 M50,10 L15,10 L15,20 M50,10 L85,10 L85,20" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Node C (Spillover) */}
                    <div className="flex flex-col items-center relative group cursor-pointer w-1/3">
                      <div className="h-8 w-8 rounded-full bg-neutral-400 dark:bg-neutral-600 border-2 border-surface flex items-center justify-center text-[10px] font-black text-white shadow-md transition-transform hover:scale-115">
                        C
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-neutral-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-30 text-center">
                        <span className="font-bold text-sub">Node C</span><br />
                        Spillover Placement<br />
                        <span className="font-mono font-bold text-sub">Level 1 — 5.00 USDT</span>
                      </div>
                      {/* Sub-connectors */}
                      <svg className="w-12 h-3 mt-1 text-border-theme stroke-current" viewBox="0 0 100 20" fill="none">
                        <path d="M50,0 L50,10 M50,10 L15,10 L15,20 M50,10 L85,10 L85,20" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Level 2 Sub-nodes (Row 3) */}
                  <div className="flex justify-between w-full px-1 relative z-10 -mt-1.5">
                    {/* Sub-nodes of A */}
                    <div className="flex justify-around w-1/3 px-1">
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-blue-400 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          A1
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Direct Referral A1<br />
                          <span className="font-mono font-bold text-accent-red">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-neutral-400 dark:bg-neutral-500 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          A2
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Spillover A2<br />
                          <span className="font-mono font-bold">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-nodes of B */}
                    <div className="flex justify-around w-1/3 px-1">
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-blue-400 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          B1
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Direct Referral B1<br />
                          <span className="font-mono font-bold text-accent-red">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-blue-400 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          B2
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Direct Referral B2<br />
                          <span className="font-mono font-bold text-accent-red">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-nodes of C */}
                    <div className="flex justify-around w-1/3 px-1">
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-neutral-400 dark:bg-neutral-500 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          C1
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Spillover C1<br />
                          <span className="font-mono font-bold">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <div className="h-6 w-6 rounded-full bg-neutral-400 dark:bg-neutral-500 border border-surface flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-115">
                          C2
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 bg-neutral-900 text-white text-[9px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 text-center">
                          Spillover C2<br />
                          <span className="font-mono font-bold">Level 2 — 5.00 USDT</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Legend */}
                <div id="about-diagram-legend" className="flex justify-center items-center space-x-6 text-[10px] font-bold border-t border-border-theme pt-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" />
                    <span className="text-prime">Direct referral</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600 inline-block" />
                    <span className="text-sub">Spillover placement</span>
                  </div>
                </div>

                <div id="about-disclaimer" className="text-[10px] text-center text-sub leading-normal">
                  Placement follows forced 3×3/2×2 parameters: top-to-bottom and left-to-right spillover.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
