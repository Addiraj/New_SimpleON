import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Zap, RefreshCw, Layers, ArrowRight, Play, Calculator, 
  Wallet, Sparkles, CheckCircle2, TrendingUp, Users, Network, ArrowUpRight 
} from 'lucide-react';

interface HeroProps {
  onCtaClick: (tabId: string) => void;
  onConnectWallet?: () => void;
}

export default function Hero({ onCtaClick, onConnectWallet }: HeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  return (
    <section id="hero-section" className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 transition-colors duration-300">
      
      {/* Background Glow Accents */}
      <div id="hero-bg-glow-1" className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent-red/10 blur-[120px] pointer-events-none" />
      <div id="hero-bg-glow-2" className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-accent-blue/10 blur-[100px] pointer-events-none" />
      <div id="hero-bg-grid" className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none opacity-40" />

      <div id="hero-content-container" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Headline & Subtitle */}
        <motion.div 
          id="hero-motion-div"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          {/* Audit Badge */}
          <motion.div id="hero-badge-wrapper" variants={itemVariants} className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-4 py-2 text-xs font-bold text-accent-red border border-accent-red/20 backdrop-blur-md shadow-sm">
            <ShieldCheck size={16} />
            <span>100% Audited BEP-20 Smart Contract Income Engine</span>
            <span className="flex h-2 w-2 rounded-full bg-accent-red animate-ping" />
          </motion.div>

          {/* Title */}
          <motion.h1 
            id="hero-heading"
            variants={itemVariants} 
            className="mt-6 text-4xl font-black tracking-tight text-prime sm:text-6xl lg:text-7xl leading-[1.08]"
          >
            Maximize Your Web3 Wealth with <span className="bg-gradient-to-r from-accent-red via-red-500 to-accent-orange bg-clip-text text-transparent">SimpleOn</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            id="hero-subheading"
            variants={itemVariants} 
            className="mt-6 text-base sm:text-lg md:text-xl text-sub max-w-3xl mx-auto leading-relaxed"
          >
            A revolutionary dual-plan crypto referral ecosystem. Enter with Starter Booster ($100 USDT) and scale through a 13-Level forced matrix with instant peer-to-peer payouts.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            id="hero-cta-group"
            variants={itemVariants} 
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              id="hero-primary-cta"
              onClick={onConnectWallet || (() => onCtaClick('dashboard'))}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 rounded-full bg-accent-red px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-accent-red/30 hover:bg-accent-red/90 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Wallet size={18} />
              <span>Connect Wallet & Start</span>
              <ArrowUpRight size={18} />
            </button>
            
            <button
              id="hero-secondary-cta"
              onClick={() => onCtaClick('calculator')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-full border border-border-theme bg-surface px-8 py-4 text-sm font-extrabold text-prime hover:bg-surface-elevated transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Calculator size={18} className="text-accent-red" />
              <span>Income Simulator</span>
            </button>

            <button
              id="hero-tertiary-cta"
              onClick={() => onCtaClick('matrix')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-full border border-border-theme bg-surface px-6 py-4 text-sm font-extrabold text-sub hover:text-prime hover:bg-surface-elevated transition-all duration-200"
            >
              <Network size={18} className="text-accent-blue" />
              <span>Explore Matrix</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Large Hero Graphic / Interactive Illustration */}
        <motion.div
          id="hero-graphic-illustration"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-14 relative mx-auto max-w-5xl"
        >
          {/* Main Glassmorphism Frame */}
          <div className="rounded-3xl border border-border-theme bg-surface/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            {/* Top Bar Mockup */}
            <div className="flex items-center justify-between pb-6 border-b border-border-theme/60">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-xs text-sub font-bold">BSC Smart Contract Node #0x71C7...976F</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Mainnet Live</span>
                </span>
              </div>
            </div>

            {/* Illustration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-center">
              
              {/* Left Column: Wallet Balance & Instant Commission Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-accent-red/10 group-hover:text-accent-red/20 transition-colors">
                    <Sparkles size={48} />
                  </div>
                  <div className="text-xs font-mono uppercase text-sub font-bold mb-1">Live Accumulated USDT</div>
                  <div className="text-3xl font-black font-mono text-prime">$1,245.00 <span className="text-xs text-emerald-500 font-bold">+100% P2P</span></div>
                  <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-border-theme">
                    <span className="text-sub">Cycle Status:</span>
                    <span className="font-bold text-accent-red">5-Partner Auto Re-Topup Active</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-sub mb-3">
                    <span>Recent On-Chain Payouts</span>
                    <span className="text-[10px] text-emerald-500 font-mono">0.02 sec avg</span>
                  </div>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-theme/60">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-prime font-bold">0x8f3C...A063</span>
                      </div>
                      <span className="text-emerald-500 font-bold">+$100.00 USDT</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-theme/60">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-accent-blue" />
                        <span className="text-prime font-bold">0x3c44...d293</span>
                      </div>
                      <span className="text-accent-blue font-bold">+$325.00 USDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 13-Level Matrix Node Visualizer Preview */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-elevated border border-border-theme relative flex flex-col justify-between min-h-[260px]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-prime flex items-center space-x-1.5">
                      <Network size={16} className="text-accent-red" />
                      <span>13-Level Forced Matrix Topology</span>
                    </h4>
                    <p className="text-[11px] text-sub">3x3 Auto-Spillover Position Allocation</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-accent-red/10 text-accent-red text-[10px] font-mono font-bold">
                    65% Level Pool
                  </span>
                </div>

                {/* Animated Graphic Nodes */}
                <div className="flex flex-col items-center justify-center my-4 space-y-3">
                  {/* Root Node */}
                  <div className="relative group">
                    <div className="h-12 w-12 rounded-2xl bg-accent-red text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-accent-red/30 animate-pulse">
                      YOU
                    </div>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-accent-red whitespace-nowrap">Root Level</span>
                  </div>

                  {/* Connectors */}
                  <div className="w-48 h-4 flex justify-between items-center px-6">
                    <div className="w-1/3 h-0.5 bg-accent-red/40" />
                    <div className="w-1/3 h-0.5 bg-accent-blue/40" />
                    <div className="w-1/3 h-0.5 bg-accent-orange/40" />
                  </div>

                  {/* Children Row */}
                  <div className="flex justify-between w-full max-w-sm px-4">
                    <div className="p-2.5 rounded-xl bg-surface border border-accent-red/40 text-center font-mono text-[10px] space-y-0.5">
                      <div className="font-bold text-accent-red">Direct A</div>
                      <div className="text-sub">+$20 USDT</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-accent-blue/40 text-center font-mono text-[10px] space-y-0.5">
                      <div className="font-bold text-accent-blue">Direct B</div>
                      <div className="text-sub">+$20 USDT</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-accent-orange/40 text-center font-mono text-[10px] space-y-0.5">
                      <div className="font-bold text-accent-orange">Spillover C</div>
                      <div className="text-sub">+$15 USDT</div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-sub font-mono pt-2 border-t border-border-theme">
                  Automated position placement: Left-to-Right, Top-to-Bottom
                </div>
              </div>

            </div>

          </div>
        </motion.div>

        {/* Highlight Cards Grid */}
        <motion.div 
          id="hero-highlights-grid"
          variants={itemVariants} 
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
        >
          {[
            {
              icon: <Zap className="text-accent-red" size={24} />,
              title: 'Instant Payouts',
              desc: 'Direct peer-to-peer BEP-20 USDT routing to your Web3 wallet.'
            },
            {
              icon: <RefreshCw className="text-accent-red" size={24} />,
              title: 'Auto Re-Topup',
              desc: '5-partner completion re-activates matrix slots automatically.'
            },
            {
              icon: <Layers className="text-accent-red" size={24} />,
              title: '13-Level Matrix',
              desc: '65% of revenue allocated into deep 3x3 forced spillover pools.'
            },
            {
              icon: <ShieldCheck className="text-accent-red" size={24} />,
              title: '100% Unalterable',
              desc: 'Immutable smart contract with zero admin custody of user funds.'
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              id={`hero-highlight-card-${idx}`}
              className="p-5 rounded-2xl bg-surface border border-border-theme transition-all duration-300 shadow-sm hover:shadow-md hover:border-accent-red/30 flex flex-col items-center text-center"
            >
              <div id={`hero-highlight-icon-${idx}`} className="p-3 bg-accent-red/10 rounded-xl mb-3">
                {item.icon}
              </div>
              <h3 id={`hero-highlight-title-${idx}`} className="text-sm font-bold text-prime">{item.title}</h3>
              <p id={`hero-highlight-desc-${idx}`} className="text-xs text-sub mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
