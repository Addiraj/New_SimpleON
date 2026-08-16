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
    <section id="referral-program-section" className="py-24 relative overflow-hidden bg-surface-sunken border-y border-border-subtle">
      {/* Ambient glow orbs */}
      <div className="absolute -top-24 -left-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent-orange/10 blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute -bottom-32 -right-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent-orange/5 blur-[120px] pointer-events-none" style={{ animationDelay: '2.5s' }} />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-orange bg-accent-orange/10 border-accent-orange/20">
              <Share2 size={12} />
              <span>High-Yield Network Growth</span>
            </span>
          </div>
          <h2 className="section-title">
            100% Peer-to-Peer <span className="text-gradient-brand">Referral Program</span>
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            Every subscription deposit is distributed 100% back to community members in real-time. Zero platform retention fees.
          </p>
        </div>

        {/* 4 Commission Distribution Pillars */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {[
            { icon: Users, label: '20% Direct', title: 'Direct Sponsor Bonus', desc: 'Earn 20% instant Web-20 USDT commission on every partner who joins directly via your referral link.', color: 'text-accent-orange', bg: 'bg-accent-orange/10', borderHover: 'hover:border-accent-orange/30' },
            { icon: Network, label: '65% Matrix', title: '13-Level Forced Pool', desc: '65% of revenue fuels the 13-level forced 3x3 matrix pool with automatic team spillover placements.', color: 'text-accent-blue', bg: 'bg-accent-blue/10', borderHover: 'hover:border-accent-blue/30' },
            { icon: PieChart, label: '15% X5 Split', title: 'X5 Matrix Split', desc: '15% allocated to the active 5-partner booster cycle engine to trigger automated slot re-topups.', color: 'text-accent-purple', bg: 'bg-accent-purple/10', borderHover: 'hover:border-accent-purple/30' },
            { icon: Sparkles, label: '20% X4 Spill', title: 'X4 Passive Spillover', desc: 'Global top-to-bottom matrix spillovers from upline team momentum reward non-recruiting positions.', color: 'text-accent-green', bg: 'bg-accent-green/10', borderHover: 'hover:border-accent-green/30' }
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={idx}
                variants={cardVariants}
                className={`card p-6 text-center transition-all duration-300 group flex flex-col items-center ${pillar.borderHover}`}
              >
                <div className={`mb-5 p-3 rounded-xl ${pillar.bg} ${pillar.color} w-fit group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-prime tracking-tight mb-2">{pillar.label}</div>
                <h3 className="text-[15px] font-extrabold text-prime mb-3">{pillar.title}</h3>
                <p className="text-[13px] text-sub leading-relaxed">
                  {pillar.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Copy Referral Link Banner */}
        <div className="card p-8 sm:p-10 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-orange/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="space-y-2 text-center md:text-left relative z-10">
            <div className="text-[11px] font-mono uppercase font-black text-accent-orange tracking-wider">Share Your Web3 Affiliate Code</div>
            <h3 className="text-[22px] font-extrabold text-prime">Ready to Build Your Network?</h3>
            <p className="text-[13px] text-sub">Copy your personal referral URL and share with your team to start earning instantly.</p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 relative z-10 shrink-0">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full sm:w-72 px-4 py-3.5 rounded-xl bg-surface-sunken border border-border-subtle text-[13px] font-mono text-sub truncate focus:outline-none focus:ring-2 focus:ring-accent-orange/30 shadow-inner"
            />
            <button
              onClick={handleCopy}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl text-white text-[13px] font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
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
