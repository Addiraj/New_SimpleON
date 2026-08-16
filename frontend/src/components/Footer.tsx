import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const platformLinks = [
    { id: 'home', label: 'Home' },
    { id: 'plans', label: 'Plans' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'matrix', label: 'X5 Matrix' },
  ];

  const accountLinks = [
    { id: 'referrals', label: 'Team' },
    { id: 'capping', label: 'Capping' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <footer
      id="app-footer"
      className="relative border-t border-border-theme bg-surface transition-colors duration-200"
    >
      {/* Gradient accent line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-red/30 to-transparent"
      />

      <div className="section-container py-12">
        {/* Main grid */}
        <div className="grid gap-10 md:grid-cols-12 pb-10 border-b border-border-subtle">
          {/* Brand */}
          <div className="md:col-span-4 space-y-4">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => handleTabClick('home')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleTabClick('home')}
            >
              <div className="relative flex h-7 w-7 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-accent-red fill-current" aria-hidden="true">
                  <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" />
                </svg>
                <span className="relative z-10 text-xs font-black text-white italic">S</span>
              </div>
              <span className="text-base font-extrabold text-prime">
                Simple<span className="text-accent-red">On</span>
              </span>
            </div>
            <p className="text-[13px] text-sub leading-relaxed max-w-xs">
              A decentralized Web3 referral platform with automated booster subscriptions, peer-to-peer payouts, and dynamic spillover architecture on BSC.
            </p>
          </div>

          {/* Platform */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-[0.1em]">Platform</h4>
            <nav className="flex flex-col gap-2" aria-label="Platform links">
              {platformLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleTabClick(link.id)}
                  className="text-left text-[13px] font-medium text-sub hover:text-accent-red transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Account */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-[0.1em]">Account</h4>
            <nav className="flex flex-col gap-2" aria-label="Account links">
              {accountLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleTabClick(link.id)}
                  className="text-left text-[13px] font-medium text-sub hover:text-accent-red transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Trust */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-[0.1em]">Smart Contract</h4>
            <div className="p-4 rounded-xl card-elevated space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent-green shrink-0" />
                <span className="text-[12px] font-semibold text-prime">
                  Solidity v0.8.20 — Verified on BscScan
                </span>
              </div>
              <p className="text-[11px] text-sub leading-relaxed">
                Autonomous, immutable contract logic. Zero admin custody of user funds. All payouts are peer-to-peer via Web-20 USDT.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted">
          <span className="font-medium">
            &copy; {currentYear} SimpleOn Global Network. All rights reserved.
          </span>
          <div className="flex items-center gap-4 font-medium">
            <button className="hover:text-accent-red transition-colors">Terms of Use</button>
            <span className="text-border-theme">&bull;</span>
            <button className="hover:text-accent-red transition-colors">Privacy Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
