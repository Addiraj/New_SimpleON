import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ShieldCheck, Check, ArrowRight, ExternalLink, Key, RefreshCw } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

export default function WalletPreviewSection() {
  const { isConnected, address, chainId, openWalletModal, disconnectWallet } = useWeb3Store();
  const [activeTab, setActiveTab] = useState<'metamask' | 'trust' | 'binance'>('metamask');

  const formatAddr = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  return (
    <section id="wallet-connection-preview-section" className="py-24 relative overflow-hidden bg-page border-y border-border-subtle">
      {/* Background Glow Accents */}
      <div className="absolute top-10 -left-32 h-[420px] w-[420px] rounded-full bg-accent-green/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-0 -right-32 h-[380px] w-[380px] rounded-full bg-accent-green/5 blur-[110px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2.5s' }} />

      <motion.div
        className="section-container relative z-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-green bg-accent-green/10 border-accent-green/20">
              <Key size={12} />
              <span>Web3 Self-Custody First</span>
            </span>
          </div>
          <h2 className="section-title">
            Non-Custodial <span className="bg-gradient-to-r from-accent-green via-emerald-500 to-teal-400 bg-clip-text text-transparent">Wallet Connection</span>
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            Connect directly using standard EVM providers. SIWE (Sign-In with Ethereum / EIP-4361) verifies your identity without revealing private keys.
          </p>
        </motion.div>

        {/* Interactive Wallet Connection Card */}
        <motion.div
          variants={itemVariants}
          className="max-w-4xl mx-auto card p-8 sm:p-10 relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            {/* Left Col: Supported Provider Tabs */}
            <div className="md:col-span-5 space-y-5">
              <h3 className="text-[11px] font-black uppercase text-muted tracking-wider font-mono">Supported Web3 Wallets</h3>

              <div className="space-y-3">
                {[
                  { id: 'metamask', name: 'MetaMask Wallet', desc: 'Browser Extension & Mobile App', badge: 'Recommended' },
                  { id: 'trust', name: 'Trust Wallet', desc: 'Mobile Web3 & dApp Browser', badge: 'EVM Ready' },
                  { id: 'binance', name: 'Binance Web3 Wallet', desc: 'Direct BNB Smart Chain Integration', badge: 'BSC Optimized' },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setActiveTab(w.id as any)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                      activeTab === w.id
                        ? 'border-accent-green bg-accent-green/5 shadow-sm'
                        : 'border-border-subtle bg-surface hover:bg-surface-elevated'
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-bold text-prime">{w.name}</div>
                      <div className="text-[11px] text-sub mt-1">{w.desc}</div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-surface-sunken border border-border-subtle text-accent-green">
                      {w.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Col: Connection Status & Interactive Trigger */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="md:col-span-7 p-6 rounded-2xl bg-surface-sunken border border-border-subtle space-y-6"
            >
              <div className="flex justify-between items-center pb-5 border-b border-border-subtle">
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted font-bold">Network RPC Status</div>
                  <div className="text-[13px] font-extrabold text-prime flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>BNB Smart Chain (BSC Testnet ID 97)</span>
                  </div>
                </div>
                <div className="bg-accent-green/10 rounded-xl p-3 border border-accent-green/20 shrink-0">
                  <ShieldCheck size={20} className="text-accent-green" />
                </div>
              </div>

              {/* Status Display */}
              <div className="space-y-3 font-mono text-[11px]">
                <div className="flex justify-between p-3 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-sub">Connection Mode:</span>
                  <span className="text-prime font-bold">In-Browser EIP-1193 Provider</span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-sub">Connected Account:</span>
                  <span className="text-accent-green font-bold">
                    {isConnected && address ? formatAddr(address) : '0x71C7...976F (Preview)'}
                  </span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-sub">Web-20 USDT Approval:</span>
                  <span className="text-emerald-500 font-bold">Unlimited Smart Contract Permitted</span>
                </div>
              </div>

              {/* Connect Button */}
              <div className="pt-2">
                {isConnected ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={disconnectWallet}
                      className="flex-1 py-3 px-4 rounded-xl border border-color-negative/30 bg-color-negative/10 text-color-negative text-[11px] font-bold hover:bg-color-negative/20 transition-all"
                    >
                      Disconnect Wallet
                    </button>
                    <a
                      href={`https://testnet.bscscan.com/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-surface border border-border-subtle text-sub hover:text-prime transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={openWalletModal}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-accent-green to-emerald-600 text-white text-[13px] font-extrabold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-green/20"
                  >
                    <Wallet size={16} />
                    <span>Connect Web3 Wallet Now</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
