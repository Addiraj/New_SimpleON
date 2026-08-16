import React from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, Network, Sparkles, ShieldCheck } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

interface CtaSectionProps {
  onConnectWallet?: () => void;
  onOpenMatrix?: () => void;
  onEnterDashboard?: () => void;
}

export default function CtaSection({ onConnectWallet, onOpenMatrix, onEnterDashboard }: CtaSectionProps) {
  const { isConnected, isConnecting } = useWeb3Store();
  return (
    <section
      id="cta-banner-section"
      className="py-24 relative overflow-hidden bg-gradient-to-br from-accent-red via-blue-700 to-accent-orange"
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Ambient glow orbs */}
      <div className="absolute -top-24 -left-24 w-[400px] h-[400px] bg-white/10 blur-[100px] rounded-full pointer-events-none animate-float" />
      <div className="absolute -bottom-32 -right-16 w-[450px] h-[450px] bg-white/10 blur-[100px] rounded-full pointer-events-none animate-float-delay" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-white/10 blur-[100px] rounded-full pointer-events-none animate-pulse-slow" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-5xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white border border-white/20 mb-6 backdrop-blur-sm">
            <Sparkles size={16} />
            <span>Start Building Your Matrix Network Today</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Ready to Activate Your <span className="underline decoration-white decoration-4 underline-offset-4">SimpleOn</span> Booster Slot?
          </h2>

          <p className="mt-6 text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Subscribe starting at $10 USDT (Starter Booster). Enjoy 100% peer-to-peer payout security, automatic slot re-topups, and 13-Level forced matrix spillovers.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={isConnected ? onEnterDashboard : onConnectWallet}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 rounded-full bg-white px-8 py-4 text-sm font-extrabold text-accent-red shadow-2xl hover:shadow-white/20 transition-shadow duration-300"
            >
              <Wallet size={18} />
              <span>{isConnecting ? 'Connecting...' : isConnected ? 'Enter Dashboard' : 'Connect Web3 Wallet'}</span>
              <ArrowUpRight size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenMatrix}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-full border-2 border-white/40 text-white px-8 py-4 text-sm font-extrabold hover:bg-white/10 transition-colors duration-300"
            >
              <Network size={18} />
              <span>Explore Matrix</span>
            </motion.button>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-white/70 font-mono">
            <span className="flex items-center space-x-1">
              <ShieldCheck size={14} className="text-white" />
              <span>100% Non-Custodial</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Sparkles size={14} className="text-white" />
              <span>Instant P2P Payouts</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
