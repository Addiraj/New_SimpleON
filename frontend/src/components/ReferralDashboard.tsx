import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserCheck, Copy, Check, QrCode, Share2, Search, Filter, 
  ArrowUpRight, ExternalLink, Sparkles, Trophy, DollarSign, Layers, 
  TrendingUp, Download, Send, Twitter, MessageSquare, ChevronDown, ChevronRight,
  UserPlus, ShieldCheck, Zap, RefreshCw, Eye, Info, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { referralApi } from '../services/api';

// Mock Referral Member Interface
interface ReferralMember {
  id: string;
  address: string;
  level: number; // 1 = Direct, 2+ = Indirect
  tier: 'STARTER' | 'BUILDER' | 'LEADER' | 'VIP';
  tierAmount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SPILLOVER';
  joinedDate: string;
  directsCount: number;
  volumeGenerated: number;
  commissionEarned: number;
  matrixPosition: string; // e.g., "Node #1.2"
  children?: ReferralMember[];
}

// Default empty lists
const defaultMembersList: ReferralMember[] = [];

const defaultReferralTreeData: ReferralMember = {
  id: 'root',
  address: 'Connect Wallet',
  level: 0,
  tier: 'STARTER',
  tierAmount: 0,
  status: 'INACTIVE',
  joinedDate: '-',
  directsCount: 0,
  volumeGenerated: 0,
  commissionEarned: 0,
  matrixPosition: 'Root',
  children: []
};

export default function ReferralDashboard() {
  const { address, isAuthenticated, openWalletModal } = useWeb3Store();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'DIRECT' | 'INDIRECT'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'STARTER' | 'BUILDER' | 'LEADER' | 'VIP'>('ALL');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<ReferralMember | null>(null);
  const [customInviteMsg, setCustomInviteMsg] = useState('Hey! Join my SimpleOn Web3 Matrix team on BNB Smart Chain and start earning 20% direct referral commissions + 13-Level team spillover!');

  // Live Referral Data State
  const [summaryData, setSummaryData] = useState<any>(null);
  const [treeData, setTreeData] = useState<any>(defaultReferralTreeData);
  const [membersList, setMembersList] = useState<ReferralMember[]>(defaultMembersList);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Assign Sponsor Form State
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignInput, setAssignInput] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  const [assignMsg, setAssignMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    setLoading(true);

    const loadReferralData = async () => {
      try {
        const [sumRes, directRes, treeRes] = await Promise.allSettled([
          referralApi.getSummary(),
          referralApi.getDirect({ page: 1, limit: 50 }),
          referralApi.getTree({ maxDepth: 5 }),
        ]);

        if (!isMounted) return;

        if (sumRes.status === 'fulfilled' && sumRes.value) {
          const data = sumRes.value.data || sumRes.value;
          setSummaryData(data);
        }

        if (directRes.status === 'fulfilled') {
          const apiMembersList = directRes.value?.data?.members || directRes.value?.members || [];
          const apiMembers: ReferralMember[] = apiMembersList.map((m: any, idx: number) => ({
            id: m.id || `m-${idx}`,
            address: m.walletAddress,
            level: m.depth || 1,
            tier: 'STARTER',
            tierAmount: 100,
            status: m.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
            joinedDate: m.joiningDate ? m.joiningDate.substring(0, 10) : '2026-02-01',
            directsCount: m.directsCount || 0,
            volumeGenerated: m.volumeGenerated || 500,
            commissionEarned: (m.volumeGenerated || 500) * 0.2,
            matrixPosition: `Node #${m.depth || 1}.${idx + 1}`,
          }));
          if (apiMembers.length > 0) {
            setMembersList(apiMembers);
          }
        }

        if (treeRes.status === 'fulfilled') {
          const apiTree = treeRes.value?.data?.root || treeRes.value?.root;
          if (apiTree) {
            const formatTreeNode = (node: any): ReferralMember => ({
            id: node.id,
            address: node.walletAddress,
            level: node.depth || 0,
            tier: node.level === 'VIP' ? 'VIP' : node.level === 'Leader' ? 'LEADER' : node.level === 'Builder' ? 'BUILDER' : 'STARTER',
            tierAmount: node.level === 'VIP' ? 1000 : node.level === 'Leader' ? 500 : node.level === 'Builder' ? 250 : 100,
            status: node.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
            joinedDate: node.joiningDate ? node.joiningDate.substring(0, 10) : '2026-01-15',
            directsCount: node.directsCount || 0,
            volumeGenerated: 10000,
            commissionEarned: 200,
            matrixPosition: node.depth === 0 ? 'Root Node' : `L${node.depth} Node`,
            children: node.children ? node.children.map(formatTreeNode) : [],
          });
          setTreeData(formatTreeNode(apiTree));
          }
        }
      } catch (err) {
        console.warn('Error loading referral API:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReferralData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const userAddress = address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  const referralCode = summaryData?.referralCode || (address ? address.slice(-8).toUpperCase() : 'F6D8976F');
  const referralUrl = summaryData?.referralUrl || `${window.location.origin}/?ref=${referralCode}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyRefCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAssignSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignInput.trim()) return;

    setAssignLoading(true);
    setAssignMsg(null);

    try {
      const res = await referralApi.assignSponsor(assignInput.trim());
      setAssignMsg({ type: 'success', text: res?.message || 'Sponsor assigned successfully!' });
      setAssignInput('');
      // Refresh summary
      const sumRes = await referralApi.getSummary();
      if (sumRes?.data) setSummaryData(sumRes.data);
    } catch (err: any) {
      setAssignMsg({ type: 'error', text: err.message || 'Failed to assign sponsor' });
    } finally {
      setAssignLoading(false);
    }
  };

  // Filtered members list
  const filteredMembers = membersList.filter(m => {
    const matchesSearch = m.address.toLowerCase().includes(searchQuery.toLowerCase()) || m.matrixPosition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' ? true : levelFilter === 'DIRECT' ? m.level === 1 : m.level > 1;
    const matchesTier = tierFilter === 'ALL' ? true : m.tier === tierFilter;
    return matchesSearch && matchesLevel && matchesTier;
  });

  // Social Share Handlers
  const handleShareTwitter = () => {
    const text = encodeURIComponent(`${customInviteMsg}\n\nJoin here: ${referralUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(customInviteMsg);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`${customInviteMsg}\n${referralUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SimpleOn Web3 Referral Invitation',
          text: customInviteMsg,
          url: referralUrl,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      copyUrl();
    }
  };

  return (
    <div id="referral-dashboard-root" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Top Hero Banner */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-accent-red/10 px-3.5 py-1 text-xs font-bold text-accent-red border border-accent-red/20 mb-1">
              <Users size={14} />
              <span>13-Level Forced Matrix Affiliate Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-prime tracking-tight">
              Referral <span className="text-accent-red">Dashboard</span> & Network Tree
            </h1>
            <p className="text-xs sm:text-sm text-sub max-w-2xl leading-relaxed">
              Earn <strong className="text-prime">20% direct sponsor rewards</strong> + <strong className="text-prime">65% 13-Level matrix spillover commissions</strong>. Share your unique link and track team depth in real time.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowAssignModal(true)}
              className="p-3.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-border-theme text-prime transition-colors flex items-center space-x-2 text-xs font-bold"
            >
              <UserCheck size={18} className="text-accent-blue" />
              <span className="hidden sm:inline">Assign Upline</span>
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-accent-red text-white text-xs font-black shadow-lg shadow-accent-red/25 hover:bg-accent-red/90 transition-all flex items-center space-x-2"
            >
              <UserPlus size={16} />
              <span>Invite Friends</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="p-3.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-border-theme text-prime transition-colors flex items-center space-x-2 text-xs font-bold"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. REFERRAL LINK & QUICK COPY BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-theme">
          <div>
            <h2 className="text-lg font-black text-prime flex items-center space-x-2">
              <Sparkles size={18} className="text-accent-red" />
              <span>Your Unique Referral Assets</span>
            </h2>
            <p className="text-xs text-sub">Share your invite link to automatically register direct team partners on BNB Smart Chain</p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-sub font-bold">Invite Code:</span>
            <span className="bg-accent-red/10 border border-accent-red/20 text-accent-red font-black px-3 py-1 rounded-xl">
              {referralCode}
            </span>
            <button
              onClick={copyRefCode}
              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-sub hover:text-prime border border-border-theme"
              title="Copy Referral Code"
            >
              {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Link Input Box (8 Cols) */}
          <div className="lg:col-span-8 space-y-2">
            <label className="text-xs font-mono font-bold text-sub uppercase">Personal Referral URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 p-3.5 rounded-2xl bg-surface-elevated border border-border-theme font-mono text-xs text-prime focus:outline-none truncate"
              />
              <button
                onClick={copyUrl}
                className="px-6 py-3.5 rounded-2xl bg-accent-red text-white text-xs font-black shadow-md hover:bg-accent-red/90 transition-all flex items-center space-x-1.5 shrink-0"
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Share Buttons Row (4 Cols) */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-xs font-mono font-bold text-sub uppercase">Quick Social Share</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShareTwitter}
                className="flex-1 p-3 rounded-2xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                title="Share on Twitter / X"
              >
                <Twitter size={16} />
                <span className="hidden sm:inline">X / Twitter</span>
              </button>

              <button
                onClick={handleShareTelegram}
                className="flex-1 p-3 rounded-2xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                title="Share on Telegram"
              >
                <Send size={16} />
                <span className="hidden sm:inline">Telegram</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex-1 p-3 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                title="Share on WhatsApp"
              >
                <MessageSquare size={16} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="p-3 rounded-2xl bg-surface-elevated hover:bg-surface border border-border-theme text-prime text-xs font-bold transition-all"
                title="More Share Options"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. REFERRAL STATISTICS CARDS (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Stat 1: Direct Referrals */}
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-sub">
            <span className="text-[11px] font-mono font-bold uppercase">Direct Referrals</span>
            <Users size={18} className="text-accent-red" />
          </div>
          <div className="text-3xl font-black font-mono text-prime">
            {summaryData ? `${summaryData.directReferralCount} Directs` : '0 Directs'}
          </div>
          <p className="text-[11px] text-emerald-500 font-bold flex items-center space-x-1">
            <CheckCircle2 size={12} />
            <span>{summaryData ? `${summaryData.qualifiedBuilders || 0} Active / Qualified` : '0 Active / 0 Pending Upgrade'}</span>
          </p>
        </div>

        {/* Stat 2: Indirect Referrals */}
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-sub">
            <span className="text-[11px] font-mono font-bold uppercase">Indirect Referrals (L2-L13)</span>
            <Layers size={18} className="text-accent-blue" />
          </div>
          <div className="text-3xl font-black font-mono text-accent-blue">
            {summaryData ? `${summaryData.indirectReferralCount} Members` : '0 Team Members'}
          </div>
          <p className="text-[11px] text-sub">
            {summaryData ? `Total Team Depth: ${summaryData.totalTeamCount}` : 'Spanning 13 Matrix Team Levels'}
          </p>
        </div>

        {/* Stat 3: Total Referral Earnings / Total Team */}
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-sub">
            <span className="text-[11px] font-mono font-bold uppercase">Total Network Team</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-500">
            {summaryData ? `${summaryData.totalTeamCount} Members` : '$0.00 USDT'}
          </div>
          <p className="text-[11px] text-emerald-500 font-bold flex items-center space-x-1">
            <TrendingUp size={12} />
            <span>Real-time direct & indirect tree</span>
          </p>
        </div>

        {/* Stat 4: Qualified Builders */}
        <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-sub">
            <span className="text-[11px] font-mono font-bold uppercase">Qualified Builders</span>
            <Trophy size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono text-prime">
            {summaryData ? `${summaryData.qualifiedBuilders} Builders` : '0%'}
          </div>
          <p className="text-[11px] text-sub">Qualifies for 100% Spillover Pool</p>
        </div>

      </div>

      {/* 3. BEAUTIFUL INTERACTIVE TREE VISUALIZATION SECTION */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-theme">
          <div>
            <h2 className="text-lg font-black text-prime flex items-center space-x-2">
              <Layers size={18} className="text-accent-red" />
              <span>Interactive Network Tree Visualizer</span>
            </h2>
            <p className="text-xs text-sub">Visual representation of your root node, level 1 directs, and matrix spillover branches</p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-sub mr-2">Active</span>
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-sub mr-2">Spillover</span>
            <span className="w-3 h-3 rounded-full bg-border-theme inline-block" />
            <span className="text-sub">Inactive</span>
          </div>
        </div>

        {/* Visual Tree Rendering */}
        <div className="p-6 rounded-2xl bg-surface-elevated/80 border border-border-theme overflow-x-auto">
          <div className="min-w-[700px] flex flex-col items-center space-y-8 py-4">
            
            {/* Level 0: Root Node (User) */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setSelectedNodeDetails(treeData)}
                className="px-6 py-3.5 rounded-2xl bg-accent-red text-white shadow-xl shadow-accent-red/20 font-mono text-xs font-extrabold flex items-center space-x-2 border-2 border-white/20 hover:scale-105 transition-all"
              >
                <Zap size={16} />
                <span>{treeData.address !== 'Connect Wallet' ? `ROOT: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)} (${treeData.tier})` : 'Connect Wallet to View'}</span>
              </button>
              <div className="w-0.5 h-8 bg-accent-red/40" />
            </div>

            {/* Level 1 Direct Nodes */}
            <div className="relative w-full flex justify-around items-start">
              {/* Horizontal Connecting Line */}
              <div className="absolute top-0 left-1/6 right-1/6 h-0.5 bg-accent-red/30" />

              {treeData.children?.map((child: ReferralMember) => (
                <div key={child.id} className="flex flex-col items-center relative space-y-6">
                  {/* Vertical Line from top horizontal connector */}
                  <div className="w-0.5 h-6 bg-accent-red/30 -mt-6" />

                  {/* Child Node Box */}
                  <button
                    onClick={() => setSelectedNodeDetails(child)}
                    className={`px-5 py-3 rounded-2xl border font-mono text-xs font-bold transition-all hover:scale-105 shadow-md ${
                      child.status === 'ACTIVE'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        : child.status === 'SPILLOVER'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                        : 'border-border-theme bg-surface text-sub'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-current" />
                      <span>{child.address.slice(0, 6)}...</span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-0.5">{child.matrixPosition} • {child.tier}</div>
                  </button>

                  {/* Level 2 Sub-Children Connection */}
                  {child.children && child.children.length > 0 && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-0.5 h-6 bg-border-theme" />
                      <div className="flex space-x-3">
                        {child.children.map((subChild) => (
                          <button
                            key={subChild.id}
                            onClick={() => setSelectedNodeDetails(subChild)}
                            className={`p-2.5 rounded-xl border font-mono text-[10px] transition-all hover:scale-105 ${
                              subChild.status === 'ACTIVE'
                                ? 'border-emerald-500/60 bg-emerald-500/5 text-emerald-500'
                                : subChild.status === 'SPILLOVER'
                                ? 'border-amber-500/60 bg-amber-500/5 text-amber-500'
                                : 'border-border-theme bg-surface text-sub'
                            }`}
                          >
                            <div className="font-bold">{subChild.address.slice(0, 4)}...</div>
                            <div className="text-[9px] opacity-70">{subChild.tier}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <AnimatePresence>
          {selectedNodeDetails && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border-theme">
                <div className="flex items-center space-x-2">
                  <UserCheck size={16} className="text-accent-red" />
                  <span className="text-xs font-extrabold font-mono text-prime">
                    Selected Member: {selectedNodeDetails.address}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNodeDetails(null)}
                  className="text-xs font-bold text-sub hover:text-prime"
                >
                  Close Detail
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-sub text-[10px]">Tier Plan:</span>
                  <div className="font-bold text-prime">{selectedNodeDetails.tier} (${selectedNodeDetails.tierAmount})</div>
                </div>
                <div>
                  <span className="text-sub text-[10px]">Matrix Placement:</span>
                  <div className="font-bold text-prime">{selectedNodeDetails.matrixPosition}</div>
                </div>
                <div>
                  <span className="text-sub text-[10px]">Direct Referrals:</span>
                  <div className="font-bold text-prime">{selectedNodeDetails.directsCount} Partners</div>
                </div>
                <div>
                  <span className="text-sub text-[10px]">Volume Generated:</span>
                  <div className="font-bold text-emerald-500">${selectedNodeDetails.volumeGenerated.toLocaleString()} USDT</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. SEARCH & FILTERED REFERRAL TEAM LIST */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-theme">
          <div>
            <h2 className="text-lg font-black text-prime flex items-center space-x-2">
              <Users size={18} className="text-accent-blue" />
              <span>Referral Team Member Directory</span>
            </h2>
            <p className="text-xs text-sub">Search and filter direct sponsors, indirect matrix members, and spillovers</p>
          </div>

          {/* Search Bar & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none" />
              <input
                type="text"
                placeholder="Search by address or node position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs text-prime placeholder-sub focus:outline-none focus:border-accent-red"
              />
            </div>

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs font-mono font-bold text-prime focus:outline-none"
            >
              <option value="ALL">All Levels (L1-L13)</option>
              <option value="DIRECT">Direct Level 1</option>
              <option value="INDIRECT">Indirect (L2-L13)</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs font-mono font-bold text-prime focus:outline-none"
            >
              <option value="ALL">All Tiers</option>
              <option value="STARTER">Starter ($100)</option>
              <option value="BUILDER">Builder ($250)</option>
              <option value="LEADER">Leader ($500)</option>
              <option value="VIP">VIP ($1000)</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-theme text-[10px] font-mono text-sub uppercase tracking-wider">
                <th className="py-3 px-4">Member Address</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Tier Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Directs</th>
                <th className="py-3 px-4">Team Volume</th>
                <th className="py-3 px-4">Commission Earned</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme text-xs font-mono">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-surface-elevated/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-prime">
                    {m.address.slice(0, 8)}...{m.address.slice(-6)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      m.level === 1 ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                    }`}>
                      {m.level === 1 ? 'L1 Direct' : `L${m.level} Indirect`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-prime">
                    {m.tier} (${m.tierAmount})
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1 text-[10px] font-bold ${
                      m.status === 'ACTIVE' ? 'text-emerald-500' : m.status === 'SPILLOVER' ? 'text-amber-500' : 'text-sub'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{m.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-prime">{m.directsCount} Directs</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-500">${m.volumeGenerated.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-bold text-accent-red">+${m.commissionEarned} USDT</td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={`https://testnet.bscscan.com/address/${m.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-sub hover:text-prime border border-border-theme inline-block"
                      title="View on BscScan"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: QR CODE MODAL */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface border border-border-theme rounded-3xl p-6 shadow-2xl text-center space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border-theme">
                <span className="text-sm font-extrabold text-prime">Referral QR Code</span>
                <button onClick={() => setShowQrModal(false)} className="p-1 rounded-xl hover:bg-surface-elevated">
                  ✕
                </button>
              </div>

              {/* Vector SVG QR Code Graphic */}
              <div className="p-6 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner border border-gray-200">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-900">
                  <path d="M10 10h30v30H10zM50 10h10v10H50zM70 10h20v20H70zM10 50h10v10H10zM30 50h20v10H30zM60 50h30v30H60zM10 70h20v20H10zM40 70h10v20H40zM20 20h10v10H20zM80 20h10v10H80zM70 70h10v10H70z" />
                  <rect x="42" y="42" width="16" height="16" fill="#DC2626" rx="4" />
                </svg>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-prime">{referralCode}</div>
                <p className="text-[11px] text-sub">Scan with any mobile Web3 wallet camera to register instantly.</p>
              </div>

              <button
                onClick={copyUrl}
                className="w-full py-3 rounded-2xl bg-accent-red text-white text-xs font-black shadow-md hover:bg-accent-red/90 transition-all"
              >
                Copy Link Instead
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INVITE FRIENDS MODAL */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface border border-border-theme rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border-theme">
                <div className="flex items-center space-x-2">
                  <UserPlus size={18} className="text-accent-red" />
                  <span className="text-sm font-extrabold text-prime">Customize Invitation Message</span>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-xl hover:bg-surface-elevated">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-sub uppercase">Invitation Text</label>
                <textarea
                  rows={4}
                  value={customInviteMsg}
                  onChange={(e) => setCustomInviteMsg(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-surface-elevated border border-border-theme text-xs text-prime focus:outline-none focus:border-accent-red"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleNativeShare}
                  className="w-full py-3.5 rounded-2xl bg-accent-red text-white font-extrabold text-xs shadow-lg shadow-accent-red/25 hover:bg-accent-red/90 transition-all flex items-center justify-center space-x-2"
                >
                  <Share2 size={16} />
                  <span>Send Invitation Now</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ASSIGN SPONSOR MODAL */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface border border-border-theme rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border-theme">
                <div className="flex items-center space-x-2">
                  <UserCheck size={18} className="text-accent-blue" />
                  <span className="text-sm font-extrabold text-prime">Assign Sponsor / Upline</span>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-xl hover:bg-surface-elevated">
                  ✕
                </button>
              </div>

              {assignMsg && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                  assignMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {assignMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{assignMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleAssignSponsorSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-sub uppercase">Sponsor Referral Code or Wallet Address</label>
                  <input
                    type="text"
                    placeholder="e.g. SO-A1B2C3D4 or 0x123..."
                    value={assignInput}
                    onChange={(e) => setAssignInput(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-surface-elevated border border-border-theme text-xs font-mono text-prime focus:outline-none focus:border-accent-blue"
                  />
                  <p className="text-[11px] text-sub">Note: Sponsors cannot be changed once assigned or after account activation.</p>
                </div>

                <button
                  type="submit"
                  disabled={assignLoading || !assignInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-accent-blue text-white font-extrabold text-xs shadow-lg shadow-accent-blue/25 hover:bg-accent-blue/90 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {assignLoading ? <RefreshCw size={16} className="animate-spin" /> : <UserCheck size={16} />}
                  <span>{assignLoading ? 'Validating Upline...' : 'Confirm Sponsor Assignment'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
