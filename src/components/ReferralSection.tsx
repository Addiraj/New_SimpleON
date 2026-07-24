import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Copy, Check, Share2, Sparkles, PieChart, ArrowUpRight, Network } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { referralApi } from '../services/api';

export default function ReferralSection() {
  const { address, isAuthenticated } = useWeb3Store();
  const [copied, setCopied] = useState(false);
  const [liveLink, setLiveLink] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      referralApi.getLink().then((res) => {
        if (res?.data?.referralUrl) {
          setLiveLink(res.data.referralUrl);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const referralLink = liveLink || (address 
    ? `${window.location.origin}/?ref=${address}` 
    : 'https://simpleon.io/?ref=0x71C7656EC7ab88b098defB751B7401B5f6d8976F');

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="referral-program-section" className="py-20 relative bg-surface-elevated/30 border-y border-border-theme">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-orange/10 px-3.5 py-1.5 text-xs font-bold text-accent-orange border border-accent-orange/20 mb-3">
            <Share2 size={14} />
            <span>High-Yield Network Growth</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            100% Peer-to-Peer <span className="text-accent-red">Referral Program</span>
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            Every subscription deposit is distributed 100% back to community members in real-time. Zero platform retention fees.
          </p>
        </div>

        {/* 4 Commission Distribution Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          <div className="p-6 rounded-3xl bg-surface border border-border-theme space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 w-fit">
              <Users size={20} />
            </div>
            <div className="text-2xl font-black font-mono text-prime">20% Direct</div>
            <h3 className="text-sm font-extrabold text-prime">Direct Sponsor Bonus</h3>
            <p className="text-xs text-sub leading-relaxed">
              Earn 20% instant BEP-20 USDT commission on every partner who joins directly via your referral link.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border-theme space-y-3">
            <div className="p-3 rounded-2xl bg-accent-blue/10 text-accent-blue w-fit">
              <Network size={20} />
            </div>
            <div className="text-2xl font-black font-mono text-prime">65% Matrix</div>
            <h3 className="text-sm font-extrabold text-prime">13-Level Forced Pool</h3>
            <p className="text-xs text-sub leading-relaxed">
              65% of revenue fuels the 13-level forced 3x3 matrix pool with automatic team spillover placements.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border-theme space-y-3">
            <div className="p-3 rounded-2xl bg-accent-orange/10 text-accent-orange w-fit">
              <PieChart size={20} />
            </div>
            <div className="text-2xl font-black font-mono text-prime">15% X5 Split</div>
            <h3 className="text-sm font-extrabold text-prime">X5 Matrix Split</h3>
            <p className="text-xs text-sub leading-relaxed">
              15% allocated to the active 5-partner booster cycle engine to trigger automated slot re-topups.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border-theme space-y-3">
            <div className="p-3 rounded-2xl bg-accent-purple/10 text-accent-purple w-fit">
              <Sparkles size={20} />
            </div>
            <div className="text-2xl font-black font-mono text-prime">20% X4 Spill</div>
            <h3 className="text-sm font-extrabold text-prime">X4 Passive Spillover</h3>
            <p className="text-xs text-sub leading-relaxed">
              Global top-to-bottom matrix spillovers from upline team momentum reward non-recruiting positions.
            </p>
          </div>

        </div>

        {/* Copy Referral Link Banner */}
        <div className="p-8 rounded-3xl bg-surface border border-border-theme shadow-lg max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-xs font-mono uppercase font-bold text-accent-red">Share Your Web3 Affiliate Code</div>
            <h3 className="text-xl font-extrabold text-prime">Ready to Build Your Network?</h3>
            <p className="text-xs text-sub">Copy your personal referral URL and share with your team to start earning instantly.</p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full sm:w-72 px-4 py-3 rounded-xl bg-surface-elevated border border-border-theme text-xs font-mono text-sub truncate"
            />
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent-red text-white text-xs font-bold hover:bg-accent-red/90 transition-all flex items-center justify-center space-x-2 shrink-0 shadow-md shadow-accent-red/20"
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
