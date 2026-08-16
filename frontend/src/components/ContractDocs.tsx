import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Code, Copy, Check, ExternalLink, ShieldCheck, Terminal, Layers, Cpu } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

export default function ContractDocs() {
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  const boosterAddress = '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5';
  const usdtAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(label);
    setTimeout(() => setCopiedContract(null), 2000);
  };

  const abiSnippet = `[
  {
    "inputs": [{"name": "referrer", "type": "address"}],
    "name": "registerAndActivate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "targetTier", "type": "uint8"}],
    "name": "upgradeTier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "activateMainPlan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]`;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-wider">
          <Code size={14} />
          <span>Solidity Smart Contract Inspector</span>
        </span>
        <h2 className="text-3xl font-extrabold text-prime sm:text-4xl">
          Verified Smart Contracts & Architecture
        </h2>
        <p className="text-sm text-sub leading-relaxed">
          SimpleOn Booster Plan runs on immutable, reentrancy-guarded OpenZeppelin Solidity smart contracts deployed on BNB Smart Chain.
        </p>
      </div>

      {/* Contract Addresses Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-accent-red">Main Contract</span>
            <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/30 px-2.5 py-0.5 rounded-full font-bold">
              Verified & Audit Ready
            </span>
          </div>
          <h3 className="text-lg font-black text-prime">SimpleOnBooster.sol</h3>
          <p className="text-xs text-sub">Handles 4 Booster Tiers, 5-partner collections, and Main Plan distributions.</p>

          <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme flex items-center justify-between">
            <span className="font-mono text-xs text-prime truncate pr-2">{boosterAddress}</span>
            <button
              onClick={() => copyToClipboard(boosterAddress, 'booster')}
              className="p-1.5 rounded-lg hover:bg-surface text-sub hover:text-prime"
            >
              {copiedContract === 'booster' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>

          <a
            href={`https://testnet.bscscan.com/address/${boosterAddress}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-accent-red font-bold hover:underline"
          >
            <span>Inspect on BscScan Testnet</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-accent-blue">Payment Token</span>
            <span className="text-[10px] bg-accent-blue/10 text-accent-blue border border-accent-blue/30 px-2.5 py-0.5 rounded-full font-bold">
              BEP-20 Token
            </span>
          </div>
          <h3 className="text-lg font-black text-prime">Tether USD (Mock USDT)</h3>
          <p className="text-xs text-sub">18 decimals BEP-20 stablecoin standard used for all deposits and payouts.</p>

          <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme flex items-center justify-between">
            <span className="font-mono text-xs text-prime truncate pr-2">{usdtAddress}</span>
            <button
              onClick={() => copyToClipboard(usdtAddress, 'usdt')}
              className="p-1.5 rounded-lg hover:bg-surface text-sub hover:text-prime"
            >
              {copiedContract === 'usdt' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>

          <a
            href={`https://testnet.bscscan.com/address/${usdtAddress}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-accent-blue font-bold hover:underline"
          >
            <span>Inspect BEP-20 Contract</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Code & ABI Viewer */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-theme">
          <div className="flex items-center space-x-2">
            <Terminal size={18} className="text-accent-red" />
            <h3 className="text-base font-extrabold text-prime">Contract JSON Application Binary Interface (ABI)</h3>
          </div>
          <button
            onClick={() => copyToClipboard(abiSnippet, 'abi')}
            className="px-3 py-1 rounded-xl bg-surface-elevated border border-border-theme text-xs font-bold text-sub hover:text-prime flex items-center space-x-1"
          >
            {copiedContract === 'abi' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span>Copy ABI</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-neutral-950 text-green-400 font-mono text-xs overflow-x-auto leading-relaxed border border-border-theme">
          {abiSnippet}
        </pre>
      </div>
    </div>
  );
}
