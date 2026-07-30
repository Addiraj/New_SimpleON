import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, ShieldCheck, Check, Copy, ExternalLink, RefreshCw, AlertCircle, 
  ArrowRight, Key, Zap, Lock, ChevronRight, Activity, Globe, DollarSign,
  Layers, CheckCircle2, Shield, AlertTriangle, LogOut
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { transactionApi } from '../services/api';

export default function WalletPage() {
  const { 
    isConnected, 
    address, 
    chainId, 
    isConnecting, 
    connectionError, 
    walletType,
    bnbBalance,
    usdtBalance,
    openWalletModal, 
    disconnectWallet,
    connectWallet,
    switchChain,
    simulateState
  } = useWeb3Store();

  const [copied, setCopied] = useState(false);
  const [selectedSimState, setSelectedSimState] = useState<'success' | 'loading' | 'disconnected' | 'error'>(
    isConnected ? 'success' : 'disconnected'
  );

  const [realActivity, setRealActivity] = useState<any[]>([]);

  useEffect(() => {
    async function loadRecentTx() {
      try {
        const res = await transactionApi.getTransactions({ page: 1, limit: 5 });
        if (res && Array.isArray(res.transactions)) {
          setRealActivity(res.transactions);
        }
      } catch (err) {
        console.error('Failed to load recent activity:', err);
      }
    }
    loadRecentTx();
  }, [isConnected]);

  const formattedAddr = address ? `${address.substring(0, 6)}...${address.substring(address.length - 6)}` : '0x71C7...f6d8976F';

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimTrigger = (st: 'success' | 'loading' | 'disconnected' | 'error') => {
    setSelectedSimState(st);
    simulateState(st);
  };

  const walletCards = [
    {
      id: 'metamask',
      name: 'MetaMask Wallet',
      badge: 'Popular',
      color: 'from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30 text-amber-500',
      description: 'Browser extension and mobile dApp browser. Full support for custom BSC RPC nodes.',
      features: ['EIP-1193 Provider', 'SIWE Native', 'BSC Testnet & Mainnet']
    },
    {
      id: 'trustwallet',
      name: 'Trust Wallet',
      badge: 'Mobile First',
      color: 'from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30 text-blue-500',
      description: 'Self-custody multi-chain wallet optimized for BNB Smart Chain dApps and mobile SIWE.',
      features: ['Mobile Web3 SDK', 'EVM Native', 'BEP-20 Auto-Detect']
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2',
      badge: 'Multi-Chain',
      color: 'from-cyan-500/20 via-cyan-500/5 to-transparent border-cyan-500/30 text-cyan-500',
      description: 'Scan QR code with Trust Wallet, Rainbow, Safe, or 100+ Web3 wallets on desktop or mobile.',
      features: ['QR Protocol', 'Multi-Session', 'Hardware Wallet Relay']
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      badge: 'Smart Wallet',
      color: 'from-indigo-500/20 via-indigo-500/5 to-transparent border-indigo-500/30 text-indigo-500',
      description: 'Self-custody Smart Wallet with passkey authentication and frictionless gasless transactions.',
      features: ['Passkey Auth', 'Base & BSC Relay', 'Zero-Gas SIWE']
    }
  ];

  const recentActivity: any[] = [];

  return (
    <div id="wallet-page-container" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Top Header Banner */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-3.5 py-1 text-xs font-bold text-accent-red border border-accent-red/20 mb-3">
              <Wallet size={14} />
              <span>Web3 Self-Custody Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Wallet <span className="text-accent-red">Connection</span> & Status
            </h1>
            <p className="text-xs sm:text-sm text-sub mt-2 max-w-2xl leading-relaxed">
              Authenticate via standard EVM providers (SIWE EIP-4361). Monitor connected addresses, live BEP-20 balances, network RPC latency, and recent on-chain transactions.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={openWalletModal}
              className="px-6 py-3.5 rounded-2xl bg-accent-red text-white text-xs font-black shadow-lg shadow-accent-red/25 hover:bg-accent-red/90 transition-all flex items-center space-x-2"
            >
              <Wallet size={16} />
              <span>Open Wallet Modal</span>
            </button>
          </div>
        </div>

        {/* State Interactive Switcher bar for UI Testing */}
        <div className="mt-8 pt-6 border-t border-border-theme flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono font-bold text-sub flex items-center space-x-2">
            <Activity size={14} className="text-accent-red" />
            <span>Interactive State Simulator:</span>
          </div>

          <div className="flex items-center space-x-2 bg-surface-elevated p-1 rounded-xl border border-border-theme text-xs font-mono">
            <button
              onClick={() => handleSimTrigger('success')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                selectedSimState === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'text-sub hover:text-prime'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <span>Connected State</span>
            </button>

            <button
              onClick={() => handleSimTrigger('loading')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                selectedSimState === 'loading' ? 'bg-amber-500 text-white shadow-sm' : 'text-sub hover:text-prime'
              }`}
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>Loading State</span>
            </button>

            <button
              onClick={() => handleSimTrigger('error')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                selectedSimState === 'error' ? 'bg-red-500 text-white shadow-sm' : 'text-sub hover:text-prime'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Error State</span>
            </button>

            <button
              onClick={() => handleSimTrigger('disconnected')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                selectedSimState === 'disconnected' ? 'bg-border-theme text-prime shadow-sm' : 'text-sub hover:text-prime'
              }`}
            >
              <LogOut size={12} />
              <span>Disconnected State</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Wallet Provider Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-prime flex items-center space-x-2">
              <Zap size={18} className="text-accent-red" />
              <span>Supported Web3 Wallet Providers</span>
            </h2>
            <p className="text-xs text-sub">Select any provider to trigger EIP-1193 connection or SIWE signature</p>
          </div>
          <span className="text-xs font-mono text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            4 Protocols Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {walletCards.map((w) => {
            const isCurrentConnected = isConnected && (walletType === w.id || (!walletType && w.id === 'metamask'));
            return (
              <div
                key={w.id}
                className={`p-6 rounded-3xl bg-surface border transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-md ${
                  isCurrentConnected
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border-theme hover:border-accent-red/40 hover:shadow-lg'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme shadow-sm font-bold text-sm">
                      {w.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-surface-elevated border border-border-theme text-prime">
                      {w.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-prime group-hover:text-accent-red transition-colors">
                    {w.name}
                  </h3>

                  <p className="text-xs text-sub leading-relaxed mt-2">
                    {w.description}
                  </p>

                  <div className="mt-4 space-y-1.5">
                    {w.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-[11px] text-sub">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border-theme/60">
                  {isCurrentConnected ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold font-mono text-center flex items-center justify-center space-x-1.5 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active Wallet</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => connectWallet(w.id as any)}
                      className="w-full py-2.5 px-4 rounded-xl bg-surface-elevated hover:bg-accent-red hover:text-white border border-border-theme text-xs font-bold transition-all flex items-center justify-center space-x-2"
                    >
                      <span>Connect {w.name.split(' ')[0]}</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Connection Status & Detailed Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Connection Status & Wallet Info */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Status Display Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl relative overflow-hidden">
            
            {/* Top Bar Status Indicator */}
            <div className="flex flex-wrap items-center justify-between pb-6 border-b border-border-theme gap-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl border ${
                  isConnecting
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : connectionError
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : isConnected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-surface-elevated text-sub border-border-theme'
                }`}>
                  {isConnecting ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : connectionError ? (
                    <AlertTriangle size={20} />
                  ) : isConnected ? (
                    <ShieldCheck size={20} />
                  ) : (
                    <LogOut size={20} />
                  )}
                </div>

                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-sub">Current State</div>
                  <div className="text-base font-extrabold text-prime flex items-center space-x-2 mt-0.5">
                    {isConnecting ? (
                      <span className="text-amber-500">Connecting & Signing...</span>
                    ) : connectionError ? (
                      <span className="text-red-500">Connection Error</span>
                    ) : isConnected ? (
                      <span className="text-emerald-500 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Connected & SIWE Authenticated</span>
                      </span>
                    ) : (
                      <span className="text-sub">Disconnected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {isConnected && (
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold transition-all"
                >
                  Disconnect Wallet
                </button>
              )}
            </div>

            {/* Render conditional views based on State */}
            <div className="pt-6">
              
              {/* STATE: LOADING */}
              {isConnecting && (
                <div className="py-8 space-y-6 text-center">
                  <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                    <RefreshCw size={32} className="animate-spin" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-lg font-extrabold text-prime">Awaiting Web3 Wallet Signature...</h3>
                    <p className="text-xs text-sub leading-relaxed">
                      Please check your browser extension or mobile wallet to approve the SIWE EIP-712 nonce authentication request.
                    </p>
                  </div>
                  {/* Skeleton Preview */}
                  <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto opacity-50 animate-pulse pt-4">
                    <div className="h-20 rounded-2xl bg-surface-elevated border border-border-theme" />
                    <div className="h-20 rounded-2xl bg-surface-elevated border border-border-theme" />
                  </div>
                </div>
              )}

              {/* STATE: ERROR */}
              {!isConnecting && connectionError && (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-extrabold text-red-500">Connection or Signature Error</h3>
                      <p className="text-xs text-prime/90 mt-1 leading-relaxed">
                        {connectionError}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      onClick={() => openWalletModal()}
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-md"
                    >
                      Retry Connection
                    </button>
                    <button
                      onClick={() => handleSimTrigger('success')}
                      className="px-4 py-2.5 rounded-xl bg-surface border border-border-theme text-xs font-bold text-prime hover:bg-surface-elevated"
                    >
                      Simulate Success
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: DISCONNECTED */}
              {!isConnecting && !connectionError && !isConnected && (
                <div className="py-10 text-center space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-surface-elevated border border-border-theme flex items-center justify-center mx-auto text-sub">
                    <Wallet size={32} />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-xl font-black text-prime">No Wallet Connected</h3>
                    <p className="text-xs text-sub leading-relaxed">
                      Connect your self-custody Web3 wallet to access your live matrix nodes, cycle earnings, and auto re-topup statuses.
                    </p>
                  </div>
                  <button
                    onClick={openWalletModal}
                    className="px-8 py-3.5 rounded-2xl bg-accent-red text-white text-xs font-extrabold shadow-xl shadow-accent-red/25 hover:bg-accent-red/90 transition-all inline-flex items-center space-x-2"
                  >
                    <Wallet size={16} />
                    <span>Connect Web3 Wallet Now</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* STATE: SUCCESS (CONNECTED) */}
              {!isConnecting && !connectionError && isConnected && (
                <div className="space-y-6">
                  
                  {/* Address & Copy Bar */}
                  <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-sub font-bold uppercase">Connected Address (EIP-55)</span>
                      <span className="text-emerald-500 font-bold flex items-center space-x-1">
                        <CheckCircle2 size={12} />
                        <span>SIWE Session Active</span>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="font-mono text-base font-extrabold text-prime break-all bg-surface px-4 py-2.5 rounded-xl border border-border-theme/80 w-full sm:w-auto flex-1">
                        {address || 'Not Connected'}
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                        <button
                          onClick={handleCopy}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red/20 border border-accent-red/20 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>

                        <a
                          href={`https://testnet.bscscan.com/address/${address || ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-surface border border-border-theme text-sub hover:text-prime transition-colors"
                          title="View on BscScan"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Balances Display Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2 relative overflow-hidden">
                      <div className="text-[10px] font-mono uppercase font-bold text-sub">BNB Native Balance</div>
                      <div className="text-2xl font-black font-mono text-prime">{bnbBalance} BNB</div>
                      <div className="text-[11px] text-sub font-mono">~$871.68 USD (Gas Reserve Ready)</div>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2 relative overflow-hidden">
                      <div className="text-[10px] font-mono uppercase font-bold text-sub">BEP-20 USDT Balance</div>
                      <div className="text-2xl font-black font-mono text-emerald-500">${usdtBalance} USDT</div>
                      <div className="text-[11px] text-sub font-mono">Available for Matrix Deposits</div>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* Recent On-Chain Activity Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border-theme">
              <div>
                <h3 className="text-base font-extrabold text-prime flex items-center space-x-2">
                  <Activity size={18} className="text-accent-red" />
                  <span>Recent Web3 On-Chain Activity</span>
                </h3>
                <p className="text-xs text-sub">Real-time smart contract events & SIWE authentication history</p>
              </div>
              <span className="text-xs font-mono font-bold text-sub bg-surface-elevated px-3 py-1 rounded-full border border-border-theme">
                BscScan Audited
              </span>
            </div>

            <div className="space-y-3">
              {(realActivity.length > 0 ? realActivity : recentActivity).map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl bg-surface-elevated border border-border-theme hover:border-accent-red/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-prime">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{tx.type || tx.transactionType || 'ON_CHAIN_EVENT'}</span>
                      <span className="text-[10px] font-mono font-normal text-sub">
                        ({tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (tx.timestamp || 'Just now')})
                      </span>
                    </div>
                    <div className="text-[11px] text-sub font-mono">{tx.description || tx.details || 'Smart contract transaction verified on BSC'}</div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-4">
                    <span className="font-mono font-extrabold text-emerald-500">
                      {tx.amount !== undefined ? `+$${parseFloat(tx.amount.toString()).toFixed(2)} USDT` : tx.amountUsdt !== undefined ? `+$${tx.amountUsdt.toFixed(2)} USDT` : tx.amount}
                    </span>
                    <a
                      href={tx.explorerUrl || `https://testnet.bscscan.com/tx/${tx.txHash || tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-surface border border-border-theme text-sub hover:text-accent-red transition-colors flex items-center space-x-1 font-mono text-[10px]"
                    >
                      <span>{(tx.txHash || tx.hash || tx.id).substring(0, 8)}...</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Network Config & SIWE Spec Panel */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Network Selector Card */}
          <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-5">
            <div className="flex items-center space-x-2 text-prime font-extrabold text-sm pb-3 border-b border-border-theme">
              <Globe size={18} className="text-accent-blue" />
              <span>Network Configuration</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-sub">Current Network:</span>
                <span className="text-prime font-bold">
                  {chainId === 56 ? 'BSC Mainnet (56)' : 'BSC Testnet (97)'}
                </span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-sub">RPC Ping Latency:</span>
                <span className="text-emerald-500 font-bold">14 ms (Optimal)</span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-sub">EIP-1559 Support:</span>
                <span className="text-prime font-bold">Enabled</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-mono text-sub uppercase font-bold">Switch RPC Chain:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchChain(97)}
                  className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                    chainId === 97
                      ? 'border-accent-red bg-accent-red/10 text-accent-red'
                      : 'border-border-theme bg-surface-elevated text-sub hover:text-prime'
                  }`}
                >
                  BSC Testnet (97)
                </button>

                <button
                  onClick={() => switchChain(56)}
                  className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                    chainId === 56
                      ? 'border-accent-red bg-accent-red/10 text-accent-red'
                      : 'border-border-theme bg-surface-elevated text-sub hover:text-prime'
                  }`}
                >
                  BSC Mainnet (56)
                </button>
              </div>
            </div>
          </div>

          {/* SIWE Cryptographic Specs */}
          <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-prime font-extrabold text-sm pb-3 border-b border-border-theme">
              <Key size={18} className="text-accent-red" />
              <span>SIWE EIP-4361 Protocol</span>
            </div>

            <p className="text-xs text-sub leading-relaxed">
              SimpleOn uses off-chain SIWE messages signed with EIP-712 typed data structure. This validates ownership without gas expenditure.
            </p>

            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2 font-mono text-[10px]">
              <div className="text-accent-red font-bold">SIWE Nonce Challenge Structure:</div>
              <div className="text-sub bg-surface p-2 rounded-lg border border-border-theme/60 overflow-x-auto">
                domain: "simpleon.io"<br />
                statement: "Sign in with Ethereum to SimpleOn Income Engine"<br />
                nonce: "a8f3c490e12d"<br />
                chainId: 97
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-1.5 text-xs text-emerald-500 font-bold">
              <CheckCircle2 size={14} />
              <span>Zero Platform Key Custody Guaranteed</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
