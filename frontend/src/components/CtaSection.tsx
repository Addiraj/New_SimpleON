import React from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, Calculator, Sparkles, ShieldCheck } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

interface CtaSectionProps {
  onConnectWallet?: () => void;
  onOpenSimulator?: () => void;
  onEnterDashboard?: () => void;
}

export default function CtaSection({ onConnectWallet, onOpenSimulator, onEnterDashboard }: CtaSectionProps) {
  const { isConnected, isConnecting } = useWeb3Store();
  return (
    <section id="cta-banner-section" className="py-20 relative overflow-hidden">
      
      {/* Visual background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent-red/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-surface border border-border-theme p-8 sm:p-14 shadow-2xl relative overflow-hidden glass-panel text-center max-w-5xl mx-auto">
          
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-4 py-1.5 text-xs font-bold text-accent-red border border-accent-red/20 mb-6">
            <Sparkles size={16} />
            <span>Start Building Your Matrix Network Today</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-prime tracking-tight max-w-3xl mx-auto leading-tight">
            Ready to Activate Your <span className="text-accent-red">SimpleOn</span> Booster Slot?
          </h2>

          <p className="mt-6 text-base sm:text-lg text-sub max-w-2xl mx-auto leading-relaxed">
            Subscribe starting at $10 USDT (Starter Booster). Enjoy 100% peer-to-peer payout security, automatic slot re-topups, and 13-Level forced matrix spillovers.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={isConnected ? onEnterDashboard : onConnectWallet}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 rounded-full bg-accent-red px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-accent-red/30 hover:bg-accent-red/90 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Wallet size={18} />
              <span>{isConnecting ? 'Connecting...' : isConnected ? 'Enter Dashboard' : 'Connect Web3 Wallet'}</span>
              <ArrowUpRight size={18} />
            </button>

            <button
              onClick={onOpenSimulator}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-full border border-border-theme bg-surface-elevated px-8 py-4 text-sm font-extrabold text-prime hover:bg-border-theme transition-all duration-200"
            >
              <Calculator size={18} className="text-accent-red" />
              <span>Calculate Income Potential</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-sub font-mono">
            <span className="flex items-center space-x-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>100% Non-Custodial</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Sparkles size={14} className="text-accent-blue" />
              <span>Instant P2P Payouts</span>
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
