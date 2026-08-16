import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Copy, Check, Share2, Sparkles, PieChart, ArrowUpRight, Network } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { referralApi } from '../services/api';
import { buildReferralUrl } from '../utils/referral';

export default function ReferralSection() {
  const { address, isAuthenticated } = useWeb3Store();
  const [copied, setCopied] = useState(false);
  const [liveReferralCode, setLiveReferralCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      referralApi.getLink().then((res) => {
        const data = res?.data || res;
        if (data?.referralCode) {
          setLiveReferralCode(data.referralCode);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const referralCode = liveReferralCode || (address ? `SO-${address.slice(-8).toUpperCase()}` : 'SO-F6D8976F');
  const referralLink = buildReferralUrl(referralCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
  };

  return (
    <section id="referral-program-section" className="py-20 relative overflow-hidden bg-page border-y border-border-theme">
      {/* Ambient glow orbs */}
      <div className="absolute -top-24 -left-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent-orange/20 blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute -bottom-32 -right-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent-orange/10 blur-3xl animate-float pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-orange/10 px-3.5 py-1.5 text-xs font-bold text-accent-orange border border-accent-orange/20 mb-3">
            <Share2 size={14} />
            <span>High-Yield Network Growth</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            100% Peer-to-Peer <span className="text-gradient-brand">Referral Program</span>
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            Every subscription deposit is distributed 100% back to community members in real-time. Zero platform retention fees.
          </p>
        </div>

        {/* 4 Commission Distribution Pillars */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >

          <motion.div
            variants={cardVariants}
            className="group rounded-2xl border border-border-theme bg-surface shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 hover:border-accent-orange/30 transition-all duration-300"
          >
            <div className="mx-auto mb-4 p-3 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-orange/5 text-accent-orange w-fit">
              <Users size={22} />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-gradient-brand mb-2">20% Direct</div>
            <h3 className="text-sm font-extrabold text-prime">Direct Sponsor Bonus</h3>
            <p className="mt-2 text-xs text-sub leading-relaxed">
              Earn 20% instant BEP-20 USDT commission on every partner who joins directly via your referral link.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="group rounded-2xl border border-border-theme bg-surface shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 hover:border-accent-orange/30 transition-all duration-300"
          >
            <div className="mx-auto mb-4 p-3 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-orange/5 text-accent-orange w-fit">
              <Network size={22} />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-gradient-brand mb-2">65% Matrix</div>
            <h3 className="text-sm font-extrabold text-prime">13-Level Forced Pool</h3>
            <p className="mt-2 text-xs text-sub leading-relaxed">
              65% of revenue fuels the 13-level forced 3x3 matrix pool with automatic team spillover placements.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="group rounded-2xl border border-border-theme bg-surface shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 hover:border-accent-orange/30 transition-all duration-300"
          >
            <div className="mx-auto mb-4 p-3 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-orange/5 text-accent-orange w-fit">
              <PieChart size={22} />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-gradient-brand mb-2">15% X5 Split</div>
            <h3 className="text-sm font-extrabold text-prime">X5 Matrix Split</h3>
            <p className="mt-2 text-xs text-sub leading-relaxed">
              15% allocated to the active 5-partner booster cycle engine to trigger automated slot re-topups.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="group rounded-2xl border border-border-theme bg-surface shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 hover:border-accent-orange/30 transition-all duration-300"
          >
            <div className="mx-auto mb-4 p-3 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-orange/5 text-accent-orange w-fit">
              <Sparkles size={22} />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-gradient-brand mb-2">20% X4 Spill</div>
            <h3 className="text-sm font-extrabold text-prime">X4 Passive Spillover</h3>
            <p className="mt-2 text-xs text-sub leading-relaxed">
              Global top-to-bottom matrix spillovers from upline team momentum reward non-recruiting positions.
            </p>
          </motion.div>

        </motion.div>

        {/* Copy Referral Link Banner */}
        <div className="p-8 rounded-3xl bg-surface border border-border-theme shadow-lg max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-xs font-mono uppercase font-bold text-accent-orange">Share Your Web3 Affiliate Code</div>
            <h3 className="text-xl font-extrabold text-prime">Ready to Build Your Network?</h3>
            <p className="text-xs text-sub">Copy your personal referral URL and share with your team to start earning instantly.</p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full sm:w-72 px-4 py-3 rounded-xl bg-surface-elevated border border-border-theme text-xs font-mono text-sub truncate focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
            />
            <button
              onClick={handleCopy}
              className={`w-full sm:w-auto px-6 py-3 rounded-full text-white text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 shrink-0 shadow-md ${
                copied
                  ? 'bg-accent-green shadow-accent-green/20'
                  : 'bg-accent-orange hover:bg-accent-orange/90 shadow-accent-orange/20'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied Link!' : 'Copy Referral Link'}</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
