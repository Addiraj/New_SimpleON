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
    <section id="why-choose-section" className="py-24 bg-page relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-accent-green/5 blur-[120px] pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-green bg-accent-green/10 border-accent-green/20">
              <ShieldCheck size={12} />
              <span>Superior Web3 Architecture</span>
            </span>
          </div>
          <h2 className="section-title">
            Why Choose <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">SimpleOn</span>?
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            See how SimpleOn's autonomous Web-20 smart contract outclasses traditional centralized network marketing platforms.
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border-subtle">
                  <th className="py-4 px-6 font-bold text-muted uppercase tracking-wider text-[11px] w-1/3">
                    Feature Benchmark
                  </th>
                  <th className="py-4 px-6 font-bold text-accent-green uppercase tracking-wider text-[11px] w-1/3 bg-accent-green/5 border-t-2 border-t-accent-green">
                    SimpleOn Protocol
                  </th>
                  <th className="py-4 px-6 font-bold text-muted uppercase tracking-wider text-[11px] w-1/3">
                    Legacy Platforms
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {comparisonData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-surface-elevated transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-prime">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-sunken text-muted shrink-0">
                          {idx % 2 === 0 ? <Zap size={16} /> : <Lock size={16} />}
                        </div>
                        <span>{row.feature}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 bg-accent-green/5 border-x border-accent-green/10 text-prime font-bold">
                      <div className="flex items-start gap-2.5">
                        <div className="text-accent-green shrink-0 mt-0.5">
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="leading-relaxed">{row.simpleOn}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sub">
                      <div className="flex items-start gap-2.5">
                        <div className="text-color-negative shrink-0 mt-0.5 opacity-80">
                          <XCircle size={16} />
                        </div>
                        <span className="leading-relaxed">{row.traditional}</span>
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
