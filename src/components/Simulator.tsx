import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Rocket, TrendingUp, Users, Trophy, Layers, 
  HelpCircle, ChevronDown, ChevronUp, AlertTriangle, 
  Coins, Info, ArrowUpRight, DollarSign, RefreshCw, AlertCircle 
} from 'lucide-react';
import { QualifiedReferrals, BoosterTierData, MainPlanBreakdown, LevelPoolRow } from '../types';
import { boosterApi } from '../services/api';

export default function Simulator({
  basePlan: propBasePlan,
  setBasePlan: propSetBasePlan,
}: {
  basePlan?: number;
  setBasePlan?: (v: number) => void;
} = {}) {
  // Inputs
  const [localBasePlan, setLocalBasePlan] = useState<number>(1);
  const basePlan = propBasePlan !== undefined ? propBasePlan : localBasePlan;
  const setBasePlan = propSetBasePlan !== undefined ? propSetBasePlan : setLocalBasePlan;

  const [qualified, setQualified] = useState<QualifiedReferrals>({
    builders: 0,
    leaders: 0,
    champions: 0,
  });
  const [selectedX5Cycle, setSelectedX5Cycle] = useState<number>(1);
  const [levelPoolCollapsed, setLevelPoolCollapsed] = useState<boolean>(true);

  // Backend API Calculations state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<any>(null);

  // Load calculations from backend POST /api/booster/calculate
  const fetchCalculations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await boosterApi.calculate(basePlan);
      const data = res?.data || res;
      setApiResult(data);
    } catch (err: any) {
      console.error('Error fetching booster calculation from API:', err);
      setError(err?.message || 'Failed to calculate booster plan metrics from backend server.');
    } finally {
      setLoading(false);
    }
  }, [basePlan]);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  // Constants
  const NUMBER_OF_LEVELS = 13;

  // Process and format backend API calculation values safely
  const calculations = useMemo(() => {
    // If backend calculation API returned valid tiers:
    const backendTiers = apiResult?.tiers;
    
    // Booster Tier Data
    const boosters: BoosterTierData[] = backendTiers && Array.isArray(backendTiers)
      ? backendTiers.map((t: any) => ({
          name: t.name,
          amount: Number(t.joiningAmount || 0),
          collection: Number(t.collectionAmount || 0),
          retopup: Number(t.retopupAmount || 0),
          upgrade: Number(t.upgradeAmount || 0),
          firstNetIncome: t.netIncome ? Number(t.netIncome) : undefined,
          dailyCap: t.slug === 'starter'
            ? Math.max(5, qualified.builders)
            : t.slug === 'builder'
            ? Math.max(5, qualified.leaders)
            : Math.max(5, qualified.champions),
          accent: t.accent || 'text-accent-red bg-accent-red/10 border-accent-red/25',
          iconName: (t.iconName as any) || 'rocket',
        }))
      : [
          {
            name: 'Starter',
            amount: basePlan * 1,
            collection: basePlan * 5,
            retopup: basePlan * 1,
            upgrade: basePlan * 4,
            dailyCap: Math.max(5, qualified.builders),
            accent: 'text-accent-red bg-accent-red/10 border-accent-red/25',
            iconName: 'rocket',
          },
          {
            name: 'Builder',
            amount: basePlan * 4,
            collection: basePlan * 20,
            retopup: basePlan * 4,
            upgrade: basePlan * 16,
            dailyCap: Math.max(5, qualified.leaders),
            accent: 'text-accent-blue bg-accent-blue/10 border-accent-blue/25',
            iconName: 'trending-up',
          },
          {
            name: 'Leader',
            amount: basePlan * 16,
            collection: basePlan * 80,
            retopup: basePlan * 16,
            upgrade: basePlan * 64,
            dailyCap: Math.max(5, qualified.champions),
            accent: 'text-accent-orange bg-accent-orange/10 border-accent-orange/25',
            iconName: 'users',
          },
          {
            name: 'Champion',
            amount: basePlan * 64,
            collection: basePlan * 320,
            retopup: basePlan * 64,
            upgrade: basePlan * 100,
            firstNetIncome: basePlan * 156,
            dailyCap: Math.max(5, qualified.champions),
            accent: 'text-accent-purple bg-accent-purple/10 border-accent-purple/25',
            iconName: 'trophy',
          },
        ];

    // Main Plan Split
    const mainPlanTotal = apiResult?.mainPlan?.totalAmount ?? basePlan * 100;
    const x5Amount = apiResult?.mainPlan?.x5MatrixSplit ?? mainPlanTotal * 0.15;
    const levelPoolAmount = apiResult?.mainPlan?.forcedLevelPool ?? mainPlanTotal * 0.65;
    const x4Amount = apiResult?.mainPlan?.x4MatrixAllocation ?? mainPlanTotal * 0.20;

    const mainPlan: MainPlanBreakdown = {
      x5Amount,
      levelPoolAmount,
      x4Amount,
      mainPlanTotal,
    };

    // 13 Level Pool
    const perLevelAmount = levelPoolAmount / NUMBER_OF_LEVELS;
    const levelPoolRows: LevelPoolRow[] = Array.from({ length: NUMBER_OF_LEVELS }).map((_, i) => {
      const level = i + 1;
      const members = Math.pow(3, level);
      return {
        level,
        amount: perLevelAmount,
        members,
        potentialIncome: members * perLevelAmount,
      };
    });

    const championAmount = boosters[3]?.amount || basePlan * 64;
    const championCollection = boosters[3]?.collection || basePlan * 320;
    const isSanityCheckPassed = Math.abs(championCollection - (championAmount + mainPlanTotal + basePlan * 156)) < 0.0001;

    // X5 Matrix cycle split calculations
    const x5Split = {
      retopup: x5Amount * 0.20,
      upgradeWallet: selectedX5Cycle === 1 ? x5Amount * 0.40 : 0,
      incomeWallet: selectedX5Cycle === 1 ? x5Amount * 0.40 : x5Amount * 0.80,
    };

    return {
      boosters,
      mainPlan,
      levelPoolRows,
      perLevelAmount,
      isSanityCheckPassed,
      x5Split,
      totalInvestedToReachMain: apiResult?.totalInvestedToMain ?? basePlan * 85,
    };
  }, [apiResult, basePlan, qualified, selectedX5Cycle]);

  // Handle Referral Slider Inputs
  const handleReferralsChange = (tier: keyof QualifiedReferrals, value: number) => {
    setQualified((prev) => ({
      ...prev,
      [tier]: value,
    }));
  };

  return (
    <section id="simulator-page" className="py-12 transition-colors duration-300">
      <div id="simulator-container" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Title and Intro */}
        <div id="simulator-header" className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-widest">
            <Coins size={12} />
            <span>Interactive Simulator</span>
          </span>
          <h2 id="simulator-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl mt-3">
            Simulator — View Mode
          </h2>
          <p id="simulator-subheading" className="mt-3 text-sm text-sub max-w-2xl mx-auto leading-relaxed">
            No signup or login required. Adjust the parameters below to dynamically preview and test how SimpleOn distributes rewards across all cycles using MySQL backend calculations.
          </p>
        </div>

        {/* Error State with Retry */}
        {error && (
          <div className="mb-8 p-6 rounded-2xl border border-red-500/30 bg-red-500/5 text-center flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchCalculations}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              <span>Retry Calculation API</span>
            </button>
          </div>
        )}

        {/* Loading Bar */}
        {loading && !error && (
          <div className="mb-8 p-4 rounded-xl border border-border-theme bg-surface text-center flex items-center justify-center space-x-2">
            <RefreshCw size={18} className="animate-spin text-accent-red" />
            <span className="text-xs font-bold text-sub">Updating backend calculation metrics...</span>
          </div>
        )}

        {/* Global Control Station */}
        <div id="simulator-controls" className="grid gap-8 lg:grid-cols-12 mb-12">
          
          {/* Left Column: Input Settings */}
          <div id="controls-left-col" className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-border-theme bg-surface p-6 shadow-sm transition-colors">
              <h3 className="text-lg font-extrabold text-prime mb-6 flex items-center space-x-2">
                <span>Simulation Parameters</span>
              </h3>

              {/* Currency Engine */}
              <div className="mb-6">
                <label className="block text-xs font-black text-sub uppercase tracking-wider mb-2">
                  Settlement Currency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center space-x-2 rounded-xl bg-surface-elevated border border-accent-red text-xs font-bold text-prime py-3">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>USDT (TRC-20)</span>
                  </button>
                  <div className="relative group">
                    <button disabled className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-surface border border-border-theme text-xs font-bold text-sub py-3 cursor-not-allowed">
                      <span>Multi-Token</span>
                      <span className="text-[9px] bg-surface-elevated text-sub px-1.5 py-0.5 rounded">Soon</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-20">
                      Phase 2 adds INR, BTC, ETH, and custom tokens.
                    </div>
                  </div>
                </div>
              </div>

              {/* Base Plan Multiplier */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-sub uppercase tracking-wider">
                    Base Plan Amount
                  </label>
                  <span className="text-sm font-black text-accent-red">{basePlan} USDT</span>
                </div>
                
                {/* Preset Chips */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[1, 10, 100].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBasePlan(preset)}
                      className={`rounded-xl py-2.5 text-xs font-bold border transition-all ${
                        basePlan === preset
                          ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/15'
                          : 'bg-surface-elevated text-prime border-border-theme hover:bg-surface-elevated/80'
                      }`}
                    >
                      {preset} USDT
                    </button>
                  ))}
                </div>

                {/* Number Input field */}
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={basePlan}
                  onChange={(e) => setBasePlan(Math.max(0.1, parseFloat(e.target.value) || 0))}
                  className="w-full text-sm font-bold bg-surface-elevated text-prime border border-border-theme rounded-xl px-4 py-3 focus:outline-none focus:border-accent-red"
                  placeholder="Custom Base Plan amount..."
                />
              </div>

              {/* Direct Qualifications (to increase daily capping) */}
              <div className="space-y-4 pt-4 border-t border-border-theme">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sub uppercase tracking-wider">
                    Referral Qualifications
                  </span>
                  <div className="group relative">
                    <HelpCircle size={14} className="text-sub hover:text-prime cursor-pointer" />
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-neutral-900 text-white text-[10px] p-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 shadow-md">
                      By default, daily capping is 5 cycles per 24h. Referrals who upgrade to consecutive tiers unlock higher cycle caps.
                    </div>
                  </div>
                </div>

                {/* Builders slider */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-sub">Qualified Builders</span>
                    <span className="text-prime">{qualified.builders}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={qualified.builders}
                    onChange={(e) => handleReferralsChange('builders', parseInt(e.target.value) || 0)}
                    className="w-full accent-red-600 dark:accent-red-500"
                  />
                  <p className="text-[10px] text-sub mt-1">Raises Starter Cap (current: {Math.max(5, qualified.builders)})</p>
                </div>

                {/* Leaders slider */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-sub">Qualified Leaders</span>
                    <span className="text-prime">{qualified.leaders}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={qualified.leaders}
                    onChange={(e) => handleReferralsChange('leaders', parseInt(e.target.value) || 0)}
                    className="w-full accent-blue-600 dark:accent-blue-500"
                  />
                  <p className="text-[10px] text-sub mt-1">Raises Builder Cap (current: {Math.max(5, qualified.leaders)})</p>
                </div>

                {/* Champions slider */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-sub">Qualified Champions</span>
                    <span className="text-prime">{qualified.champions}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={qualified.champions}
                    onChange={(e) => handleReferralsChange('champions', parseInt(e.target.value) || 0)}
                    className="w-full accent-orange-600 dark:accent-orange-500"
                  />
                  <p className="text-[10px] text-sub mt-1">Raises Leader & Champion Cap (current: {Math.max(5, qualified.champions)})</p>
                </div>
              </div>

            </div>

            {/* Disclaimer text inside left column */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 text-[11px] text-amber-800 dark:border-amber-950/20 dark:bg-amber-950/10 dark:text-amber-500 flex space-x-2 leading-relaxed">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <span>
                <strong>Simulation Disclaimer:</strong> Values are derived from MySQL level configuration database APIs and backend calculation engine. No real crypto transactions are initiated on-chain.
              </span>
            </div>
          </div>

          {/* Right Column: Hero Metrics & Live Totals */}
          <div id="controls-right-col" className="lg:col-span-8 space-y-6">
            
            {/* Top Row: Core Hero Dashboard stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border-theme bg-surface p-5 shadow-sm transition-all">
                <span className="text-xs font-bold text-sub">Entry Pool Investment</span>
                <div className="text-2xl font-black text-prime mt-1">
                  {calculations.totalInvestedToReachMain.toFixed(2)} <span className="text-xs font-bold text-sub">USDT</span>
                </div>
                <div className="text-[10px] text-sub mt-1">Tiers Starter to Champion sum</div>
              </div>

              <div className="rounded-2xl border border-border-theme bg-surface p-5 shadow-sm transition-all">
                <span className="text-xs font-bold text-green-600">First Net Income Profit</span>
                <div className="text-2xl font-black text-green-600 mt-1">
                  {(basePlan * 156).toFixed(2)} <span className="text-xs font-bold text-green-600/60">USDT</span>
                </div>
                <div className="text-[10px] text-sub mt-1">Credited at Champion phase</div>
              </div>

              <div className="rounded-2xl border border-border-theme bg-surface p-5 shadow-sm transition-all">
                <span className="text-xs font-bold text-sub">Main Plan Subscription</span>
                <div className="text-2xl font-black text-prime mt-1">
                  {calculations.mainPlan.mainPlanTotal.toFixed(2)} <span className="text-xs font-bold text-sub">USDT</span>
                </div>
                <div className="text-[10px] text-sub mt-1">Activated from Champion upgrades</div>
              </div>
            </div>

            {/* Booster Tiers Breakdown Panel */}
            <div className="rounded-2xl border border-border-theme bg-surface p-6 shadow-sm transition-all">
              <h3 className="text-base font-extrabold text-prime mb-4">Booster Tiers (Dynamic MySQL Calculations)</h3>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {calculations.boosters.map((tier, idx) => {
                  let iconElement = <Rocket size={18} />;
                  if (tier.iconName === 'trending-up') iconElement = <TrendingUp size={18} />;
                  if (tier.iconName === 'users') iconElement = <Users size={18} />;
                  if (tier.iconName === 'trophy') iconElement = <Trophy size={18} />;

                  return (
                    <div key={idx} className="rounded-xl border border-border-theme bg-surface-elevated/30 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-prime">{tier.name}</span>
                          <div className={`p-1.5 rounded-lg border ${tier.accent}`}>
                            {iconElement}
                          </div>
                        </div>

                        <div className="text-lg font-black text-prime">
                          {tier.amount.toFixed(2)} <span className="text-[10px] text-sub">USDT</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border-theme space-y-1 text-[10px] text-sub font-bold">
                        <div className="flex justify-between">
                          <span>Collection:</span>
                          <span className="text-prime">{tier.collection.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Re-Topup:</span>
                          <span className="text-prime">{tier.retopup.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Upgrade:</span>
                          <span className="text-prime">{tier.upgrade.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-accent-red pt-1 border-t border-dashed border-border-theme">
                          <span>Daily Cap:</span>
                          <span>{tier.dailyCap} Cycles</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sanity Check Unit-Test assertion indicator */}
              <div className="mt-4 pt-3 border-t border-border-theme flex items-center justify-between text-[11px]">
                <span className="text-sub flex items-center space-x-1">
                  <Info size={12} />
                  <span>Sanity Check: Champion Collection = Re-Topup + Main Plan + Net Profit</span>
                </span>
                <span className={`font-bold px-2 py-0.5 rounded ${calculations.isSanityCheckPassed ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-500' : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-500'}`}>
                  {calculations.isSanityCheckPassed ? 'Verified ✓' : 'Assertion Mismatch ❌'}
                </span>
              </div>
            </div>

            {/* Main Plan Split & Matrix simulator */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Main Plan Splitting ratios */}
              <div className="rounded-2xl border border-border-theme bg-surface p-6 shadow-sm transition-all">
                <h3 className="text-base font-extrabold text-prime mb-4">Main Plan Breakdown (100x Base)</h3>
                <div className="space-y-4">
                  
                  {/* X5 Allocation */}
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-prime">X5 Matrix Allocation (15%)</div>
                      <div className="text-sub text-[10px]">P2P dynamic cycle system</div>
                    </div>
                    <div className="text-right font-bold text-prime">
                      {calculations.mainPlan.x5Amount.toFixed(2)} USDT
                    </div>
                  </div>

                  {/* Level Pool Allocation */}
                  <div className="flex justify-between items-center text-xs border-t border-border-theme pt-3">
                    <div>
                      <div className="font-bold text-prime">13-Level Income Pool (65%)</div>
                      <div className="text-sub text-[10px]">{(calculations.mainPlan.levelPoolAmount / NUMBER_OF_LEVELS).toFixed(2)} USDT per level</div>
                    </div>
                    <div className="text-right font-bold text-prime">
                      {calculations.mainPlan.levelPoolAmount.toFixed(2)} USDT
                    </div>
                  </div>

                  {/* X4 Allocation */}
                  <div className="flex justify-between items-center text-xs border-t border-border-theme pt-3">
                    <div>
                      <div className="font-bold text-prime">X4 Matrix Spillover (20%)</div>
                      <div className="text-sub text-[10px]">2×2 forced passive placement</div>
                    </div>
                    <div className="text-right font-bold text-prime">
                      {calculations.mainPlan.x4Amount.toFixed(2)} USDT
                    </div>
                  </div>

                  <div className="text-center pt-3 border-t border-dashed border-border-theme text-[10px] text-sub">
                    Backend Multipliers: 15% X5 + 65% Level Pool + 20% X4 = 100%
                  </div>
                </div>
              </div>

              {/* X5 Split cycle simulator */}
              <div className="rounded-2xl border border-border-theme bg-surface p-6 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-extrabold text-prime mb-4">X5 Split Tester</h3>
                    <div className="flex space-x-1.5">
                      <button 
                        onClick={() => setSelectedX5Cycle(1)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg ${selectedX5Cycle === 1 ? 'bg-red-600 text-white' : 'bg-surface-elevated text-prime'}`}
                      >
                        Cycle 1
                      </button>
                      <button 
                        onClick={() => setSelectedX5Cycle(2)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg ${selectedX5Cycle > 1 ? 'bg-red-600 text-white' : 'bg-surface-elevated text-prime'}`}
                      >
                        Cycle 2+
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-sub font-bold">
                      <span>Re-topup (20%):</span>
                      <span className="text-prime">{calculations.x5Split.retopup.toFixed(2)} USDT</span>
                    </div>

                    <div className="flex justify-between text-sub font-bold pt-2 border-t border-border-theme">
                      <span>Upgrade Wallet ({selectedX5Cycle === 1 ? '40%' : '0%'}):</span>
                      <span className="text-prime">{calculations.x5Split.upgradeWallet.toFixed(2)} USDT</span>
                    </div>

                    <div className="flex justify-between text-green-600 font-bold pt-2 border-t border-border-theme">
                      <span>Income Wallet ({selectedX5Cycle === 1 ? '40%' : '80%'}):</span>
                      <span className="font-extrabold">{calculations.x5Split.incomeWallet.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-sub leading-normal mt-4 italic">
                  Note: Cycle 1 routes upgrades to higher pools. Subsequent cycles payout 80% directly into your Income Wallet.
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* 13-Level Forced Pool Collapsible Table */}
        <div id="simulator-level-pool" className="border border-border-theme rounded-3xl overflow-hidden bg-surface shadow-sm transition-all mb-12">
          <button
            onClick={() => setLevelPoolCollapsed(!levelPoolCollapsed)}
            className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none hover:bg-surface-elevated/40 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
                <Layers size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-prime">13-Level Forced Income Pool Matrix</h3>
                <p className="text-xs text-sub mt-1">Detailed list of 13 levels showing split values and 3×3 matrix spillover potentials</p>
              </div>
            </div>
            <div>
              {levelPoolCollapsed ? <ChevronDown size={20} className="text-sub" /> : <ChevronUp size={20} className="text-sub" />}
            </div>
          </button>

          {!levelPoolCollapsed && (
            <div className="p-6 md:p-8 border-t border-border-theme bg-surface-elevated/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold border-collapse">
                  <thead>
                    <tr className="border-b border-border-theme text-sub uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Direct Allocation</th>
                      <th className="py-3 px-4">3×3 Members</th>
                      <th className="py-3 px-4 text-right">Potential Max Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-theme text-prime">
                    {calculations.levelPoolRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-elevated/20">
                        <td className="py-3.5 px-4 text-prime">Level {row.level}</td>
                        <td className="py-3.5 px-4">{row.amount.toFixed(2)} USDT</td>
                        <td className="py-3.5 px-4 text-sub">{row.members.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right text-accent-red font-extrabold">{row.potentialIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
