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
      desc: 'Standardized Web-20 USDT token transfers with strict return value checks.',
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
    <section id="security-audit-section" className="py-24 relative overflow-hidden bg-page">
      {/* Ambient accent-green glow orbs */}
      <div className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-accent-green/5 blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-accent-green/5 blur-[100px] animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-green bg-accent-green/10 border-accent-green/20">
              <ShieldCheck size={12} />
              <span>Smart Contract Security Verification</span>
            </span>
          </div>
          <h2 className="section-title">
            100% <span className="bg-gradient-to-r from-accent-green to-emerald-400 bg-clip-text text-transparent">Audited</span> &amp; Immutable
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            Our autonomous Web-20 smart contract logic cannot be shut down, modified, or altered by any central authority.
          </p>
        </div>

        {/* Security Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {securityBadges.map((badge, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: 'easeOut' }}
              className="card p-8 flex flex-col items-center text-center hover:-translate-y-1 hover:border-accent-green/30"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-accent-green/20 blur-[20px]" />
                <div className="relative p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green group-hover:scale-110 transition-transform duration-300">
                  {badge.icon}
                </div>
              </div>
              <h3 className="text-[15px] font-extrabold text-prime mb-3">{badge.title}</h3>
              <p className="text-[13px] text-sub leading-relaxed">{badge.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* BscScan Verified Contract Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="card p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto relative overflow-hidden"
        >
          {/* Subtle background decoration */}
          <div className="absolute inset-y-0 right-0 w-64 bg-accent-green/5 blur-[50px] pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-accent-green/20 blur-lg" />
              <div className="relative p-4 rounded-2xl bg-accent-green/10 text-accent-green border border-accent-green/20">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-prime">Verified Smart Contract Source Code</div>
              <div className="text-[11px] text-muted font-mono mt-1">Contract Address: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F</div>
            </div>
          </div>

          <a
            href="https://testnet.bscscan.com/address/0x71C7656EC7ab88b098defB751B7401B5f6d8976F#code"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary bg-surface border border-border-subtle text-prime hover:text-accent-green hover:border-accent-green/30 relative z-10 shrink-0"
          >
            <span>View Source on BscScan</span>
            <ExternalLink size={14} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
