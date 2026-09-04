import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Rocket, TrendingUp, Users, Trophy, ChevronDown,
  ChevronUp, Layers, Target, AlertCircle, RefreshCw,
  CheckCircle2, Lock, Zap, Check, Sparkles, Gem
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
  dailyCycleLimit?: number | null;
  requiredDirectReferrals: number;
  requiredQualifiedBuilders: number;
  autoUpgradeEnabled: boolean;
  retopupEnabled: boolean;
  cappingEnabled?: boolean;
  bititanAmount?: string | null;
  matrixType?: string;
  visionaryPart1Amount?: number;
  visionaryPart2Amount?: number;
  status: string;
  version: number;
}

// Entry tier — the only tier a user can directly purchase; every tier after it activates
// automatically via qualification + cycle completion (unchanged design, just repointed from
// Starter to Launch since Launch is now the ladder's floor).
const ENTRY_TIER_SLUG = 'launch';
// Upgradeable tiers shown in the main grid, in ladder order. Visionary is the top tier and gets
// its own section below — it has no further upgrade target.
const UPGRADEABLE_TIER_SLUGS = ['launch', 'starter', 'builder', 'leader', 'champion'] as const;

const TIER_VISUALS: Record<string, { icon: React.ReactNode; accent: string; badgeBg: string }> = {
  launch: {
    icon: <Sparkles size={20} className="text-emerald-600 dark:text-emerald-500" />,
    accent: 'border-emerald-500 dark:border-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-500',
  },
  starter: {
    icon: <Rocket size={20} className="text-blue-600 dark:text-blue-500" />,
    accent: 'border-blue-500 dark:border-blue-600',
    badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-500',
  },
  builder: {
    icon: <TrendingUp size={20} className="text-cyan-600 dark:text-cyan-500" />,
    accent: 'border-cyan-500 dark:border-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/25 dark:text-cyan-500',
  },
  leader: {
    icon: <Users size={20} className="text-amber-600 dark:text-amber-500" />,
    accent: 'border-amber-500 dark:border-amber-600',
    badgeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-500',
  },
  champion: {
    icon: <Trophy size={20} className="text-purple-600 dark:text-purple-500" />,
    accent: 'border-purple-500 dark:border-purple-600',
    badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-500',
  },
};

// Minimal fallback fields used only if a tier is entirely absent from the API response
// (unreachable backend) — never used to override or reject a valid live response.
function fallbackPlanFor(slug: string): FormattedPlanApi {
  const cfg = BOOSTER_TIER_CONFIGS.find((t) => t.code === slug) || BOOSTER_TIER_CONFIGS[0];
  return {
    id: cfg.id,
    name: cfg.name,
    slug: cfg.code,
    levelOrder: 0,
    joiningAmount: String(cfg.subscriptionAmount),
    upgradeAmount: String(cfg.upgradeAmount ?? 0),
    matrixSize: cfg.slotsPerCycle,
    incomePerPosition: '0',
    cycleReward: '0',
    retopupAmount: String(cfg.resubscribeAmount),
    dailyCap: '0',
    dailyCycleLimit: cfg.cappingEnabled ? cfg.defaultDailyCapping : null,
    requiredDirectReferrals: 0,
    requiredQualifiedBuilders: 0,
    autoUpgradeEnabled: true,
    retopupEnabled: true,
    cappingEnabled: cfg.cappingEnabled,
    bititanAmount: cfg.reserveAmount != null ? String(cfg.reserveAmount) : null,
    visionaryPart1Amount: cfg.visionaryPart1Amount,
    visionaryPart2Amount: cfg.visionaryPart2Amount,
    status: 'ACTIVE',
    version: 1,
  };
}

/** Every field this page actually reads must be present and numeric-parseable — this replaces
 *  the old exact-value-match gate that actively rejected legitimate backend price changes. */
function isWellFormedPlan(plan: any): plan is FormattedPlanApi {
  return (
    plan &&
    typeof plan.slug === 'string' &&
    !Number.isNaN(Number.parseFloat(plan.joiningAmount)) &&
    !Number.isNaN(Number(plan.matrixSize)) &&
    !Number.isNaN(Number.parseFloat(plan.retopupAmount))
  );
}

export default function Plans({ basePlan = 1 }: { basePlan?: number } = {}) {
  const { isConnected, isAuthenticated, openWalletModal, userProfile } = useWeb3Store();
  const [expandedSection, setExpandedSection] = useState<'booster' | 'visionary' | null>('booster');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackConfig, setUsingFallbackConfig] = useState<boolean>(false);

  const [apiPlans, setApiPlans] = useState<FormattedPlanApi[]>([]);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  const [actionLoadingSlug, setActionLoadingSlug] = useState<string | null>(null);
  const [activePaymentIntent, setActivePaymentIntent] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

      setVerifyStatusMessage('Please confirm the transaction in your wallet...');
      setVerificationStep('wallet_confirm');
      const store = useWeb3Store.getState();

      // Launch and Visionary have no on-chain contract enum slot — they activate via a plain
      // ERC-20 transfer against the live payment-intent amount/receiver, verified the same way
      // as every other tier (PaymentService scans for a matching Transfer log; it doesn't care
      // which method produced it). Existing Starter-Champion buttons are untouched.
      const usesDirectTransfer = levelSlug === 'launch' || levelSlug === 'visionary';

      let txHash: string;
      if (usesDirectTransfer) {
        txHash = await store.activateViaTransfer(intentData.expectedAmount, intentData.receiverAddress, intentData.tokenAddress);
      } else if (type === 'JOIN' || type === 'RETOPUP') {
        txHash = await store.registerAndActivate();
      } else {
        txHash = await store.upgradeTier(levelSlug.toUpperCase());
      }

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

  const loadPlanData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallbackConfig(false);
    try {
      const [plansRes, eligRes] = await Promise.all([
        boosterApi.getPlans(),
        upgradeApi.getEligibility().catch(() => boosterApi.getEligibility().catch(() => null)),
      ]);

      const plansArray: FormattedPlanApi[] = Array.isArray(plansRes)
        ? plansRes
        : plansRes?.data?.plans || plansRes?.data || plansRes?.plans || [];

      const wellFormed = plansArray.length > 0 && plansArray.every(isWellFormedPlan);

      if (!wellFormed) {
        console.warn('Booster API returned no plans or malformed data; rendering default tier configuration.', plansArray);
        setUsingFallbackConfig(true);
      }

      setApiPlans(wellFormed ? plansArray : []);

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

  const planBySlug = (slug: string): FormattedPlanApi =>
    apiPlans.find((p) => p.slug === slug) || fallbackPlanFor(slug);

  const ladderSteps = BOOSTER_TIER_CONFIGS.map((cfg) => {
    const plan = planBySlug(cfg.code);
    return {
      slug: cfg.code,
      name: cfg.name.replace(' Pool', ''),
      cost: parseFloat(plan.joiningAmount),
      topTier: cfg.code === 'visionary',
    };
  });

  const boosterTiers = UPGRADEABLE_TIER_SLUGS.map((slug, idx) => {
    const plan = planBySlug(slug);
    const cfg = BOOSTER_TIER_CONFIGS.find((t) => t.code === slug)!;
    const visuals = TIER_VISUALS[slug];

    const cost = parseFloat(plan.joiningAmount);
    const matrixSize = Number(plan.matrixSize) || cfg.slotsPerCycle;
    const collection = cost * matrixSize;
    const reactivation = parseFloat(plan.retopupAmount);
    const nextTierSlug = cfg.upgradeTarget;
    const nextTierPlan = nextTierSlug ? planBySlug(nextTierSlug) : null;
    const nextTierCost = parseFloat(plan.upgradeAmount || '0');
    const isChampion = slug === 'champion';
    const isBuilder = slug === 'builder';
    const bititanAmount = plan.bititanAmount ? parseFloat(plan.bititanAmount) : 0;

    const cycle1Income = isChampion ? Math.max(0, collection - reactivation - nextTierCost) : 0;
    const cycle2PlusIncome = Math.max(0, collection - reactivation);
    const cappingEnabled = plan.cappingEnabled ?? cfg.cappingEnabled;
    const dailyCap = cappingEnabled ? (plan.dailyCycleLimit ?? cfg.defaultDailyCapping) : null;

    let description: string;
    if (isChampion) {
      description = `The peak of the Booster ladder. Cycle 1 distributes ${formatUsdt(collection)} exactly: ${formatUsdt(reactivation)} for re-activation, ${formatUsdt(nextTierCost)} to fund your Visionary activation, and ${formatUsdt(cycle1Income)} Net Income to you immediately. From Cycle 2 onward, you earn ${formatUsdt(cycle2PlusIncome)} Net Income per cycle.`;
    } else if (isBuilder) {
      description = `Out of ${formatUsdt(collection)} collected in Cycle 1, ${formatUsdt(reactivation)} re-activates you, ${formatUsdt(nextTierCost)} automatically funds your Leader activation, and ${formatUsdt(bititanAmount)} is reserved separately in the Bititan Wallet. From Cycle 2 onward, you earn ${formatUsdt(cycle2PlusIncome)} Net Income per cycle.`;
    } else if (slug === 'launch') {
      description = `Your entry ticket, on a fast X3 matrix. Out of ${formatUsdt(collection)} collected in Cycle 1, ${formatUsdt(reactivation)} re-activates Launch and ${formatUsdt(nextTierCost)} automatically funds your Starter activation. From Cycle 2 onward, ${formatUsdt(reactivation)} re-activates you and you earn ${formatUsdt(cycle2PlusIncome)} Net Income per cycle — with no daily cycle limit.`;
    } else {
      description = `Out of ${formatUsdt(collection)} collected in Cycle 1, ${formatUsdt(reactivation)} re-activates you and ${formatUsdt(nextTierCost)} automatically upgrades you to ${nextTierPlan?.name?.replace(' Pool', '') || cfg.upgradeTarget}. From Cycle 2 onward, you earn ${formatUsdt(cycle2PlusIncome)} Net Income per cycle.`;
    }

    return {
      slug,
      name: cfg.name.replace(' Pool', ' Booster'),
      levelOrder: idx + 1, // display-only ordering within this grid, independent of backend level_order
      matrixLabel: matrixSize === 3 ? 'X3' : 'X5',
      cost: formatUsdt(cost),
      costFormula: `${matrixSize}-position ${matrixSize === 3 ? 'X3' : 'X5'} matrix`,
      collection: `${matrixSize} × ${formatUsdt(cost)} = ${formatUsdt(collection)}`,
      upgrade: nextTierSlug ? formatUsdt(nextTierCost) : '—',
      upgradeTargetName: nextTierPlan?.name?.replace(' Pool', '') || null,
      income: isChampion
        ? `Cycle 1: ${formatUsdt(cycle1Income)} | Cycle 2+: ${formatUsdt(cycle2PlusIncome)}`
        : `Cycle 1: 0 | Cycle 2+: ${formatUsdt(cycle2PlusIncome)}`,
      dailyCapLabel: dailyCap === null ? 'Unlimited' : `${dailyCap} cycles / 24h`,
      requiredDirects: plan.requiredDirectReferrals ?? 0,
      requiredBuilders: plan.requiredQualifiedBuilders ?? 0,
      description,
      accent: visuals.accent,
      badgeBg: visuals.badgeBg,
      icon: visuals.icon,
    };
  });

  const visionaryPlan = planBySlug('visionary');
  const visionaryCost = parseFloat(visionaryPlan.joiningAmount);
  const visionaryPart1 = visionaryPlan.visionaryPart1Amount ?? 200;
  const visionaryPart2 = visionaryPlan.visionaryPart2Amount ?? 300;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqItems = [
    {
      question: "What happens when a Booster tier's matrix cycle completes?",
      answer: 'Once your matrix cycle fills (3 positions for Launch, 5 for Starter through Champion), the collected value triggers two actions: your current tier is re-activated (re-topup) for the next cycle, and the remaining collected value automatically funds your upgrade to the next tier — Builder tier additionally reserves a portion in a separate Bititan Wallet.',
    },
    {
      question: "What is 'daily capping' and how do I increase mine?",
      answer: 'Daily capping limits how many cycle completions can pay out to you in a 24-hour period (a floor of 5 for Starter through Champion). Launch and Visionary\'s X3 leg have no daily cap. To raise your limit above the floor, support your direct referrals in reaching qualified Builder, Leader, or Champion status.',
    },
    {
      question: 'How do I reach Visionary?',
      answer: 'Visionary is the top tier, reached by completing Champion (which funds 500 USDT toward Visionary activation on its first cycle). Visionary itself splits into a 200 USDT X3 matrix leg and a separate 300 USDT 3×3, 20-level matrix leg.',
    },
    {
      question: 'What are the X3 and X5 matrices?',
      answer: 'X5 is the standard 5-position recycling matrix used by Starter through Champion. X3 is a faster 3-position recycling matrix used by Launch and by Visionary\'s first component. Both split collected value in real time between re-activation, next-tier funding, and your income wallet depending on the cycle number.',
    },
  ];

  const rawOrder = (eligibilityData?.currentLevelOrder !== undefined && eligibilityData?.currentLevelOrder !== null)
    ? eligibilityData.currentLevelOrder
    : 0;

  return (
    <section id="plans-section" className="relative overflow-hidden bg-surface-elevated py-16 transition-colors duration-300">
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
            Launch to <span className="text-gradient-brand">Visionary</span> Ladder
          </h2>
          <p id="plans-subheading" className="mt-4 text-base text-sub">
            Six tiers, one matrix engine — start on Launch, automatically climb through Starter, Builder, Leader and Champion, and top out at Visionary.
          </p>
        </div>

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

        {loading && !error && (
          <div className="mb-12 p-8 rounded-2xl border border-border-theme bg-surface text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-accent-red" />
            <span className="text-xs font-bold text-sub">Fetching Booster Plan Configurations...</span>
          </div>
        )}

        {/* Pricing ladder */}
        <div id="pricing-ladder" className="mb-16">
          <div className="bg-surface-elevated/40 border border-border-theme rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-extrabold text-prime mb-8 text-center sm:text-left flex items-center space-x-2">
              <Target size={20} className="text-accent-red" />
              <span>SimpleOn Pricing Ladder</span>
            </h3>

            <div className="hidden md:flex items-center justify-between relative px-2">
              <div className="absolute left-8 right-8 top-10 h-0.5 bg-dashed bg-border-theme z-0" />

              {ladderSteps.map((step, idx) => (
                <React.Fragment key={step.slug}>
                  <div className="flex flex-col items-center relative z-10 w-24">
                    <div className={`h-14 w-14 rounded-full border-2 flex flex-col items-center justify-center font-mono shadow-sm ${step.topTier ? 'text-green-600 border-green-500/40 bg-green-500/5' : 'text-accent-red border-accent-red/30 bg-accent-red/5'}`}>
                      <span className="text-[12px] font-extrabold">{step.cost.toFixed(0)}</span>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-sm font-black text-prime block">{step.name}</span>
                      <span className="text-[11px] text-sub font-bold">{step.cost.toFixed(2)} USDT</span>
                      {step.topTier && <span className="text-[9px] text-green-600 font-black uppercase tracking-wide">Top Tier</span>}
                    </div>
                  </div>

                  {idx < ladderSteps.length - 1 && (
                    <div className="flex flex-col items-center justify-center text-xs font-black text-accent-red bg-surface-elevated px-2 py-1.5 rounded-xl border border-border-theme shadow-xs relative z-10">
                      <span>×{ladderSteps[idx + 1].cost > 0 && step.cost > 0 ? (ladderSteps[idx + 1].cost / step.cost).toFixed(1).replace(/\.0$/, '') : '—'}</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="flex md:hidden flex-col space-y-4">
              {ladderSteps.map((step) => (
                <div key={step.slug} className="flex items-center justify-between p-4 rounded-2xl border border-border-theme bg-surface">
                  <div className="flex items-center space-x-4">
                    <div className={`h-11 w-11 rounded-full border flex items-center justify-center font-mono ${step.topTier ? 'text-green-600 border-green-500/40' : 'text-accent-red border-accent-red/30'}`}>
                      <span className="text-xs font-black">{step.cost.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-sm font-black text-prime block">{step.name}{step.topTier ? ' (Top Tier)' : ''}</span>
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

        {paymentError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
            <button onClick={() => setPaymentError(null)} className="text-sub hover:text-prime text-sm">✕</button>
          </div>
        )}

        <div id="plans-accordions" className="space-y-6">

          {/* 1. Booster Plan (Launch -> Champion) */}
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
                  <h3 id="booster-header-title" className="text-xl font-bold text-prime">Booster Plan (5 Tiers)</h3>
                  <p id="booster-header-desc" className="text-xs text-sub mt-1">Launch (5 USDT) through Champion (320 USDT) — Champion automatically funds Visionary</p>
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
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                >
                  {boosterTiers.map((tier, idx) => {
                    const isCurrentOrPassed = (rawOrder >= tier.levelOrder && rawOrder > 0) || (tier.slug === ENTRY_TIER_SLUG && userProfile?.status === 'ACTIVE');
                    const isTargetLevel = tier.levelOrder === (rawOrder === 0 ? 1 : rawOrder + 1);
                    const isEligibleForUpgrade = isTargetLevel && (eligibilityData?.eligible ?? true) && !isCurrentOrPassed;
                    const isLocked = (tier.levelOrder > rawOrder + 1) || (isTargetLevel && !eligibilityData?.eligible);
                    const isDirectlyJoinable = tier.slug === ENTRY_TIER_SLUG;

                    const [costValue, costUnit] = tier.cost.split(' ');

                    return (
                      <motion.div
                        key={tier.slug}
                        id={`booster-tier-card-${idx}`}
                        variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                        className={`flex flex-col rounded-2xl border bg-surface shadow-md p-6 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${tier.accent}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-black rounded-lg ${tier.badgeBg}`}>
                            {tier.matrixLabel} Matrix
                          </span>
                          <div className="p-2 bg-surface-elevated rounded-xl">
                            {tier.icon}
                          </div>
                        </div>

                        <h4 className="text-lg font-bold text-prime mb-3">{tier.name}</h4>

                        <div className="flex items-baseline gap-1.5 mb-4">
                          <span className="text-4xl sm:text-5xl font-black text-prime tracking-tight">{costValue}</span>
                          <span className="text-xs sm:text-sm font-bold text-sub uppercase">{costUnit || 'USDT'}</span>
                        </div>

                        <p className="text-xs text-sub mb-4 flex-grow leading-relaxed">{tier.description}</p>

                        <div className="mb-4 text-[10px] font-bold text-sub space-y-1 bg-surface-elevated/60 p-2.5 rounded-xl border border-border-theme">
                          <div className="flex justify-between">
                            <span>Direct Referrals Req:</span>
                            <span className="text-prime font-black">{tier.requiredDirects}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qualified Builders Req:</span>
                            <span className="text-prime font-black">{tier.requiredBuilders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Daily Cap:</span>
                            <span className="text-prime font-black">{tier.dailyCapLabel}</span>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-border-theme text-xs font-bold text-prime">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sub font-normal">
                              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent-green/10 text-accent-green shrink-0">
                                <Check size={10} strokeWidth={3} />
                              </span>
                              Cycle Collection
                            </span>
                            <span className="text-prime">{tier.collection}</span>
                          </div>
                          {tier.upgradeTargetName && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sub font-normal">
                                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent-green/10 text-accent-green shrink-0">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                                Funds {tier.upgradeTargetName}
                              </span>
                              <span className="text-accent-red">{tier.upgrade}</span>
                            </div>
                          )}
                          {tier.income && (
                            <div className="flex items-center justify-between pt-2 border-t border-dashed border-border-theme">
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

                        <div className="mt-6 pt-3 border-t border-border-theme space-y-3">
                          <button
                            disabled={!isDirectlyJoinable || isLocked || isCurrentOrPassed || actionLoadingSlug === tier.slug}
                            onClick={() => {
                              if (isEligibleForUpgrade) {
                                handlePurchaseFlow(tier.slug === ENTRY_TIER_SLUG ? 'JOIN' : 'UPGRADE', tier.slug);
                              }
                            }}
                            className={`w-full py-3 px-3 rounded-full text-xs font-black flex items-center justify-center space-x-2 transition-all duration-300 ${isCurrentOrPassed
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 cursor-default'
                                : !isDirectlyJoinable
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
                            ) : !isDirectlyJoinable ? (
                              <>
                                <Lock size={14} />
                                <span>Auto Upgrades Only</span>
                              </>
                            ) : isEligibleForUpgrade ? (
                              <>
                                <Rocket size={14} />
                                <span>Join ({tier.cost})</span>
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

                          {activePaymentIntent && (activePaymentIntent.level?.slug === tier.slug || activePaymentIntent.metadata?.planSlug === tier.slug || activePaymentIntent.intent?.level?.slug === tier.slug) && (
                            <div className="p-3.5 rounded-xl bg-surface-elevated border border-amber-500/30 text-[11px] space-y-2 font-mono">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-amber-500">Payment Reference</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${activePaymentIntent.status === 'CONFIRMED'
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

                              {verificationStep !== 'idle' && (
                                <div className={`p-2 rounded-lg text-[10px] border space-y-1 mt-2 ${verificationStep === 'confirmed'
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

          {/* 2. Visionary — Top Tier */}
          <div id="plans-accordion-visionary" className="border border-green-500/30 rounded-3xl overflow-hidden bg-surface shadow-sm transition-colors duration-300">
            <button
              id="plans-accordion-visionary-trigger"
              onClick={() => setExpandedSection(expandedSection === 'visionary' ? null : 'visionary')}
              className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-green-500/10 text-green-600">
                  <Gem size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-prime flex items-center gap-2">
                    Visionary
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-green-500/10 text-green-600 rounded-full border border-green-500/30">Top Tier</span>
                  </h3>
                  <p className="text-xs text-sub mt-1">{formatUsdt(visionaryCost)} activation — reached after completing Champion</p>
                </div>
              </div>
              <div>
                {expandedSection === 'visionary' ? <ChevronUp size={20} className="text-sub" /> : <ChevronDown size={20} className="text-sub" />}
              </div>
            </button>

            {expandedSection === 'visionary' && (
              <div className="p-6 md:p-8 border-t border-border-theme bg-surface-elevated/40">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-border-theme bg-surface p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wide text-sub">Part 1</span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-500">X3 Matrix</span>
                    </div>
                    <div className="text-3xl font-black text-prime mb-2">{formatUsdt(visionaryPart1)}</div>
                    <p className="text-xs text-sub leading-relaxed">
                      A 3-position recycling matrix, structured the same way as Launch. First cycle: 200 USDT re-subscribes you into the next pool. Subsequent cycles pay income and re-subscription, uncapped — no daily cycle limit.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-theme bg-surface p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wide text-sub">Part 2</span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-500">3×3, 20 Levels</span>
                    </div>
                    <div className="text-3xl font-black text-prime mb-2">{formatUsdt(visionaryPart2)}</div>
                    <p className="text-xs text-sub leading-relaxed">
                      A forced 3-wide matrix spanning 20 depth levels, sized in 15 USDT units (300 ÷ 15 = 20 base units). Placement and occupancy tracking is fully live; reward and recycling rules for this component have not yet been finalized and will be published once confirmed.
                    </p>
                  </div>
                </div>
                <div className="mt-6 text-center text-xs text-sub">
                  Visionary is the final tier — there is no further upgrade target above it.
                </div>
              </div>
            )}
          </div>

        </div>

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
