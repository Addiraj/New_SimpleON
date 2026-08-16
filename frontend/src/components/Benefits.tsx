import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Zap, ShieldAlert, Award, Star, TrendingUp, Sparkles } from 'lucide-react';

export default function Benefits() {
  const benefitsList = [
    {
      icon: TrendingUp,
      title: 'Auto-Upgrade Engine',
      description: 'System automatically upgrades your position from collected pool revenues. No manual intervention or secondary deposit required.'
    },
    {
      icon: RefreshCw,
      title: 'Infinite Re-Topups',
      description: 'Your slots recycle automatically upon completion. Re-subscribe to the same tier and keep collecting without re-deposit.'
    },
    {
      icon: Star,
      title: 'Unlimited Cycles',
      description: 'Zero lifetime limits on matrix cycles. Each tier can cycle an unlimited number of times as your downline teammates scale up.'
    },
    {
      icon: Award,
      title: 'Dynamic Daily Capping',
      description: 'Unlock higher daily limits natively by qualifying more team members at subsequent booster tiers. Grow direct referrals to scale your cap.'
    },
    {
      icon: ShieldAlert,
      title: 'On-Chain Security',
      description: 'Operates as an autonomous smart contract. Execution rules are rigid, transparent, and completely protected from admin tampering.'
    },
    {
      icon: Zap,
      title: 'Instant P2P Delivery',
      description: 'All funds are immediately routed directly peer-to-peer to user wallets. Zero platform reserve funds, zero pending manual withdrawals.'
    }
  ];

  // Full-color accent cycle for the card grid — each card gets a literal,
  // statically-written class set so Tailwind's scanner can pick them all up.
  const accents = [
    {
      border: 'hover:border-accent-red/30',
      iconBg: 'bg-gradient-to-br from-accent-red/20 to-accent-red/5',
      iconColor: 'text-accent-red',
    },
    {
      border: 'hover:border-accent-blue/30',
      iconBg: 'bg-gradient-to-br from-accent-blue/20 to-accent-blue/5',
      iconColor: 'text-accent-blue',
    },
    {
      border: 'hover:border-accent-orange/30',
      iconBg: 'bg-gradient-to-br from-accent-orange/20 to-accent-orange/5',
      iconColor: 'text-accent-orange',
    },
    {
      border: 'hover:border-accent-green/30',
      iconBg: 'bg-gradient-to-br from-accent-green/20 to-accent-green/5',
      iconColor: 'text-accent-green',
    },
    {
      border: 'hover:border-accent-purple/30',
      iconBg: 'bg-gradient-to-br from-accent-purple/20 to-accent-purple/5',
      iconColor: 'text-accent-purple',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <section id="benefits-section" className="relative overflow-hidden bg-page py-16 transition-colors duration-300">

      {/* Ambient background glow orbs */}
      <div id="benefits-bg-glow-1" className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-accent-purple/10 blur-[110px] animate-pulse-slow pointer-events-none" />
      <div id="benefits-bg-glow-2" className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-accent-orange/10 blur-[110px] animate-pulse-slow pointer-events-none" />

      <div id="benefits-container" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div id="benefits-header" className="text-center max-w-3xl mx-auto mb-16">
          <div id="benefits-eyebrow-wrapper" className="flex justify-center mb-4">
            <span id="benefits-eyebrow" className="inline-flex items-center gap-2 rounded-full bg-accent-red/10 px-4 py-1.5 text-xs font-bold text-accent-red border border-accent-red/20">
              <Sparkles size={14} />
              WHY SIMPLEON
            </span>
          </div>
          <h2 id="benefits-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-prime">
            Why Choose <span className="text-gradient-brand">SimpleOn</span>?
          </h2>
          <p id="benefits-subheading" className="mt-4 text-base text-sub">
            Engineered with a focus on mathematical longevity, security, and immediate liquidity.
          </p>
        </div>

        {/* Grid layout */}
        <motion.div
          id="benefits-grid"
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {benefitsList.map((benefit, index) => {
            const accent = accents[index % accents.length];
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                id={`benefit-card-${index}`}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                className={`p-6 rounded-2xl bg-surface border border-border-theme shadow-sm hover:shadow-xl transition-all duration-300 ${accent.border}`}
              >
                <div id={`benefit-icon-wrapper-${index}`} className={`p-3 ${accent.iconBg} rounded-xl w-fit mb-4`}>
                  <Icon className={accent.iconColor} size={24} />
                </div>
                <h3 id={`benefit-title-${index}`} className="text-lg font-bold text-prime mb-2">{benefit.title}</h3>
                <p id={`benefit-desc-${index}`} className="text-sm text-sub leading-relaxed">{benefit.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
