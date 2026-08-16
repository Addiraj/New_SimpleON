import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Palette, Type, Sliders, Layers, CheckSquare, Sparkles, ShieldCheck, 
  AlertOctagon, AlertTriangle, CheckCircle2, RefreshCw, Inbox, ArrowRight, 
  Search, Bell, User, Wallet, Lock, Copy, Check, ExternalLink, Flame
} from 'lucide-react';
import { LoadingSkeletonCard, LoadingSkeletonTable, EmptyStateView, ErrorStateAlert, SuccessStateBanner } from './StateComponents';
import { useWeb3Store } from '../store/useWeb3Store';

export default function DesignSystemShowcase() {
  const { openWalletModal, toggleNotificationCenter } = useWeb3Store();

  const [activeTab, setActiveTab] = useState<'COMPONENTS' | 'TOKENS' | 'SYSTEM_STATES' | 'SPECIAL_PAGES'>('COMPONENTS');
  const [toggleState, setToggleState] = useState(true);
  const [inputText, setInputText] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [rangeVal, setRangeVal] = useState(4.0);
  const [copied, setCopied] = useState(false);

  // For System States tab
  const [demoState, setDemoState] = useState<'SKELETON' | 'EMPTY' | 'ERROR' | 'SUCCESS'>('SKELETON');
  
  // For Special Pages tab
  const [demoPage, setDemoPage] = useState<'404' | 'MAINTENANCE'>('404');

  const copyText = () => {
    navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Banner */}
      <div className="card p-8 sm:p-10 relative overflow-hidden bg-gradient-to-br from-surface-sunken to-surface">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-red/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <div className="mb-2">
              <span className="badge badge-brand text-accent-red bg-accent-red/10 border-accent-red/20 shadow-sm">
                <Sparkles size={12} />
                <span>Enterprise Design System & Component Spec</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Design System & <span className="text-accent-red">UI Architecture</span>
            </h1>
            <p className="text-[13px] sm:text-[14px] text-sub max-w-2xl leading-relaxed">
              Standardized design tokens, accessible components, atomic layout cards, dark/light mode CSS variables, and error/empty states crafted for SimpleOn.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={openWalletModal}
              className="btn btn-outline"
            >
              <Wallet size={16} />
              <span>Launch Wallet Modal</span>
            </button>
            <button
              onClick={toggleNotificationCenter}
              className="btn btn-primary"
            >
              <Bell size={16} />
              <span>Trigger Drawer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Section Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-border-subtle custom-scrollbar">
        <button
          onClick={() => setActiveTab('COMPONENTS')}
          className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'COMPONENTS' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          <Layers size={14} />
          <span>UI Components Library</span>
        </button>

        <button
          onClick={() => setActiveTab('TOKENS')}
          className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'TOKENS' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          <Palette size={14} />
          <span>Design Tokens & Colors</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_STATES')}
          className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'SYSTEM_STATES' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          <AlertTriangle size={14} />
          <span>State Handler Feedback</span>
        </button>

        <button
          onClick={() => setActiveTab('SPECIAL_PAGES')}
          className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'SPECIAL_PAGES' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          <AlertOctagon size={14} />
          <span>404 & Maintenance Views</span>
        </button>
      </div>

      {/* TAB 1: UI COMPONENTS */}
      {activeTab === 'COMPONENTS' && (
        <div className="space-y-10">
          
          {/* Buttons Section */}
          <div className="card p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="text-[15px] font-black text-prime font-mono uppercase flex items-center gap-3 pb-4 border-b border-border-subtle tracking-wider">
              <div className="p-2 rounded-xl bg-accent-red/10 border border-accent-red/20">
                <Sliders size={18} className="text-accent-red" />
              </div>
              <span>Button Variants</span>
            </h2>

            <div className="flex flex-wrap items-center gap-4">
              <button className="btn btn-primary">
                Primary Action
              </button>

              <button className="btn btn-outline">
                Secondary Outlined
              </button>

              <button className="btn bg-accent-green text-slate-900 shadow-sm border border-accent-green/20 hover:bg-accent-green/90">
                Success Pill
              </button>

              <button className="btn bg-amber-500 text-slate-900 shadow-sm border border-amber-500/20 hover:bg-amber-400">
                Warning Highlight
              </button>

              <button disabled className="btn bg-surface-sunken text-muted border border-border-subtle cursor-not-allowed shadow-none">
                Disabled State
              </button>

              <button className="p-3.5 rounded-xl bg-surface-sunken border border-border-subtle text-prime hover:text-accent-red hover:border-accent-red/30 transition-all">
                <Flame size={18} />
              </button>
            </div>
          </div>

          {/* Form Inputs & Controls */}
          <div className="card p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="text-[15px] font-black text-prime font-mono uppercase tracking-wider">Form Controls & Inputs</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Text Input with Icon */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono font-bold text-sub block uppercase tracking-wider">Text / Wallet Input</label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-surface-sunken border border-border-subtle text-prime text-[13px] font-mono font-bold focus:outline-none focus:border-accent-red transition-colors"
                  />
                  <button onClick={copyText} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub hover:text-prime transition-colors">
                    {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Dropdown Select */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono font-bold text-sub block uppercase tracking-wider">Dropdown Select</label>
                <select className="w-full px-4 py-3.5 rounded-xl bg-surface-sunken border border-border-subtle text-prime text-[13px] font-mono font-bold focus:outline-none focus:border-accent-red transition-colors">
                  <option>Starter Booster Tier ($1.00 USDT)</option>
                  <option>Builder Booster Tier ($4.00 USDT)</option>
                  <option>Leader Booster Tier ($16.00 USDT)</option>
                  <option>Champion Booster Tier ($64.00 USDT)</option>
                </select>
              </div>

              {/* Range Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-mono font-bold">
                  <span className="text-sub uppercase tracking-wider">Booster Multiplier</span>
                  <span className="text-accent-red bg-accent-red/10 px-2 py-0.5 rounded border border-accent-red/20">${rangeVal.toFixed(2)} USDT</span>
                </div>
                <div className="pt-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={rangeVal}
                    onChange={(e) => setRangeVal(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface-sunken rounded-lg appearance-none cursor-pointer accent-accent-red"
                  />
                </div>
              </div>

              {/* Checkbox & Switch Toggle */}
              <div className="flex flex-col gap-4 pt-1">
                <label className="flex items-center gap-3 cursor-pointer text-[13px] font-bold text-prime font-mono">
                  <input type="checkbox" checked={toggleState} onChange={() => setToggleState(!toggleState)} className="w-4 h-4 accent-accent-red rounded border-border-subtle bg-surface-sunken" />
                  <span>Enable Auto-Compounding</span>
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-mono font-bold text-prime">Notifications</span>
                  <button
                    onClick={() => setToggleState(!toggleState)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center shadow-inner ${toggleState ? 'bg-accent-green justify-end' : 'bg-surface-sunken border border-border-subtle justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Badges & Chips */}
          <div className="card p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="text-[15px] font-black text-prime font-mono uppercase tracking-wider">Badges & Status Tags</h2>

            <div className="flex flex-wrap items-center gap-3">
              <span className="badge badge-brand bg-accent-green/10 text-accent-green border-accent-green/20">
                <CheckCircle2 size={12} />
                <span>Web3 Verified</span>
              </span>

              <span className="badge badge-brand bg-accent-red/10 text-accent-red border-accent-red/20">
                X5 Matrix Active
              </span>

              <span className="badge badge-brand bg-amber-500/10 text-amber-500 border-amber-500/20">
                Daily Limit Active
              </span>

              <span className="badge badge-brand bg-accent-blue/10 text-accent-blue border-accent-blue/20">
                5 Direct Referrals
              </span>

              <span className="badge badge-outline">
                Standby
              </span>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DESIGN TOKENS */}
      {activeTab === 'TOKENS' && (
        <div className="card p-6 sm:p-8 flex flex-col gap-8">
          <h2 className="text-[15px] font-black text-prime font-mono uppercase flex items-center gap-3 tracking-wider pb-4 border-b border-border-subtle">
            <div className="p-2 rounded-xl bg-accent-red/10 border border-accent-red/20">
              <Palette size={18} className="text-accent-red" />
            </div>
            <span>Brand Colors & Semantic CSS Variables</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Red Accent */}
            <div className="card p-4 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
              <div className="h-16 rounded-xl bg-accent-red shadow-sm border border-accent-red/20" />
              <div className="text-[13px] font-mono font-bold text-prime">Accent Red</div>
              <p className="text-[10px] font-mono text-muted">var(--color-accent-red) • #EF4444</p>
            </div>

            {/* Emerald Green */}
            <div className="card p-4 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
              <div className="h-16 rounded-xl bg-accent-green shadow-sm border border-accent-green/20" />
              <div className="text-[13px] font-mono font-bold text-prime">Accent Green</div>
              <p className="text-[10px] font-mono text-muted">#10B981 • Rewards & Success</p>
            </div>

            {/* Accent Blue */}
            <div className="card p-4 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
              <div className="h-16 rounded-xl bg-accent-blue shadow-sm border border-accent-blue/20" />
              <div className="text-[13px] font-mono font-bold text-prime">Accent Blue</div>
              <p className="text-[10px] font-mono text-muted">var(--color-accent-blue) • #3B82F6</p>
            </div>

            {/* Amber Gold */}
            <div className="card p-4 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
              <div className="h-16 rounded-xl bg-amber-500 shadow-sm border border-amber-500/20" />
              <div className="text-[13px] font-mono font-bold text-prime">Amber Gold</div>
              <p className="text-[10px] font-mono text-muted">#F59E0B • Capping & Alerts</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM STATES */}
      {activeTab === 'SYSTEM_STATES' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setDemoState('SKELETON')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0 ${demoState === 'SKELETON' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              Loading Skeleton
            </button>
            <button
              onClick={() => setDemoState('EMPTY')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0 ${demoState === 'EMPTY' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              Empty State
            </button>
            <button
              onClick={() => setDemoState('ERROR')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0 ${demoState === 'ERROR' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              Error Alert
            </button>
            <button
              onClick={() => setDemoState('SUCCESS')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0 ${demoState === 'SUCCESS' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              Success Banner
            </button>
          </div>

          {demoState === 'SKELETON' && (
            <div className="space-y-6">
              <LoadingSkeletonCard />
              <LoadingSkeletonTable />
            </div>
          )}

          {demoState === 'EMPTY' && (
            <EmptyStateView
              title="No Active Matrix Cycles Found"
              description="You have not activated an X5 Matrix Tier yet. Choose a plan to participate in automated team spillovers."
              actionText="Explore Plans"
              onAction={() => alert('Navigating to plans')}
            />
          )}

          {demoState === 'ERROR' && (
            <ErrorStateAlert
              title="BNB Smart Chain RPC Timeout"
              message="Failed to fetch current gas prices from node endpoint. Retrying via backup RPC provider..."
              onRetry={() => alert('Retrying RPC connection')}
            />
          )}

          {demoState === 'SUCCESS' && (
            <SuccessStateBanner
              title="Matrix Reward Distribution Executed"
              message="+80.00 USDT successfully credited to your connected Web3 address."
            />
          )}
        </div>
      )}

      {/* TAB 4: SPECIAL SYSTEM PAGES */}
      {activeTab === 'SPECIAL_PAGES' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4">
            <button
              onClick={() => setDemoPage('404')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${demoPage === '404' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              404 Page View
            </button>
            <button
              onClick={() => setDemoPage('MAINTENANCE')}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${demoPage === 'MAINTENANCE' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'}`}
            >
              Maintenance Mode View
            </button>
          </div>

          {demoPage === '404' ? (
            <div className="card p-12 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto py-20 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black font-mono text-surface-sunken pointer-events-none select-none z-0">
                404
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="text-6xl font-black font-mono text-accent-red tracking-tight">404</div>
                <h2 className="text-[22px] font-black text-prime">Smart Contract Page Not Found</h2>
                <p className="text-[14px] text-sub leading-relaxed max-w-md">
                  The matrix page or block index you requested does not exist on this chain branch.
                </p>
                <button onClick={() => setActiveTab('COMPONENTS')} className="btn btn-primary mt-4">
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto py-16 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 w-16 h-16 mx-auto flex items-center justify-center border border-amber-500/20 relative z-10">
                <AlertOctagon size={32} />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4">
                <h2 className="text-[22px] font-black text-prime">Scheduled Smart Contract Upgrade</h2>
                <p className="text-[14px] text-sub leading-relaxed max-w-md">
                  The SimpleOn protocol is currently undergoing a non-custodial contract audit upgrade on BNB Smart Chain. All funds remain 100% safe on-chain.
                </p>
                <div className="mt-2">
                  <span className="inline-block px-4 py-2 rounded-xl bg-surface-sunken text-amber-500 text-[12px] font-mono font-bold border border-amber-500/30 shadow-sm">
                    Estimated Time Remaining: 24 mins
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
