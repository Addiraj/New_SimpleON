import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CheckCircle2, FileCode, AlertTriangle, ExternalLink } from 'lucide-react';

export default function SecuritySection() {
  const securityBadges = [
    {
      title: 'ReentrancyGuard Protocol',
      desc: 'Prevents re-entrancy attack vectors on deposit and payout distribution calls.',
      icon: <Lock className="text-accent-red" size={22} />
    },
    {
      title: 'SafeERC20 Implementation',
      desc: 'Standardized BEP-20 USDT token transfers with strict return value checks.',
      icon: <CheckCircle2 className="text-accent-blue" size={22} />
    },
    {
      title: 'EIP-712 Nonce Verification',
      desc: 'SIWE cryptographic signature authentication prevents replay attacks.',
      icon: <ShieldCheck className="text-accent-orange" size={22} />
    },
    {
      title: '100% Non-Custodial',
      desc: 'Zero platform reserve vault. Smart contract auto-routes funds directly P2P.',
      icon: <FileCode className="text-accent-purple" size={22} />
    }
  ];

  return (
    <section id="security-audit-section" className="py-20 relative overflow-hidden bg-page">
      {/* Ambient accent-green glow orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent-green/20 blur-3xl animate-pulse-slow -z-10" />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-80 w-80 rounded-full bg-accent-green/10 blur-3xl animate-pulse-slow -z-10" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-green/10 px-3.5 py-1.5 text-xs font-bold text-accent-green border border-accent-green/20 mb-3">
            <ShieldCheck size={14} />
            <span>Smart Contract Security Verification</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            100% <span className="bg-gradient-to-r from-accent-green to-emerald-400 bg-clip-text text-transparent">Audited</span> &amp; Immutable
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            Our autonomous BEP-20 smart contract logic cannot be shut down, modified, or altered by any central authority.
          </p>
        </div>

        {/* Security Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {securityBadges.map((badge, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: 'easeOut' }}
              className="rounded-2xl border border-border-theme bg-surface shadow-sm p-6 flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-1 hover:border-accent-green/30 transition-all duration-300"
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-accent-green/20 blur-lg" />
                <div className="relative p-4 rounded-full bg-accent-green/10">
                  {badge.icon}
                </div>
              </div>
              <h3 className="text-base font-extrabold text-prime">{badge.title}</h3>
              <p className="mt-2 text-xs text-sub leading-relaxed">{badge.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* BscScan Verified Contract Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="p-6 sm:p-8 rounded-3xl bg-surface-elevated border border-border-theme flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto"
        >
          <div className="flex items-center space-x-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-accent-green/20 blur-lg" />
              <div className="relative p-3.5 rounded-2xl bg-accent-green/10 text-accent-green">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-prime">Verified Smart Contract Source Code</div>
              <div className="text-xs text-sub font-mono mt-0.5">Contract Address: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F</div>
            </div>
          </div>

          <a
            href="https://testnet.bscscan.com/address/0x71C7656EC7ab88b098defB751B7401B5f6d8976F#code"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-full bg-surface border border-border-theme text-xs font-bold text-prime hover:border-accent-green/40 hover:text-accent-green transition-colors flex items-center space-x-2 shrink-0"
          >
            <span>View Source on BscScan</span>
            <ExternalLink size={14} />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
