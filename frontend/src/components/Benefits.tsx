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
    <section id="benefits-section" className="py-20 bg-page relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-accent-blue/5 blur-[120px] pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-4">
            <span className="badge badge-brand">
              <Sparkles size={12} />
              <span>Why SimpleOn</span>
            </span>
          </div>
          <h2 className="section-title">
            Engineered for <span className="text-gradient-brand">Longevity</span>
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            A decentralized referral platform built with a focus on mathematical sustainability, security, and immediate liquidity.
          </p>
        </div>

        {/* Grid layout */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {benefitsList.map((benefit, index) => {
            const accent = accents[index % accents.length];
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className={`card p-8 flex flex-col gap-4 group ${accent.border}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent.iconBg} ${accent.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-prime mb-2">{benefit.title}</h3>
                  <p className="text-[13px] text-sub leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
