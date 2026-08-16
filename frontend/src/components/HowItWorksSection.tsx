import React from 'react';
import { motion } from 'motion/react';
import { Wallet, Layers, Users, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Connect Web3 Wallet',
      desc: 'Link your MetaMask, Trust Wallet, or Binance Web3 Wallet on BNB Smart Chain Testnet/Mainnet via SIWE authentication.',
      icon: <Wallet className="text-accent-red" size={24} />,
      badge: 'Step 1'
    },
    {
      num: '02',
      title: 'Select Booster Plan',
      desc: 'Subscribe starting at $100 USDT (Starter Booster). Approve USDT transfer and sign the smart contract deposit transaction.',
      icon: <Layers className="text-accent-blue" size={24} />,
      badge: 'Step 2'
    },
    {
      num: '03',
      title: '5-Partner Cycle Placement',
      desc: 'Your position fills through 5 direct referrals or team spillovers. Receive instant 20% direct commissions and 65% matrix allocations.',
      icon: <Users className="text-accent-orange" size={24} />,
      badge: 'Step 3'
    },
    {
      num: '04',
      title: 'Infinite Re-Topup & Main Plan Entry',
      desc: 'Upon 5th partner completion, system executes auto re-topup and reserves funds to auto-upgrade you into higher matrix pools.',
      icon: <RefreshCw className="text-accent-purple" size={24} />,
      badge: 'Step 4'
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
  };

  return (
    <section id="how-booster-works-section" className="py-20 relative overflow-hidden bg-surface-elevated/40 border-y border-border-theme">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 left-[8%] h-72 w-72 rounded-full bg-accent-blue/20 blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-24 right-[10%] h-80 w-80 rounded-full bg-accent-purple/20 blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-blue/10 px-3.5 py-1.5 text-xs font-bold text-accent-blue border border-accent-blue/20 mb-3">
            <Sparkles size={14} />
            <span>Frictionless Web3 Workflow</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            How the{' '}
            <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Booster Engine
            </span>{' '}
            Works
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            Four transparent steps to activate your position, earn direct referral bonuses, and scale through 13 matrix levels.
          </p>
        </div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="relative grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6"
        >
          {/* Desktop connecting line (behind the number badges) */}
          <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-accent-blue/40 to-transparent" />
          {/* Mobile connecting line */}
          <div className="lg:hidden absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-accent-blue/40 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="relative flex flex-col items-center text-center lg:items-start lg:text-left"
            >
              {/* Numbered badge */}
              <div className="relative z-10 mb-4 flex w-full justify-center lg:justify-start">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple font-black text-lg text-white shadow-sm">
                  {idx + 1}
                </div>
              </div>

              <div className="w-full p-6 rounded-2xl bg-surface border border-border-theme flex flex-col justify-between relative shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-accent-blue/30 transition-all duration-300 group">
                {/* Number watermark */}
                <span className="absolute top-4 right-4 font-mono font-black text-4xl text-sub/10 select-none group-hover:text-accent-blue/20 transition-colors">
                  {step.num}
                </span>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme shadow-sm">
                      {step.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface-elevated border border-border-theme text-[10px] font-mono font-bold text-sub">
                      {step.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-prime mb-2">{step.title}</h3>
                  <p className="text-xs text-sub leading-relaxed">{step.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-theme/60 flex items-center justify-between text-[11px] font-bold text-accent-blue">
                  <span>Automated On-Chain</span>
                  <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
