import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Compass, Shield, Coins, AppWindow, Users } from 'lucide-react';

export default function Roadmap() {
  const roadmapItems = [
    {
      phase: 'Phase 1: Foundation',
      title: 'Smart Contract Deployment',
      date: 'Q3 2026',
      desc: 'Verify and publish the Core Booster and Main Plan smart contracts on EVM chain. Launch the decentralized frontend for public marketing.',
      status: 'active',
      icon: <Shield size={16} />
    },
    {
      phase: 'Phase 2: Platform Bootstrapping',
      title: 'Global Launch & Marketing',
      date: 'Q4 2026',
      desc: 'Initiate localized referral groups. Release promotional tools and expand training resources to accelerate the onboarding of the first 10,000 active positions.',
      status: 'upcoming',
      icon: <Users size={16} />
    },
    {
      phase: 'Phase 3: Ecosystem Expansion',
      title: 'Mobile App & Integrations',
      date: 'Q1 2027',
      desc: 'Publish dedicated Android and iOS progressive web apps. Integrate wallet connectors natively for seamless, one-tap mobile cycle tracking.',
      status: 'upcoming',
      icon: <AppWindow size={16} />
    },
    {
      phase: 'Phase 4: Multi-Token Engine',
      title: 'Cross-Chain Currency Pool',
      date: 'Q2 2027',
      desc: 'Introduce multi-token support including native INR stablecoins, BTC, ETH, and major custom utility tokens for automated conversion pathways.',
      status: 'upcoming',
      icon: <Coins size={16} />
    },
    {
      phase: 'Phase 5: Governance',
      title: 'DAO Transition',
      date: 'Q3 2027',
      desc: 'Deploy the DAO governance system, enabling long-term parameters (such as number of levels or matrix distribution splits) to be determined by the community.',
      status: 'upcoming',
      icon: <Compass size={16} />
    }
  ];

  return (
    <section id="roadmap-section" className="relative overflow-hidden py-16 bg-surface-elevated transition-colors duration-300">
      {/* Ambient accent-purple glow orbs */}
      <div className="pointer-events-none absolute -top-24 -right-32 h-96 w-96 rounded-full bg-accent-purple/20 blur-3xl animate-pulse-slow -z-10" />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-80 w-80 rounded-full bg-accent-purple/10 blur-3xl animate-pulse-slow -z-10" />

      <div id="roadmap-container" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div id="roadmap-header" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-purple/10 px-3.5 py-1.5 text-xs font-bold text-accent-purple border border-accent-purple/20 mb-3">
            <Compass size={14} />
            <span>Our Journey Ahead</span>
          </div>
          <h2 id="roadmap-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl">
            SimpleOn{' '}
            <span className="bg-gradient-to-r from-accent-purple via-accent-blue to-accent-orange bg-clip-text text-transparent">
              Growth Timeline
            </span>
          </h2>
          <p id="roadmap-subheading" className="mt-4 text-base text-sub">
            A strategic, long-term development pathway focused on expansion, mobile experience, and cross-chain capabilities.
          </p>
        </div>

        {/* Timeline Layout */}
        <div id="roadmap-timeline" className="relative max-w-3xl mx-auto pl-6 sm:pl-8 space-y-10">
          {/* Vertical gradient timeline line */}
          <div
            aria-hidden="true"
            className="absolute left-[3px] sm:left-[3px] top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-accent-purple via-accent-blue to-accent-orange opacity-60"
          />

          {roadmapItems.map((item, idx) => {
            const isActive = item.status === 'active';
            return (
              <motion.div
                key={idx}
                id={`roadmap-item-${idx}`}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: idx * 0.15, ease: 'easeOut' }}
                className="relative"
              >
                {/* Timeline node circle */}
                <div
                  id={`roadmap-node-${idx}`}
                  className={`absolute -left-[35px] sm:-left-[43px] top-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-accent-purple bg-gradient-to-br from-accent-purple to-accent-blue text-white shadow-md shadow-accent-purple/30'
                      : 'border-border-theme bg-surface text-sub'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-accent-purple/40 animate-ping"
                    />
                  )}
                  <span className="relative">{item.icon}</span>
                </div>

                {/* Card Container */}
                <div
                  id={`roadmap-card-${idx}`}
                  className="space-y-2 rounded-2xl border border-border-theme bg-surface shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div id={`roadmap-card-header-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <span id={`roadmap-card-phase-${idx}`} className="text-xs font-black uppercase tracking-wider text-accent-purple">
                      {item.phase}
                    </span>
                    <span id={`roadmap-card-date-${idx}`} className="inline-flex items-center space-x-1 text-xs font-bold text-sub mt-0.5 sm:mt-0">
                      <Calendar size={12} />
                      <span>{item.date}</span>
                    </span>
                  </div>

                  <h3 id={`roadmap-card-title-${idx}`} className="text-lg font-bold text-prime">
                    {item.title}
                  </h3>

                  <p id={`roadmap-card-desc-${idx}`} className="text-sm text-sub leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Roadmap note */}
        <div id="roadmap-disclaimer-note" className="mt-12 text-center text-xs text-sub max-w-md mx-auto italic">
          Disclaimer: This developmental roadmap is for illustrative planning purposes and is subject to smart contract audit results and governance updates.
        </div>

      </div>
    </section>
  );
}
