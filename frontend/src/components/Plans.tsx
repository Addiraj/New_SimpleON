import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Rocket, TrendingUp, Users, Trophy, ChevronDown,
  ChevronUp, Layers, Target, AlertCircle, RefreshCw,
  CheckCircle2, Lock, Zap, Check
} from 'lucide-react';
import { boosterApi, paymentApi, upgradeApi } from '../services/api';
import { useWeb3Store } from '../store/useWeb3Store';
import { BOOSTER_TIER_CONFIGS, formatUsdt } from '../data/boosterPlan';
export interface FormattedPlanApi {
  id: string;
  name: string;
  slug: string;
  levelOrder: number;
  joiningAmount: string;
  upgradeAmount: string;
  matrixSize: number;
  incomePerPosition: string;
  cycleReward: string;
  retopupAmount: string;
  dailyCap: string;
  dailyCycleLimit?: number;
  requiredDirectReferrals: number;
  requiredQualifiedBuilders: number;
  autoUpgradeEnabled: boolean;
  retopupEnabled: boolean;
  status: string;
  version: number;
}

export default function Plans({ basePlan = 1 }: { basePlan?: number } = {}) {
  const { isConnected, isAuthenticated, openWalletModal, userProfile, fetchProfile } = useWeb3Store();
  const [expandedSection, setExpandedSection] = useState<'booster' | 'main' | null>('booster');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackConfig, setUsingFallbackConfig] = useState<boolean>(false);

  const [apiPlans, setApiPlans] = useState<FormattedPlanApi[]>([]);
  const [calculations, setCalculations] = useState<any>(null);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  // Payment Intent State
  const [actionLoadingSlug, setActionLoadingSlug] = useState<string | null>(null);
  const [activePaymentIntent, setActivePaymentIntent] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Verification States

  const [verificationStep, setVerificationStep] = useState<
    'idle' | 'wallet_confirm' | 'blockchain_pending' | 'backend_verifying' | 'confirmed' | 'failed'
  >('idle');
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<string | null>(null);

  const handlePurchaseFlow = async (type: 'JOIN' | 'UPGRADE' | 'RETOPUP', levelSlug: string) => {
    if (!isConnected || !isAuthenticated) {
      setPaymentError('Please connect your wallet and sign in to activate or upgrade booster plans.');
      openWalletModal();
      return;
    }

    setActionLoadingSlug(levelSlug);
    setPaymentError(null);
    setVerificationStep('idle');
    setVerifyStatusMessage(null);
    setActivePaymentIntent(null);
    
    try {
      // 1. Create Intent
      setVerifyStatusMessage('Initializing secure payment session...');
      setVerificationStep('backend_verifying');
      let res: any;
      if (type === 'JOIN') {
        res = await paymentApi.createJoinIntent({ levelSlug });
      } else if (type === 'UPGRADE') {
        try {
          res = await upgradeApi.createPaymentIntent({ levelSlug });
        } catch {
          res = await paymentApi.createUpgradeIntent({ levelSlug });
        }
      } else {
        res = await paymentApi.createRetopupIntent({ levelSlug });
      }
      const intentData = res?.data || res;
      setActivePaymentIntent(intentData);

      // 2. Trigger Web3 Transaction
      setVerifyStatusMessage('Please confirm the transaction in your wallet...');
      setVerificationStep('wallet_confirm');
      const store = useWeb3Store.getState();
      
      let txHash: string;
      if (type === 'JOIN' || type === 'RETOPUP') {
        txHash = await store.registerAndActivate();
      } else {
        txHash = await store.upgradeTier(levelSlug.toUpperCase());
      }

      // 3. Verify on Backend
      setVerifyStatusMessage('Verifying transaction on the blockchain...');
      setVerificationStep('blockchain_pending');
      
      const verifyRes: any = await paymentApi.verifyPayment({
        paymentIntentId: intentData.id,
        txHash: txHash,
      });

      const verifiedData = verifyRes?.data || verifyRes;
      if (verifiedData?.paymentIntent) {
        setActivePaymentIntent(verifiedData.paymentIntent);
      }
      setVerificationStep('confirmed');
      setVerifyStatusMessage('Payment successfully verified on-chain!');
      
      window.dispatchEvent(new Event('dashboard_refresh'));
      await store.fetchProfile();
      await loadPlanData();

    } catch (err: any) {
      setPaymentError(err?.message || 'Payment flow failed');
      setVerificationStep('failed');
      setVerifyStatusMessage(err?.reason || err?.message || 'Transaction failed or rejected');
    } finally {
      setActionLoadingSlug(null);
    }
  };

  // Load level configurations from MySQL via API
  const loadPlanData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallbackConfig(false);
    try {
      const [plansRes, calcRes, eligRes] = await Promise.all([
        boosterApi.getPlans(),
        boosterApi.calculate(basePlan),
        upgradeApi.getEligibility().catch(() => boosterApi.getEligibility().catch(() => null)),
      ]);

      const plansArray: FormattedPlanApi[] = Array.isArray(plansRes)
        ? plansRes
        : plansRes?.data || plansRes?.plans || [];

      const validPlans = plansArray.length === 4 && plansArray.every((plan) => {
        const verified = BOOSTER_TIER_CONFIGS.find((tier) => tier.code === plan.slug);
        return verified
          && Number.parseFloat(plan.joiningAmount) === verified.subscriptionAmount
          && Number(plan.matrixSize) === verified.slotsPerCycle
          && Number.parseFloat(plan.retopupAmount) === verified.resubscribeAmount
          && Number(plan.dailyCycleLimit ?? 5) === verified.defaultDailyCapping;
      });

      if (!validPlans) {
        console.warn('Booster API config unavailable or invalid; rendering verified default tier configuration.', plansArray);
        setUsingFallbackConfig(true);
      }

      setApiPlans(validPlans ? plansArray : []);
      setCalculations(calcRes?.data || calcRes);

      if (eligRes) {
        setEligibilityData(eligRes?.data || eligRes);
      }
    } catch (err: any) {
      console.error('Error loading booster plan configurations:', err);
      setUsingFallbackConfig(true);
      setError('Booster plan information is temporarily being loaded from the default configuration.');
    } finally {
      setLoading(false);
    }
  }, [basePlan]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  // Fallback defaults if API is loading or empty
  const starterPlan = apiPlans.find((p) => p.slug === 'starter') || {
    joiningAmount: String(BOOSTER_TIER_CONFIGS[0].subscriptionAmount),
    upgradeAmount: String(BOOSTER_TIER_CONFIGS[0].upgradeAmount),
    retopupAmount: String(BOOSTER_TIER_CONFIGS[0].resubscribeAmount),
    dailyCap: String(BOOSTER_TIER_CONFIGS[0].defaultDailyCapping),
    matrixSize: BOOSTER_TIER_CONFIGS[0].slotsPerCycle,
    requiredDirectReferrals: 0,
    requiredQualifiedBuilders: 0,
  };
  const builderPlan = apiPlans.find((p) => p.slug === 'builder') || {
    joiningAmount: String(BOOSTER_TIER_CONFIGS[1].subscriptionAmount),
    upgradeAmount: String(BOOSTER_TIER_CONFIGS[1].upgradeAmount),
    retopupAmount: String(BOOSTER_TIER_CONFIGS[1].resubscribeAmount),
    dailyCap: String(BOOSTER_TIER_CONFIGS[1].defaultDailyCapping),
    matrixSize: BOOSTER_TIER_CONFIGS[1].slotsPerCycle,
    requiredDirectReferrals: 1,
    requiredQualifiedBuilders: 0,
  };
  const leaderPlan = apiPlans.find((p) => p.slug === 'leader') || {
    joiningAmount: String(BOOSTER_TIER_CONFIGS[2].subscriptionAmount),
    upgradeAmount: String(BOOSTER_TIER_CONFIGS[2].upgradeAmount),
    retopupAmount: String(BOOSTER_TIER_CONFIGS[2].resubscribeAmount),
    dailyCap: String(BOOSTER_TIER_CONFIGS[2].defaultDailyCapping),
    matrixSize: BOOSTER_TIER_CONFIGS[2].slotsPerCycle,
    requiredDirectReferrals: 2,
    requiredQualifiedBuilders: 1,
  };
  const championPlan = apiPlans.find((p) => p.slug === 'champion') || {
    joiningAmount: String(BOOSTER_TIER_CONFIGS[3].subscriptionAmount),
    upgradeAmount: String(BOOSTER_TIER_CONFIGS[3].mainPlanAmount),
    retopupAmount: String(BOOSTER_TIER_CONFIGS[3].resubscribeAmount),
    dailyCap: String(BOOSTER_TIER_CONFIGS[3].defaultDailyCapping),
    matrixSize: BOOSTER_TIER_CONFIGS[3].slotsPerCycle,
    requiredDirectReferrals: 3,
    requiredQualifiedBuilders: 2,
  };

  const starterCost = basePlan * parseFloat(starterPlan.joiningAmount || '10');
  const builderCost = basePlan * parseFloat(builderPlan.joiningAmount || '40');
  const leaderCost = basePlan * parseFloat(leaderPlan.joiningAmount || '80');
  const championCost = basePlan * parseFloat(championPlan.joiningAmount || '320');
  const mainPlanCost = basePlan * 500;

  const boosterTiers = [
    {
      slug: 'starter',
      name: 'Starter Booster',
      levelOrder: 1,
      cost: formatUsdt(starterCost),
      costFormula: `${parseFloat(starterPlan.joiningAmount || '10')} × Base Plan`,
      collection: `${starterPlan.matrixSize || 5} × ${formatUsdt(starterCost)} = ${formatUsdt(starterCost * (starterPlan.matrixSize || 5))}`,
      reSubscribe: formatUsdt(starterCost),
      upgrade: formatUsdt(builderCost),
      income: `Cycle 1: 0 | Cycle 2+: ${formatUsdt(basePlan * 40)}`,
      requiredDirects: starterPlan.requiredDirectReferrals ?? 0,
      requiredBuilders: starterPlan.requiredQualifiedBuilders ?? 0,
      description: `Your entry ticket. Out of ${(starterCost * (starterPlan.matrixSize || 5)).toFixed(2)} USDT collected in Cycle 1, ${starterCost.toFixed(2)} USDT re-subscribes you and ${builderCost.toFixed(2)} USDT automatically upgrades you to Builder. From Cycle 2 onwards, you earn 40.00 USDT Net Profit per cycle!`,
      accent: 'border-blue-500 dark:border-blue-600',
      badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-500',
      icon: <Rocket size={20} className="text-blue-600 dark:text-blue-500" />,
    },
    {
      slug: 'builder',
      name: 'Builder Booster',
      levelOrder: 2,
      cost: formatUsdt(builderCost),
      costFormula: `${parseFloat(builderPlan.joiningAmount || '40')} × Base Plan`,
      collection: `${builderPlan.matrixSize || 5} × ${formatUsdt(builderCost)} = ${formatUsdt(builderCost * (builderPlan.matrixSize || 5))}`,
      reSubscribe: formatUsdt(builderCost),
      upgrade: formatUsdt(leaderCost),
      income: `Cycle 1: 0 | Cycle 2+: ${formatUsdt(basePlan * 160)}`,
      requiredDirects: builderPlan.requiredDirectReferrals ?? 1,
      requiredBuilders: builderPlan.requiredQualifiedBuilders ?? 0,
      description: `The second tier. Out of ${(builderCost * (builderPlan.matrixSize || 5)).toFixed(2)} USDT collected in Cycle 1, ${builderCost.toFixed(2)} USDT is recycled for re-subscription, ${leaderCost.toFixed(2)} USDT auto-upgrades you to Leader, and 80.00 USDT goes to the B-Titan Reserve. From Cycle 2 onwards, you earn 160.00 USDT Net Profit per cycle!`,
      accent: 'border-cyan-500 dark:border-cyan-600',
      badgeBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/25 dark:text-cyan-500',
      icon: <TrendingUp size={20} className="text-cyan-600 dark:text-cyan-500" />,
    },
    {
      slug: 'leader',
      name: 'Leader Booster',
      levelOrder: 3,
      cost: formatUsdt(leaderCost),
      costFormula: `${parseFloat(leaderPlan.joiningAmount || '80')} × Base Plan`,
      collection: `${leaderPlan.matrixSize || 5} × ${formatUsdt(leaderCost)} = ${formatUsdt(leaderCost * (leaderPlan.matrixSize || 5))}`,
      reSubscribe: formatUsdt(leaderCost),
      upgrade: formatUsdt(championCost),
      income: `Cycle 1: 0 | Cycle 2+: ${formatUsdt(basePlan * 320)}`,
      requiredDirects: leaderPlan.requiredDirectReferrals ?? 2,
      requiredBuilders: leaderPlan.requiredQualifiedBuilders ?? 1,
      description: `The high tier. Out of ${(leaderCost * (leaderPlan.matrixSize || 5)).toFixed(2)} USDT collected in Cycle 1, ${leaderCost.toFixed(2)} USDT goes to re-subscription and ${championCost.toFixed(2)} USDT automatically upgrades you to Champion. From Cycle 2 onwards, you earn 320.00 USDT Net Profit per cycle!`,
      accent: 'border-amber-500 dark:border-amber-600',
      badgeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-500',
      icon: <Users size={20} className="text-amber-600 dark:text-amber-500" />,
    },
    {
      slug: 'champion',
      name: 'Champion Booster',
      levelOrder: 4,
      cost: formatUsdt(championCost),
      costFormula: `${parseFloat(championPlan.joiningAmount || '320')} × Base Plan`,
      collection: `${championPlan.matrixSize || 5} × ${formatUsdt(championCost)} = ${formatUsdt(championCost * (championPlan.matrixSize || 5))}`,
      reSubscribe: formatUsdt(championCost),
      upgrade: `${formatUsdt(mainPlanCost)} (to Main Plan)`,
      income: `Cycle 1: ${formatUsdt(basePlan * 780)} | Cycle 2+: ${formatUsdt(basePlan * 1280)}`,
      requiredDirects: championPlan.requiredDirectReferrals ?? 3,
      requiredBuilders: championPlan.requiredQualifiedBuilders ?? 2,
      description: `The peak of Booster. Cycle 1 distributes ${formatUsdt(championCost * (championPlan.matrixSize || 5))} exactly: ${formatUsdt(championCost)} for re-topup, ${formatUsdt(mainPlanCost)} to activate Main Plan, and ${formatUsdt(basePlan * 780)} Net Income. From Cycle 2 onwards, you earn ${formatUsdt(basePlan * 1280)} Net Income per cycle!`,
      accent: 'border-purple-500 dark:border-purple-600',
      badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-500',
      icon: <Trophy size={20} className="text-purple-600 dark:text-purple-500" />,
    },
  ];

  const x5Amt = calculations?.mainPlan?.x5MatrixSplit ?? mainPlanCost * 0.15;
  const levelPoolAmt = calculations?.mainPlan?.forcedLevelPool ?? mainPlanCost * 0.65;
  const x4Amt = calculations?.mainPlan?.x4MatrixAllocation ?? mainPlanCost * 0.20;

  const mainPlanAllocations = [
    {
      module: 'X5 Matrix Split',
      percentage: '15%',
      amount: `${x5Amt.toFixed(2)} USDT`,
      formula: '15% × Main Plan Amount',
      description: 'A dedicated 5-position matrix. Payout cycle 1: 20% retopup, 40% upgrade wallet, 40% income. From cycle 2 onward: 20% retopup, 80% direct net income.',
    },
    {
      module: '13-Level Forced Income Pool',
      percentage: '65%',
      amount: `${levelPoolAmt.toFixed(2)} USDT`,
      formula: '65% × Main Plan Amount',
      description: `Distributed evenly as ${(levelPoolAmt / 13).toFixed(2)} USDT per level across 13 levels. Leverages a 3×3 forced matrix with automated spillover placement.`,
    },
    {
      module: 'X4 Matrix Allocation',
      percentage: '20%',
      amount: `${x4Amt.toFixed(2)} USDT`,
      formula: '20% × Main Plan Amount',
      description: 'A 2×2 forced spillover matrix. Allocates 20.00 USDT for automated spillover recycling, unlimited cycles, and passive team placement.',
    },
  ];

  const ladderSteps = [
    { name: 'Starter', multiple: `${parseFloat(starterPlan.joiningAmount || '1')}x`, cost: starterCost, color: 'text-accent-red border-accent-red/30 bg-accent-red/5' },
    { name: 'Builder', multiple: `${parseFloat(builderPlan.joiningAmount || '4')}x`, cost: builderCost, color: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5' },
    { name: 'Leader', multiple: `${parseFloat(leaderPlan.joiningAmount || '16')}x`, cost: leaderCost, color: 'text-accent-orange border-accent-orange/30 bg-accent-orange/5' },
    { name: 'Champion', multiple: `${parseFloat(championPlan.joiningAmount || '64')}x`, cost: championCost, color: 'text-accent-purple border-accent-purple/30 bg-accent-purple/5' },
    { name: 'Main Plan', multiple: '100x', cost: mainPlanCost, color: 'text-green-600 border-green-500/30 bg-green-500/5' },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqItems = [
    {
      question: "What happens when a Booster tier's 5 direct slots are full?",
      answer: `Once your 5 direct partner slots are filled, the gathered subscription value triggers two simultaneous actions: first, your current Booster tier is immediately re-subscribed (re-topup) so you can receive from subsequent cycles, and second, the remaining collected value is used to automatically upgrade your position to the next higher Booster level.`
    },
    {
      question: "What is 'daily capping' and how do I increase mine?",
      answer: "Daily capping is a protective limit that defines the maximum cycle distributions you can receive in a 24-hour period (initially set to 5 cycles). To increase your daily capping limit, you can support your active direct referrals in upgrading to higher tier qualification levels (such as Qualified Builder, Leader, or Champion)."
    },
    {
      question: "What's the difference between the Booster Plan and the Main Plan?",
      answer: `The Booster Plan is the entry and acceleration phase where participants start with a low, flexible budget (1x Base Plan) and build up team size and upgrade capital. The Main Plan is the advanced, high-yield tier (100x Base Plan) that activates once you complete the Champion Booster, opening deep matrix splits, level pools, and global spillovers.`
    },
    {
      question: "What are the X5 and X4 matrices?",
      answer: "The X5 Matrix is a fast-recycling 5-position matrix where payouts are split in real-time (splitting into recycling, upgrade, and income wallets depending on your current cycle number). The X4 Matrix is a 2×2 forced passive placement matrix that utilizes global spillover pathways, allowing slots to be filled by upstream or downstream team activity."
    },
    {
      question: "What happens to my position if I stop referring new members?",
      answer: "Because SimpleOn includes passive structures like the 13-Level forced pool and the X4 Matrix, your position can still receive passive spillover placements and distributions from active upline or downline members. However, active direct referrals are highly recommended to accelerate your booster tier upgrades and increase your daily capping limits."
    }
  ];

  return (
    <section id="plans-section" className="relative overflow-hidden bg-surface-elevated py-16 transition-colors duration-300">
      {/* Decorative ambient glow orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-accent-red/20 blur-3xl animate-pulse-slow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent-orange/15 blur-3xl animate-pulse-slow"
      />

      <div id="plans-container" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div id="plans-header" className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-[10px] font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-wider">
            <Zap size={12} />
            <span>Pricing &amp; Plans</span>
          </span>
          <h2 id="plans-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl lg:text-5xl">
            Dual-Plan <span className="text-gradient-brand">Earning</span> Structure
          </h2>
          <p id="plans-subheading" className="mt-4 text-base text-sub">
            A dynamic mathematical system where Booster levels feed directly into the high-yield Main Plan.
          </p>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div className="mb-12 p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={loadPlanData}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface-elevated border border-border-theme text-prime font-bold text-xs hover:bg-surface transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              <span>Retry Loading Booster Configurations</span>
            </button>
          </div>
        )}

        {usingFallbackConfig && !error && (
          <div className="mb-12 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center text-amber-600 dark:text-amber-400 text-sm font-bold">
            Booster plan information is temporarily being loaded from the default configuration.
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !error && (
          <div className="mb-12 p-8 rounded-2xl border border-border-theme bg-surface text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-accent-red" />
            <span className="text-xs font-bold text-sub">Fetching MySQL Booster Plan Configurations...</span>
          </div>
        )}

        {/* ===========================================
            4. SLOT/LEVEL PRICING LADDER
           =========================================== */}
        <div id="pricing-ladder" className="mb-16">
          <div className="bg-surface-elevated/40 border border-border-theme rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-extrabold text-prime mb-8 text-center sm:text-left flex items-center space-x-2">
              <Target size={20} className="text-accent-red" />
              <span>SimpleOn Pricing Ladder & Growth Multipliers</span>
            </h3>

            {/* Desktop / Tablet Timeline view */}
            <div className="hidden md:flex items-center justify-between relative px-4">
              <div className="absolute left-12 right-12 top-10 h-0.5 bg-dashed bg-border-theme z-0" />

              {ladderSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex flex-col items-center relative z-10 w-28">
                    <div className={`h-14 w-14 rounded-full border-2 flex flex-col items-center justify-center font-mono ${step.color} shadow-sm`}>
                      <span className="text-[10px] font-black tracking-tighter opacity-80">{step.multiple}</span>
                      <span className="text-[12px] font-extrabold -mt-1">{step.cost.toFixed(0)}</span>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-sm font-black text-prime block">{step.name}</span>
                      <span className="text-[11px] text-sub font-bold">{step.cost.toFixed(2)} USDT</span>
                    </div>
                  </div>

                  {idx < ladderSteps.length - 1 && (
                    <div className="flex flex-col items-center justify-center text-xs font-black text-accent-red bg-surface-elevated px-2.5 py-1.5 rounded-xl border border-border-theme shadow-xs relative z-10 hover:scale-105 transition-transform">
                      <span>×4</span>
                      <span className="text-[9px] text-sub uppercase tracking-tighter">Scale</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile List/Vertical view */}
            <div className="flex md:hidden flex-col space-y-4">
              {ladderSteps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-border-theme bg-surface">
                  <div className="flex items-center space-x-4">
                    <div className={`h-11 w-11 rounded-full border flex flex-col items-center justify-center font-mono ${step.color}`}>
                      <span className="text-[8px] font-bold">{step.multiple}</span>
                      <span className="text-xs font-black">{step.cost.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-sm font-black text-prime block">{step.name} Tier</span>
                      <span className="text-xs text-sub">{step.multiple} of Base Plan</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-accent-red block">{step.cost.toFixed(2)}</span>
                    <span className="text-[10px] text-sub font-bold">USDT Cost</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Error Alert */}
        {paymentError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
            <button onClick={() => setPaymentError(null)} className="text-sub hover:text-prime text-sm">✕</button>
          </div>
        )}

        {/* Section Accordions */}
        <div id="plans-accordions" className="space-y-6">

          {/* 1. Booster Plan */}
          <div id="plans-accordion-booster" className="border border-border-theme rounded-3xl overflow-hidden bg-surface shadow-sm transition-colors duration-300">
            <button
              id="plans-accordion-booster-trigger"
              onClick={() => setExpandedSection(expandedSection === 'booster' ? null : 'booster')}
              className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none hover:bg-surface-elevated transition-colors"
            >
              <div id="booster-header-group" className="flex items-center space-x-4">
                <div id="booster-header-icon" className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
                  <Rocket size={24} />
                </div>
                <div>
                  <h3 id="booster-header-title" className="text-xl font-bold text-prime">Booster Plan (4 Upgrade Tiers)</h3>
                  <p id="booster-header-desc" className="text-xs text-sub mt-1">Scale from 1 USDT to 64 USDT to trigger automatic Main Plan entry</p>
                </div>
              </div>
              <div id="booster-header-toggle">
                {expandedSection === 'booster' ? <ChevronUp size={20} className="text-sub" /> : <ChevronDown size={20} className="text-sub" />}
              </div>
            </button>

            {expandedSection === 'booster' && (
              <div id="plans-accordion-booster-content" className="p-6 md:p-8 border-t border-border-theme bg-surface-elevated/40">
                <motion.div
                  id="booster-tiers-grid"
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                >
                  {boosterTiers.map((tier, idx) => {
                    const rawOrder = (eligibilityData?.currentLevelOrder !== undefined && eligibilityData?.currentLevelOrder !== null)
                      ? eligibilityData.currentLevelOrder
                      : 0;
                    
                    const isConfirmedIntent = activePaymentIntent?.status === 'CONFIRMED' && (
                      activePaymentIntent?.level?.slug === tier.slug || 
                      activePaymentIntent?.metadata?.planSlug === tier.slug ||
                      activePaymentIntent?.intent?.level?.slug === tier.slug
                    );

                    const confirmedLevelOrder = (activePaymentIntent?.status === 'CONFIRMED' && activePaymentIntent?.level?.levelOrder)
                      ? activePaymentIntent.level.levelOrder
                      : isConfirmedIntent ? tier.levelOrder : 0;

                    const currentOrder = Math.max(rawOrder, confirmedLevelOrder);
                    const isCurrentOrPassed = (currentOrder >= tier.levelOrder && currentOrder > 0) || (tier.slug === 'starter' && userProfile?.status === 'ACTIVE');
                    const isTargetLevel = tier.levelOrder === (currentOrder === 0 ? 1 : currentOrder + 1);
                    const isEligibleForUpgrade = isTargetLevel && (eligibilityData?.eligible ?? true) && !isCurrentOrPassed;
                    const isLocked = (tier.levelOrder > currentOrder + 1) || (isTargetLevel && !eligibilityData?.eligible);

                    const [costValue, costUnit] = tier.cost.split(' ');

                    return (
                      <motion.div
                        key={idx}
                        id={`booster-tier-card-${idx}`}
                        variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                        className={`flex flex-col rounded-2xl border bg-surface shadow-md p-6 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${tier.accent}`}
                      >
                        <div id={`booster-tier-icon-group-${idx}`} className="flex items-center justify-between mb-4">
                          <span id={`booster-tier-badge-${idx}`} className={`inline-flex items-center px-3 py-1 text-xs font-black rounded-lg ${tier.badgeBg}`}>
                            {tier.costFormula}
                          </span>
                          <div id={`booster-tier-icon-${idx}`} className="p-2 bg-surface-elevated rounded-xl">
                            {tier.icon}
                          </div>
                        </div>

                        <h4 id={`booster-tier-name-${idx}`} className="text-lg font-bold text-prime mb-3">{tier.name}</h4>

                        {/* Prominent price display */}
                        <div id={`booster-tier-price-${idx}`} className="flex items-baseline gap-1.5 mb-4">
                          <span className="text-4xl sm:text-5xl font-black text-prime tracking-tight">{costValue}</span>
                          <span className="text-xs sm:text-sm font-bold text-sub uppercase">{costUnit || 'USDT'}</span>
                        </div>

                        <p id={`booster-tier-desc-${idx}`} className="text-xs text-sub mb-4 flex-grow leading-relaxed">{tier.description}</p>

                        {/* Requirements Badge */}
                        <div className="mb-4 text-[10px] font-bold text-sub space-y-1 bg-surface-elevated/60 p-2.5 rounded-xl border border-border-theme">
                          <div className="flex justify-between">
                            <span>Direct Referrals Req:</span>
                            <span className="text-prime font-black">{tier.requiredDirects}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qualified Builders Req:</span>
                            <span className="text-prime font-black">{tier.requiredBuilders}</span>
                          </div>
                        </div>

                        <div id={`booster-tier-stats-${idx}`} className="space-y-3 pt-4 border-t border-border-theme text-xs font-bold text-prime">
                          <div id={`booster-tier-stat-coll-${idx}`} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sub font-normal">
                              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent-green/10 text-accent-green shrink-0">
                                <Check size={10} strokeWidth={3} />
                              </span>
                              Collection (5x)
                            </span>
                            <span className="text-prime">{tier.collection}</span>
                          </div>
                          <div id={`booster-tier-stat-up-${idx}`} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sub font-normal">
                              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent-green/10 text-accent-green shrink-0">
                                <Check size={10} strokeWidth={3} />
                              </span>
                              Auto Upgrade
                            </span>
                            <span className="text-accent-red">{tier.upgrade}</span>
                          </div>
                          {tier.income && (
                            <div id={`booster-tier-stat-inc-${idx}`} className="flex items-center justify-between pt-2 border-t border-dashed border-border-theme">
                              <span className="flex items-center gap-2 text-green-600">
                                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent-green/10 text-accent-green shrink-0">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                                Net Profit
                              </span>
                              <span className="text-green-600 font-black">{tier.income}</span>
                            </div>
                          )}
                        </div>

                        {/* Plan Action Button (Disabled when ineligible) */}
                        <div className="mt-6 pt-3 border-t border-border-theme space-y-3">
                          <button
                            disabled={tier.slug !== 'starter' || isLocked || isCurrentOrPassed || actionLoadingSlug === tier.slug}
                            onClick={() => {
                              if (isEligibleForUpgrade) {
                                handlePurchaseFlow(tier.slug === 'starter' ? 'JOIN' : 'UPGRADE', tier.slug);
                              }
                            }}
                            className={`w-full py-3 px-3 rounded-full text-xs font-black flex items-center justify-center space-x-2 transition-all duration-300 ${
                              isCurrentOrPassed
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 cursor-default'
                                : tier.slug !== 'starter'
                                ? 'border border-border-theme text-sub opacity-60 cursor-not-allowed hover:border-accent-red/40'
                                : isEligibleForUpgrade
                                ? 'bg-gradient-to-r from-accent-red to-blue-700 text-white shadow-xl shadow-accent-red/30 hover:shadow-2xl hover:brightness-110 cursor-pointer'
                                : 'border border-border-theme text-sub opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {actionLoadingSlug === tier.slug ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Activating...</span>
                              </>
                            ) : isCurrentOrPassed ? (
                              <>
                                <CheckCircle2 size={14} />
                                <span>Active Tier</span>
                              </>
                            ) : tier.slug !== 'starter' ? (
                              <>
                                <Lock size={14} />
                                <span>Auto Upgrades Only</span>
                              </>
                            ) : isEligibleForUpgrade ? (
                              <>
                                <Rocket size={14} />
                                <span>Join (10 USDT)</span>
                              </>
                            ) : (
                              <>
                                <Lock size={14} />
                                <span>
                                  {tier.requiredDirects > 0
                                    ? `Locked (${tier.requiredDirects} Directs)`
                                    : 'Ineligible'}
                                </span>
                              </>
                            )}
                          </button>

                          {/* Active Pending Payment Intent Box for this tier */}
                          {activePaymentIntent && (activePaymentIntent.level?.slug === tier.slug || activePaymentIntent.metadata?.planSlug === tier.slug || activePaymentIntent.intent?.level?.slug === tier.slug) && (
                            <div className="p-3.5 rounded-xl bg-surface-elevated border border-amber-500/30 text-[11px] space-y-2 font-mono">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-amber-500">Payment Reference</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                  activePaymentIntent.status === 'CONFIRMED'
                                    ? 'bg-green-500/20 text-green-500'
                                    : activePaymentIntent.status === 'FAILED'
                                    ? 'bg-red-500/20 text-red-500'
                                    : 'bg-amber-500/20 text-amber-500'
                                }`}>
                                  {activePaymentIntent.status}
                                </span>
                              </div>
                              <div className="font-extrabold text-prime truncate">{activePaymentIntent.paymentReference}</div>
                              <div className="flex justify-between text-sub text-[10px]">
                                <span>Expected Amount:</span>
                                <span className="font-bold text-prime">{activePaymentIntent.expectedAmount} USDT</span>
                              </div>
                              <div className="flex justify-between text-sub text-[10px]">
                                <span>Receiver:</span>
                                <span className="font-bold text-prime truncate max-w-[120px]">{activePaymentIntent.receiverAddress}</span>
                              </div>

                              {/* Verification Stepper */}
                              {verificationStep !== 'idle' && (
                                <div className={`p-2 rounded-lg text-[10px] border space-y-1 mt-2 ${
                                  verificationStep === 'confirmed'
                                    ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                    : verificationStep === 'failed'
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                }`}>
                                  <div className="flex items-center space-x-1.5 font-bold">
                                    {(verificationStep === 'wallet_confirm' || verificationStep === 'blockchain_pending' || verificationStep === 'backend_verifying') && (
                                      <RefreshCw size={12} className="animate-spin shrink-0" />
                                    )}
                                    {verificationStep === 'confirmed' && <CheckCircle2 size={12} className="shrink-0" />}
                                    {verificationStep === 'failed' && <AlertCircle size={12} className="shrink-0" />}
                                    <span className="uppercase font-mono text-[9px]">{verificationStep.replace('_', ' ')}</span>
                                  </div>
                                  <div className="text-[10px] leading-tight">{verifyStatusMessage}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </div>

          {/* 2. Main Plan */}
          <div id="plans-accordion-main" className="border border-border-theme rounded-3xl overflow-hidden bg-surface shadow-sm transition-colors duration-300">
            <button
              id="plans-accordion-main-trigger"
              onClick={() => setExpandedSection(expandedSection === 'main' ? null : 'main')}
              className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none hover:bg-surface-elevated transition-colors"
            >
              <div id="main-header-group" className="flex items-center space-x-4">
                <div id="main-header-icon" className="p-3 rounded-2xl bg-accent-red/10 text-accent-red">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 id="main-header-title" className="text-xl font-bold text-prime">Main Plan</h3>
                  <p id="main-header-desc" className="text-xs text-sub mt-1">Multi-tiered matrix engine</p>
                </div>
              </div>
              <div id="main-header-toggle">
                {expandedSection === 'main' ? <ChevronUp size={20} className="text-sub" /> : <ChevronDown size={20} className="text-sub" />}
              </div>
            </button>

            {expandedSection === 'main' && (
              <div id="plans-accordion-main-content" className="p-12 md:p-16 border-t border-border-theme bg-surface-elevated/40 flex flex-col items-center justify-center text-center">
                <h4 className="text-2xl font-black text-prime mb-2">Coming Soon</h4>
                <p className="text-sm text-sub">Main Plan is currently unavailable and will be available soon.</p>
              </div>
            )}
          </div>

        </div>

        {/* ===========================================
            6. EXPANDED FAQ SECTION
           =========================================== */}
        <div id="plans-faq-section" className="mt-20 pt-12 border-t border-border-theme/40">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-wider mb-2">
              Learn More
            </span>
            <h3 className="text-2xl font-black text-prime">Frequently Asked Questions</h3>
            <p className="text-sm text-sub mt-2">
              Get clear, direct answers about the system's mathematics, split structures, and placement spillovers.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqItems.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-border-theme rounded-2xl bg-surface overflow-hidden shadow-xs transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-prime hover:bg-surface-elevated/50 transition-colors"
                  >
                    <span className="text-sm md:text-base pr-4">{faq.question}</span>
                    <div>
                      {isOpen ? (
                        <ChevronUp size={18} className="text-accent-red" />
                      ) : (
                        <ChevronDown size={18} className="text-sub" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-5 border-t border-border-theme bg-surface-elevated/20 text-xs md:text-sm text-sub leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
