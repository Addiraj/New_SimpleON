import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, ShieldCheck, Zap, Lock, RefreshCw, Layers } from 'lucide-react';

export default function WhyChooseSection() {
  const comparisonData = [
    {
      feature: 'Fund Custody & Control',
      simpleOn: '100% Non-Custodial (Direct P2P Wallet Delivery)',
      traditional: 'Centralized Platform Reserves (Risk of freezing/exit scam)',
      simpleOnGood: true
    },
    {
      feature: 'Payout Speed',
      simpleOn: 'Instant Smart Contract Execution (< 3 Seconds)',
      traditional: 'Manual Batch Requests (24h - 7 Days Approval)',
      simpleOnGood: true
    },
    {
      feature: 'Contract Auditability',
      simpleOn: '100% Open-Source BscScan Verified Code',
      traditional: 'Closed-Source Private Server Databases',
      simpleOnGood: true
    },
    {
      feature: 'Matrix Spillover Depth',
      simpleOn: '13-Level Forced 3x3 Auto Spillover Matrix',
      traditional: 'Shallow 2-3 Level Unilevel or Rigid Binary Pools',
      simpleOnGood: true
    },
    {
      feature: 'Slot Re-Topup Mechanics',
      simpleOn: 'Automated 5-Partner Re-Topup Reserve',
      traditional: 'Manual Re-Purchase Deadlines or Monthly Fees',
      simpleOnGood: true
    },
    {
      feature: 'Admin Alteration Risk',
      simpleOn: 'Immutable Rules — Zero Admin Override Capability',
      traditional: 'Admin can alter compensation plans anytime',
      simpleOnGood: true
    }
  ];

  return (
    <section id="why-choose-section" className="py-20 relative overflow-hidden bg-page">
      {/* Ambient accent-green glow orb */}
      <div className="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-accent-green/20 blur-3xl animate-pulse-slow -z-10" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-green/10 px-3.5 py-1.5 text-xs font-bold text-accent-green border border-accent-green/20 mb-3">
            <ShieldCheck size={14} />
            <span>Superior Web3 Architecture</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
              SimpleOn
            </span>
            ?
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            See how SimpleOn's autonomous BEP-20 smart contract outclasses traditional centralized network marketing platforms.
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-2xl md:rounded-3xl bg-surface border border-border-theme overflow-hidden shadow-lg"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border-theme text-sub uppercase font-mono tracking-wider text-[11px]">
                  <th className="py-4 px-6 font-bold w-1/3">Feature Benchmark</th>
                  <th className="py-4 px-6 font-bold w-1/3 text-accent-green bg-accent-green/5 border-t-2 border-accent-green">
                    SimpleOn Protocol
                  </th>
                  <th className="py-4 px-6 font-bold w-1/3 text-sub">Legacy Platforms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/50">
                {comparisonData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/50'} hover:bg-surface-elevated transition-colors`}
                  >
                    <td className="py-4 px-6 font-bold text-prime text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-accent-green/10 text-accent-green shrink-0">
                          {idx % 2 === 0 ? <Zap size={14} /> : <Lock size={14} />}
                        </div>
                        <span>{row.feature}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 bg-accent-green/5 border-x border-accent-green/10 text-prime font-bold text-xs">
                      <div className="flex items-start space-x-2">
                        <div className="p-1 rounded-full bg-accent-green/10 text-accent-green shrink-0 mt-0.5">
                          <CheckCircle2 size={14} />
                        </div>
                        <span className="text-prime leading-normal">{row.simpleOn}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sub text-xs">
                      <div className="flex items-start space-x-2">
                        <div className="p-1 rounded-full bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                          <XCircle size={14} />
                        </div>
                        <span className="text-sub leading-normal">{row.traditional}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
