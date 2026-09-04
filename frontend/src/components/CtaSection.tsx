import React from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, Network, Sparkles, ShieldCheck } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { getBoosterTierConfig } from '../data/boosterPlan';

interface CtaSectionProps {
  onConnectWallet?: () => void;
  onOpenMatrix?: () => void;
  onEnterDashboard?: () => void;
}

export default function CtaSection({ onConnectWallet, onOpenMatrix, onEnterDashboard }: CtaSectionProps) {
  const { isConnected, isConnecting } = useWeb3Store();
  const launch = getBoosterTierConfig('launch')!;
  return (
    <section
      id="cta-banner-section"
      className="py-28 relative overflow-hidden bg-gradient-to-br from-accent-red via-blue-700 to-accent-orange"
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />

      {/* Ambient glow orbs */}
      <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-white/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-32 -right-16 w-[600px] h-[600px] bg-white/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="mb-8">
            <span className="badge badge-brand text-white bg-white/10 border-white/20 backdrop-blur-sm shadow-sm">
              <Sparkles size={12} />
              <span>Start Building Your Matrix Network Today</span>
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Ready to Activate Your <span className="underline decoration-white/50 decoration-4 underline-offset-8">SimpleOn</span> Booster Slot?
          </h2>

          <p className="mt-8 text-[15px] sm:text-[17px] text-white/80 max-w-2xl mx-auto leading-relaxed">
            Subscribe starting at ${launch.subscriptionAmount} USDT (Launch Booster). Enjoy 100% peer-to-peer payout security, automatic slot re-topups, and forced-matrix spillovers all the way to Visionary.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isConnected ? onEnterDashboard : onConnectWallet}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-8 py-4 text-[15px] font-extrabold text-accent-red shadow-xl hover:shadow-white/20 transition-all duration-300"
            >
              <Wallet size={18} />
              <span>{isConnecting ? 'Connecting...' : isConnected ? 'Enter Dashboard' : 'Connect Web3 Wallet'}</span>
              <ArrowUpRight size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenMatrix}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm text-white px-8 py-4 text-[15px] font-extrabold hover:bg-white/10 transition-colors duration-300 shadow-sm"
            >
              <Network size={18} />
              <span>Explore Matrix</span>
            </motion.button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-[11px] text-white/70 font-mono font-bold tracking-tight">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-white/90" />
              <span>100% Non-Custodial</span>
            </span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-white/90" />
              <span>Instant P2P Payouts</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
