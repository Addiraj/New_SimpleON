import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, RefreshCw, CheckCircle2, Clock, Users, ArrowRight, ShieldCheck, 
  Sparkles, ExternalLink, ChevronLeft, ChevronRight, Filter, Info, Zap, AlertCircle, Loader2
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { boosterApi, matrixApi } from '../services/api';
import { BOOSTER_TIER_CONFIGS, BoosterTierCode, BoosterTierConfig, formatUsdtPlain, getBoosterTierConfig } from '../data/boosterPlan';

interface MatrixNode {
  slotNumber: number;
  label: string;
  isFilled: boolean;
  address?: string;
  timestamp?: string;
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING';
  tierAmount: number;
  incomeGenerated: number;
  reTopupAmount: number;
  upgradeWalletAmount: number;
  mainPlanAmount?: number;
  netIncome?: number;
  placementType?: string;
  memberId?: string;
  transactionHash?: string | null;
}

interface CycleHistoryItem {
  cycle: number;
  id?: string;
  status: string;
  filledSlots: number;
  totalSlots: number;
  earnings: number;
  dateStarted: string;
  dateCompleted?: string | null;
}

export default function X5MatrixUI() {
  const { basePlan, address, isConnected } = useWeb3Store();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCycle, setSelectedCycle] = useState<number>(1);
  const [hoveredNode, setHoveredNode] = useState<MatrixNode | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | BoosterTierCode>('ALL');
  const [activeTierConfig, setActiveTierConfig] = useState<BoosterTierConfig | null>(null);

  const [currentNodes, setCurrentNodes] = useState<MatrixNode[]>([]);
  const [matrixCyclesHistory, setMatrixCyclesHistory] = useState<CycleHistoryItem[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalCompletedCycles: number;
    totalFilledNodes: number;
    totalGeneratedEarnings: number;
    activeCycleNumber: number;
  }>({
    totalCompletedCycles: 0,
    totalFilledNodes: 0,
    totalGeneratedEarnings: 0,
    activeCycleNumber: 1,
  });

  const urlTier = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tier') : null;
  const x5PoolAmount = activeTierConfig ? activeTierConfig.subscriptionAmount * basePlan : null;
  const slotValueLabel = x5PoolAmount === null ? '--' : formatUsdtPlain(x5PoolAmount);

  // Load Matrix Data from Backend API
  const fetchMatrixData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentPlan = await boosterApi.getCurrentPlan().catch(() => null);
      const currentTierCode = (urlTier || currentPlan?.currentLevel?.slug || currentPlan?.data?.currentLevel?.slug || 'starter') as BoosterTierCode;
      const selectedTier = getBoosterTierConfig(currentTierCode) || BOOSTER_TIER_CONFIGS[0];
      setActiveTierConfig(selectedTier);

      if (!isConnected && !address) {
        setCurrentNodes([]);
        setMatrixCyclesHistory([]);
        setSummaryData({
          totalCompletedCycles: 0,
          totalFilledNodes: 0,
          totalGeneratedEarnings: 0,
          activeCycleNumber: 0,
        });
        return;
      }

      const queryParams = {
        tier: selectedTier.code,
        address: address || undefined,
      };

      const [summaryRes, currentRes, cyclesRes] = await Promise.allSettled([
        matrixApi.getSummary(queryParams),
        matrixApi.getCurrent(queryParams),
        matrixApi.getCycles(queryParams),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const s = summaryRes.value;
        setSummaryData({
          totalCompletedCycles: s.totalCompletedCycles || 0,
          totalFilledNodes: s.totalFilledNodes || 0,
          totalGeneratedEarnings: s.totalGeneratedEarnings || 0,
          activeCycleNumber: s.activeCycleNumber || 0,
        });
        setSelectedCycle(s.activeCycleNumber || 1);
      }

      if (currentRes.status === 'fulfilled' && currentRes.value) {
        const c = currentRes.value;
        if (c.currentNodes && Array.isArray(c.currentNodes)) {
          setCurrentNodes(c.currentNodes);
        }
      }

      if (cyclesRes.status === 'fulfilled' && cyclesRes.value) {
        const cy = cyclesRes.value;
        if (cy.cycles && Array.isArray(cy.cycles)) {
          setMatrixCyclesHistory(cy.cycles);
        }
      }
    } catch (err: any) {
      console.error('Failed to load matrix data from backend:', err);
      setError(err?.message || 'Failed to load live matrix data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [address, isConnected]);

  // Handle cycle switching: Fetch positions for selected cycle
  const handleCycleSelect = async (cycleNumber: number) => {
    setSelectedCycle(cycleNumber);
    const selectedHistoryItem = matrixCyclesHistory.find((c) => c.cycle === cycleNumber);

    if (selectedHistoryItem?.id) {
      try {
        const cycleDetail = await matrixApi.getCycleById(selectedHistoryItem.id);
        if (cycleDetail?.positions) {
          const positionsMap = new Map<number, any>();
          cycleDetail.positions.forEach((p: any) => {
            positionsMap.set(p.position_number, p);
          });

          const tierConfig = activeTierConfig || BOOSTER_TIER_CONFIGS[0];
          const slotAmount = tierConfig.subscriptionAmount * basePlan;
          const nodes: MatrixNode[] = [];
          for (let slot = 1; slot <= 5; slot++) {
            const pos = positionsMap.get(slot);
            if (pos) {
              const addr = pos.member_user?.wallet_address || '0x0000...';
              nodes.push({
                slotNumber: slot,
                label: slot === 5 ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
                isFilled: true,
                address: addr,
                timestamp: pos.placed_at ? new Date(pos.placed_at).toISOString().replace('T', ' ').slice(0, 19) : '',
                status: 'COMPLETED',
                placementType: pos.placement_source?.toLowerCase(),
                memberId: pos.member_user_id,
                tierAmount: slotAmount,
                incomeGenerated: slotAmount,
                reTopupAmount: tierConfig.resubscribeAmount * basePlan,
                upgradeWalletAmount: (tierConfig.upgradeAmount || 0) * basePlan,
                mainPlanAmount: (tierConfig.mainPlanAmount || 0) * basePlan,
                netIncome: (tierConfig.netIncome || 0) * basePlan,
              });
            } else {
              nodes.push({
                slotNumber: slot,
                label: slot === 5 ? `Position #${slot} (Auto-Recycle)` : `Position #${slot}`,
                isFilled: false,
                status: 'PENDING',
                tierAmount: slotAmount,
                incomeGenerated: 0,
                reTopupAmount: 0,
                upgradeWalletAmount: 0,
              });
            }
          }
          setCurrentNodes(nodes);
        }
      } catch (e) {
        console.warn('Failed to load selected cycle details:', e);
      }
    }
  };

  // Fallback 5 empty nodes if backend hasn't populated yet
  const displayNodes = currentNodes.length === 5 ? currentNodes : Array.from({ length: 5 }, (_, i) => ({
    slotNumber: i + 1,
    label: i === 4 ? `Position #${i + 1} (Auto-Recycle)` : `Position #${i + 1}`,
    isFilled: false,
    status: 'PENDING' as const,
    tierAmount: x5PoolAmount || 0,
    incomeGenerated: 0,
    reTopupAmount: 0,
    upgradeWalletAmount: 0,
  }));

  const activeCount = displayNodes.filter(n => n.isFilled).length;
  const pendingCount = Math.max(0, 5 - activeCount);
  const currentCycleGeneratedAmount = (x5PoolAmount || 0) * activeCount;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Hero Title Header */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-3.5 py-1 text-xs font-bold text-accent-red border border-accent-red/20">
              <Layers size={14} />
              <span>X5 Matrix Engine • Booster Pool Cycle</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Interactive <span className="text-accent-red">X5 Matrix</span> Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-sub max-w-2xl leading-relaxed">
              Every 5th placement triggers automated Booster Pool recycling. Current values are loaded from the active Booster tier and verified backend configuration.
            </p>
          </div>

          {/* Cycle Selector Cards & Refresh Action */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={fetchMatrixData}
              disabled={loading}
              className="p-3 rounded-2xl bg-surface-elevated border border-border-theme hover:bg-surface text-sub hover:text-prime transition-colors flex items-center justify-center cursor-pointer"
              title="Refresh Dashboard & Wallet Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-accent-red' : ''} />
            </button>
            <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme text-right">
              <span className="text-[10px] font-mono text-sub block uppercase font-bold">Active Cycle</span>
              <span className="text-2xl font-black font-mono text-accent-red">{summaryData.activeCycleNumber ? `Cycle #${summaryData.activeCycleNumber}` : 'Unavailable'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme text-right">
              <span className="text-[10px] font-mono text-sub block uppercase font-bold">X5 Slot Value</span>
              <span className="text-2xl font-black font-mono text-emerald-500">{slotValueLabel} USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert State */}
      {error && (
        <div className="p-4 rounded-2xl bg-accent-red/10 border border-accent-red/20 text-accent-red flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchMatrixData}
            className="px-3 py-1 rounded-xl bg-accent-red text-white font-bold hover:bg-accent-red/80 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-6 rounded-3xl bg-surface border border-border-theme flex items-center justify-center space-x-3 text-sub font-mono text-xs">
          <Loader2 size={18} className="animate-spin text-accent-red" />
          <span>Synchronizing live matrix node state from blockchain database...</span>
        </div>
      )}

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-1">
          <span className="text-[10px] font-mono font-bold text-sub uppercase">Filled Node Slots</span>
          <div className="text-3xl font-black font-mono text-prime">{activeCount} / 5 Slots</div>
          <div className="w-full bg-border-theme h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-accent-red h-full rounded-full transition-all duration-500" style={{ width: `${(activeCount / 5) * 100}%` }} />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-1">
          <span className="text-[10px] font-mono font-bold text-sub uppercase">Pending Node Slots</span>
          <div className="text-3xl font-black font-mono text-amber-500">{pendingCount} Slots Open</div>
          <p className="text-[11px] text-sub">Next slot: Position #{activeCount < 5 ? activeCount + 1 : 5}</p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-1">
          <span className="text-[10px] font-mono font-bold text-sub uppercase">Cycle #{selectedCycle} Generated Income</span>
          <div className="text-3xl font-black font-mono text-emerald-500">{formatUsdtPlain(currentCycleGeneratedAmount)} USDT</div>
          <p className="text-[11px] text-emerald-500 font-bold">{activeCount} filled × {slotValueLabel} USDT</p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-1">
          <span className="text-[10px] font-mono font-bold text-sub uppercase">Completed Cycles</span>
          <div className="text-3xl font-black font-mono text-accent-blue">{summaryData.totalCompletedCycles} Cycles Recycled</div>
          <p className="text-[11px] text-sub">{summaryData.totalFilledNodes} Total Placed Positions</p>
        </div>
      </div>

      {/* INTERACTIVE SVG MATRIX SECTION */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border-theme gap-4">
          <div>
            <h2 className="text-lg font-black text-prime flex items-center space-x-2">
              <Sparkles size={18} className="text-accent-red" />
              <span>Interactive SVG X5 Matrix Node Map (Cycle #{selectedCycle})</span>
            </h2>
            <p className="text-xs text-sub">Hover over any position node to inspect live placement timestamps and wallet reward splits.</p>
          </div>

          <div className="flex items-center space-x-2">
            {activeCount === 5 ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 font-mono text-xs font-bold border border-emerald-500/20 flex items-center space-x-1.5">
                <CheckCircle2 size={14} />
                <span>Cycle #{selectedCycle} COMPLETED & Recycled</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-accent-red/10 text-accent-red font-mono text-xs font-bold border border-accent-red/20">
                Auto Spillover Active
              </span>
            )}
          </div>
        </div>

        {/* SVG Graphic Canvas */}
        <div className="relative p-8 rounded-2xl bg-surface-elevated/80 border border-border-theme flex flex-col items-center justify-center min-h-[420px]">
          
          <svg className="w-full max-w-2xl h-80 overflow-visible" viewBox="0 0 600 320">
            {/* Connector Lines from Root (300, 50) to 5 Nodes */}
            <g stroke="currentColor" className="text-border-theme" strokeWidth="2" strokeDasharray="4 4">
              <line x1="300" y1="50" x2="80" y2="230" />
              <line x1="300" y1="50" x2="190" y2="230" />
              <line x1="300" y1="50" x2="300" y2="230" />
              <line x1="300" y1="50" x2="410" y2="230" />
              <line x1="300" y1="50" x2="520" y2="230" />
            </g>

            {/* Root Node (Center Top) */}
            <g className="cursor-pointer">
              <circle cx="300" cy="50" r="28" fill="#DC2626" className="shadow-lg" />
              <text x="300" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="monospace">
                ROOT
              </text>
            </g>

            {/* 5 Satellite Nodes */}
            {displayNodes.map((node, index) => {
              const xPositions = [80, 190, 300, 410, 520];
              const cx = xPositions[index];
              const cy = 230;

              const isFilled = node.isFilled;
              const isRecycleNode = index === 4;

              return (
                <g 
                  key={node.slotNumber} 
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer group"
                >
                  {/* Outer Pulsing Ring if Active */}
                  {isFilled && (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r="26" 
                      fill="none" 
                      stroke={isRecycleNode ? "#F59E0B" : "#10B981"} 
                      strokeWidth="2"
                      className="animate-ping opacity-30" 
                    />
                  )}

                  {/* Main Circle Node */}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r="22" 
                    fill={isFilled ? (isRecycleNode ? "#F59E0B" : "#10B981") : "var(--color-surface, #1E293B)"} 
                    stroke={isFilled ? "none" : "var(--color-border-theme, #334155)"} 
                    strokeWidth="2"
                    className="transition-transform duration-200 group-hover:scale-110"
                  />

                  {/* Icon or Text inside Node */}
                  <text 
                    x={cx} 
                    y={cy + 4} 
                    textAnchor="middle" 
                    fill={isFilled ? "#FFFFFF" : "#94A3B8"} 
                    fontSize="11" 
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    #{node.slotNumber}
                  </text>

                  {/* Node Sub-label */}
                  <text 
                    x={cx} 
                    y={cy + 40} 
                    textAnchor="middle" 
                    fill="currentColor" 
                    className="text-sub" 
                    fontSize="10" 
                    fontFamily="monospace"
                  >
                    {isFilled ? `${node.address?.slice(0, 4)}...${node.address?.slice(-4)}` : 'OPEN'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Node Hover Tooltip Drawer */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border-theme rounded-2xl p-4 shadow-2xl z-20 min-w-[320px] text-xs font-mono space-y-2"
              >
                <div className="flex justify-between items-center border-b border-border-theme pb-2">
                  <span className="font-bold text-prime">{hoveredNode.label}</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    hoveredNode.isFilled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {hoveredNode.isFilled ? 'FILLED & PAID' : 'AWAITING SPILLOVER'}
                  </span>
                </div>

                {hoveredNode.isFilled ? (
                  <div className="space-y-1 text-sub">
                    <p><strong className="text-prime">Wallet:</strong> {hoveredNode.address}</p>
                    <p><strong className="text-prime">Placed:</strong> {hoveredNode.timestamp || 'Recorded'}</p>
                    <p><strong className="text-prime">Slot Amount:</strong> {formatUsdtPlain(hoveredNode.tierAmount)} USDT</p>
                    <p className="text-emerald-500 font-bold">
                      Cycle Generated: +{formatUsdtPlain(hoveredNode.incomeGenerated)} USDT
                    </p>
                  </div>
                ) : (
                  <p className="text-sub">
                    Position empty. Direct referrals or matrix spillover from upline will occupy this slot automatically.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cycle Breakdown Flow Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2">
            <h3 className="text-xs font-extrabold text-prime font-mono uppercase flex items-center space-x-2">
              <Zap size={14} className="text-accent-red" />
              <span>Cycle 1 Payout Formula</span>
            </h3>
            <p className="text-xs text-sub leading-relaxed">
              <strong>{formatUsdtPlain(activeTierConfig?.resubscribeAmount || 0)} USDT</strong> Re-subscribe + <strong>{formatUsdtPlain(activeTierConfig?.upgradeAmount || 0)} USDT</strong> Auto Upgrade{activeTierConfig?.upgradeTarget ? ` to ${activeTierConfig.upgradeTarget}` : ''}.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2">
            <h3 className="text-xs font-extrabold text-prime font-mono uppercase flex items-center space-x-2">
              <RefreshCw size={14} className="text-emerald-500" />
              <span>Cycle 2+ Perpetual Recycling Formula</span>
            </h3>
            <p className="text-xs text-sub leading-relaxed">
              {activeTierConfig?.code === 'champion' ? (
                <><strong>{formatUsdtPlain(activeTierConfig.mainPlanAmount || 0)} USDT</strong> Main Plan activation + <strong>{formatUsdtPlain(activeTierConfig.netIncome || 0)} USDT</strong> first net income.</>
              ) : (
                <>Cycle 2+ distribution is loaded from backend configuration when available.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* MATRIX HISTORY TABLE WITH FILTERS & PAGINATION */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-theme">
          <div>
            <h2 className="text-lg font-black text-prime flex items-center space-x-2">
              <Clock size={18} className="text-accent-blue" />
              <span>Matrix Cycles Log & Historic Payouts</span>
            </h2>
            <p className="text-xs text-sub">Complete record of active and completed X5 matrix cycles</p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs font-mono font-bold text-prime focus:outline-none"
            >
              <option value="ALL">All Cycles</option>
              <option value="COMPLETED">Completed Cycles</option>
              <option value="IN_PROGRESS">Active In Progress</option>
              <option value="starter">Starter Cycles</option>
              <option value="builder">Builder Cycles</option>
              <option value="leader">Leader Cycles</option>
              <option value="champion">Champion Cycles</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {matrixCyclesHistory.length === 0 ? (
            <div className="py-8 text-center text-sub font-mono text-xs">
              No matrix cycle records found yet. Active plan purchases will automatically start Cycle #1.
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Cycle ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Slot Progress</th>
                  <th className="py-3 px-4">Total Income Generated</th>
                  <th className="py-3 px-4">Date Started</th>
                  <th className="py-3 px-4">Date Recycled</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {matrixCyclesHistory
                  .filter(item => {
                    if (historyFilter === 'COMPLETED') return item.status === 'COMPLETED';
                    if (historyFilter === 'IN_PROGRESS') return item.status === 'ACTIVE' || item.status === 'IN_PROGRESS';
                    if (['starter', 'builder', 'leader', 'champion'].includes(historyFilter)) return (item as any).levelSlug === historyFilter;
                    return true;
                  })
                  .map((item) => (
                    <tr key={item.cycle} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-prime">Cycle #{item.cycle}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-prime font-bold">{item.filledSlots} / {item.totalSlots || 5} Slots</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-500">{formatUsdtPlain(item.earnings || 0)} USDT</td>
                      <td className="py-3.5 px-4 text-sub">{item.dateStarted || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-sub">{item.dateCompleted || 'In Progress'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => handleCycleSelect(item.cycle)}
                          className="px-3 py-1 rounded-lg bg-surface-elevated hover:bg-surface border border-border-theme text-prime text-[11px] font-bold"
                        >
                          View Node Map
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
