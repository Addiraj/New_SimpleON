import React from 'react';
import { ShieldAlert, Terminal, MessageSquare, ExternalLink } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="app-footer" className="border-t border-border-theme bg-surface py-12 transition-colors duration-300">
      <div id="footer-container" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Core Layout */}
        <div className="grid gap-8 md:grid-cols-12 pb-8 border-b border-border-theme">
          
          {/* Logo & Platform Pitch */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabClick('home')}>
              <div className="relative flex h-8 w-8 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-accent-red fill-current">
                  <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" />
                </svg>
                <span className="relative z-10 text-sm font-black text-white italic">S</span>
              </div>
              <span className="text-lg font-black text-prime">
                Simple<span className="text-accent-red">On</span>
              </span>
            </div>

            <p className="text-xs text-sub leading-relaxed max-w-sm">
              SimpleOn is a decentralized interactive crypto referral framework designed around automated booster subscriptions, P2P collections, and dynamic spillover structures.
            </p>
          </div>

          {/* Quick Tabs Menu */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-sub uppercase tracking-widest">Platform Menu</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-prime">
              <button onClick={() => handleTabClick('home')} className="text-left hover:text-accent-red transition-colors">Home</button>
              <button onClick={() => handleTabClick('about')} className="text-left hover:text-accent-red transition-colors">About Us</button>
              <button onClick={() => handleTabClick('plans')} className="text-left hover:text-accent-red transition-colors">Plans</button>
              <button onClick={() => handleTabClick('benefits')} className="text-left hover:text-accent-red transition-colors">Benefits</button>
              <button onClick={() => handleTabClick('roadmap')} className="text-left hover:text-accent-red transition-colors">Roadmap</button>
              <button onClick={() => handleTabClick('matrix')} className="text-left hover:text-accent-red transition-colors">X5 Matrix</button>
            </div>
          </div>

          {/* System status/Audit notes */}
          <div className="md:col-span-4 space-y-3 text-xs">
            <h4 className="text-xs font-black text-sub uppercase tracking-widest">Contract Audit</h4>
            <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme space-y-2">
              <div className="flex items-center space-x-2 text-green-600 font-bold">
                <ShieldAlert size={14} />
                <span>Compiler: Solc v0.8.20</span>
              </div>
              <p className="text-[10px] text-sub leading-normal">
                Autonomous and un-alterable engine logic. Designed for secure, zero-reserve decentralization on EVM compatible layer-2 networks.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom copyright & notes */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-sub space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-1.5 font-medium">
            <Terminal size={12} />
            <span>&copy; {currentYear} SimpleOn Global Network. All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-3 font-semibold">
            <button className="hover:text-accent-red transition-colors">Terms of Use</button>
            <span>&bull;</span>
            <button className="hover:text-accent-red transition-colors">Privacy Policy</button>
          </div>
        </div>

      </div>
    </footer>
  );
}
