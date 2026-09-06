import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, ArrowUpRight, Download, Filter, Search, ExternalLink, 
  RefreshCw, CheckCircle2, Clock, Sparkles, AlertCircle, Shield, ChevronLeft, ChevronRight, AlertTriangle 
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { LoadingSkeletonTable, EmptyStateView, ErrorStateAlert, SuccessStateBanner } from './StateComponents';
import { walletApi, transactionApi } from '../services/api';

interface WalletSummary {
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalEarned: number;
  totalDebits: number;
  totalPaid: number;
  todaysEarnings: number;
}

interface TransactionItem {
  id: string;
  txHash: string;
  blockchainTransactionHash?: string;
  type: string;
  tier?: string;
  amountUsdt: number;
  amount: number;
  currency?: string;
  fromAddress: string;
  status: string;
  timestamp: string;
  createdAt: string;
  explorerUrl?: string | null;
  description?: string;
}

interface LedgerTransactionsProps {
  hideHeader?: boolean;
}

export default function LedgerTransactions({ hideHeader = false }: LedgerTransactionsProps) {
  const { address, isConnected } = useWeb3Store();
  const [uiState, setUiState] = useState<'loaded' | 'loading' | 'empty' | 'error' | 'success'>('loaded');
  
  // Real State Data
  const [summary, setSummary] = useState<WalletSummary>({
    availableBalance: 0,
    pendingBalance: 0,
    lockedBalance: 0,
    totalEarned: 0,
    totalDebits: 0,
    totalPaid: 0,
    todaysEarnings: 0,
  });

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Modal for Withdrawal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Load Wallet Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await walletApi.getSummary();
      if (res) {
        setSummary({
          availableBalance: Number(res.availableBalance ?? 0),
          pendingBalance: Number(res.pendingBalance ?? 0),
          lockedBalance: Number(res.lockedBalance ?? 0),
          totalEarned: Number(res.totalEarned ?? 0),
          totalDebits: Number(res.totalDebits ?? 0),
          totalPaid: Number(res.totalPaid ?? 0),
          todaysEarnings: Number(res.todaysEarnings ?? 0),
        });
      }
    } catch (err) {
      console.error('Failed to fetch wallet summary:', err);
    }
  }, []);

  // Load Transactions with Filters and Pagination
  const fetchTransactions = useCallback(async () => {
    setUiState('loading');
    try {
      const res = await transactionApi.getTransactions({
        page,
        limit: 10,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      if (res && Array.isArray(res.transactions)) {
        const mapped = res.transactions.map((tx: any) => ({
          id: tx.id,
          txHash: tx.blockchainTransactionHash || tx.txHash || tx.id,
          type: tx.type || 'PLAN_JOIN',
          tier: tx.metadata?.tier || tx.tier || 'STARTER',
          amountUsdt: Number(tx.amountUsdt ?? tx.amount ?? 0),
          amount: tx.amount ?? 0,
          currency: tx.currency || 'USDT',
          fromAddress: tx.fromAddress || 'Unknown',
          status: tx.status || 'COMPLETED',
          timestamp: tx.createdAt || tx.timestamp || new Date().toISOString(),
          createdAt: tx.createdAt || tx.timestamp || new Date().toISOString(),
          explorerUrl: tx.explorerUrl || (tx.blockchainTransactionHash ? `https://testnet.bscscan.com/tx/${tx.blockchainTransactionHash}` : null),
          description: tx.description,
        }));

        setTransactions(mapped);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || mapped.length);

        if (mapped.length === 0 && !searchQuery && typeFilter === 'ALL') {
          setUiState('empty');
        } else {
          setUiState('loaded');
        }
      } else {
        setTransactions([]);
        setUiState('empty');
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setUiState('error');
    }
  }, [page, typeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await transactionApi.exportCSV({
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      const blob = new Blob([res.data || res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '0x0000...0000';
    if (addr.length < 10) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div id="ledger-wrapper" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title & Header */}
      {!hideHeader && (
        <div id="ledger-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border-theme pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-accent-red font-bold mb-1">
            <Wallet size={16} />
            <span>Real-time On-Chain Accounting</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-prime">
            Wallet Ledger & Earnings
          </h1>
          <p className="text-sm text-sub mt-1">
            Auditable transaction logs for direct commissions, matrix splits, auto re-topup reserves, and payout disbursements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-accent-red/80 text-white text-xs font-bold hover:bg-accent-red transition-all flex items-center space-x-2 shadow-lg shadow-accent-red/25"
          >
            <ArrowUpRight size={16} />
            <span>Withdraw USDT</span>
            <span className="ml-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/30">Not Available</span>
          </button>
        </div>
      </div>
      )}

      {/* Quick Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-surface border border-border-theme glass-panel">
          <div className="flex justify-between items-center text-sub text-xs mb-2">
            <span>Available Balance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-prime">
            ${summary.availableBalance.toFixed(2)} <span className="text-xs text-sub font-medium">USDT</span>
          </div>
          <p className="text-[11px] text-emerald-500 font-semibold mt-1">Immutable ledger balance</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border-theme glass-panel">
          <div className="flex justify-between items-center text-sub text-xs mb-2">
            <span>Pending / Locked Reserve</span>
            <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue">
              <Shield size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-prime">
            ${(summary.pendingBalance + summary.lockedBalance).toFixed(2)} <span className="text-xs text-sub font-medium">USDT</span>
          </div>
          <p className="text-[11px] text-sub font-medium mt-1">Reserved for matrix upgrade & capping</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border-theme glass-panel">
          <div className="flex justify-between items-center text-sub text-xs mb-2">
            <span>Total Earnings</span>
            <div className="p-2 rounded-xl bg-accent-purple/10 text-accent-purple">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-prime">
            ${summary.totalEarned.toFixed(2)} <span className="text-xs text-sub font-medium">USDT</span>
          </div>
          <p className="text-[11px] text-emerald-500 font-semibold mt-1">Cumulative protocol commissions</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border-theme glass-panel">
          <div className="flex justify-between items-center text-sub text-xs mb-2">
            <span>Today's Earnings</span>
            <div className="p-2 rounded-xl bg-accent-orange/10 text-accent-orange">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-prime">
            ${summary.todaysEarnings.toFixed(2)} <span className="text-xs text-sub font-medium">USDT</span>
          </div>
          <p className="text-[11px] text-sub font-medium mt-1">Credited in current business day</p>
        </div>
      </div>

      {/* Main Ledger Section based on UI State */}
      {uiState === 'loading' && <LoadingSkeletonTable />}

      {uiState === 'error' && (
        <ErrorStateAlert 
          title="Failed to Load Ledger Transactions" 
          message="Could not communicate with the wallet ledger backend API. Please check your network connection and try again."
          onRetry={fetchTransactions}
        />
      )}

      {(uiState === 'loaded' || uiState === 'success') && (
        <div className="p-6 rounded-2xl bg-surface border border-border-theme">
          
          {/* Controls: Search, Filter, Export */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search Tx Hash or Description..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs text-prime focus:outline-none focus:border-accent-red transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center space-x-3 w-full sm:w-auto justify-end">
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 pr-8 rounded-xl bg-surface-elevated border border-border-theme text-xs font-semibold text-prime appearance-none focus:outline-none focus:border-accent-red cursor-pointer"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="PLAN_JOIN">Plan Join</option>
                  <option value="MATRIX_REWARD">Matrix Reward</option>
                  <option value="REFERRAL_REWARD">Referral Reward</option>
                  <option value="RETOPUP_DEBIT">Re-Topup Debit</option>
                  <option value="UPGRADE_DEBIT">Upgrade Debit</option>
                  <option value="CAPPED_INCOME">Capped Income</option>
                  <option value="HELD_INCOME">Held Income</option>
                  <option value="RELEASED_INCOME">Released Income</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                  <option value="REVERSAL">Reversal</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sub pointer-events-none" size={14} />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 pr-8 rounded-xl bg-surface-elevated border border-border-theme text-xs font-semibold text-prime appearance-none focus:outline-none focus:border-accent-red cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="FAILED">Failed</option>
                  <option value="REVERSED">Reversed</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sub pointer-events-none" size={14} />
              </div>

              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs font-bold text-prime hover:bg-border-theme transition-all flex items-center space-x-1.5 shrink-0"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          {transactions.length === 0 ? (
            <EmptyStateView
              title="No Matching Ledger Records"
              description="No transaction history matches your search query or type filter."
              actionText="Reset Filters"
              onAction={() => { setSearchQuery(''); setTypeFilter('ALL'); setStatusFilter('ALL'); setPage(1); }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-theme text-sub uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">From Address</th>
                      <th className="py-3 px-4">Tx Hash</th>
                      <th className="py-3 px-4 text-right">Amount (USDT)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-theme/50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-prime">
                          <span className="inline-flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              tx.type.includes('REFERRAL') || tx.type === 'DEPOSIT' ? 'bg-emerald-500' :
                              tx.type.includes('UPGRADE') ? 'bg-accent-blue' :
                              tx.type.includes('RETOPUP') ? 'bg-accent-orange' : 'bg-accent-purple'
                            }`}></span>
                            <span>{tx.type.replace(/_/g, ' ')}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-sub">
                          {formatAddress(tx.fromAddress)}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {tx.explorerUrl ? (
                            <a
                              href={tx.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-red hover:underline inline-flex items-center space-x-1"
                            >
                              <span>{formatAddress(tx.txHash)}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-sub">{formatAddress(tx.txHash)}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-500">
                          +${tx.amountUsdt.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center space-x-1 ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                            tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                            'bg-red-500/10 text-red-500 border-red-500/30'
                          }`}>
                            <CheckCircle2 size={12} />
                            <span>{tx.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-sub text-[11px] font-mono">
                          {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-theme text-xs">
                  <div className="text-sub font-mono">
                    Showing Page <span className="text-prime font-bold">{page}</span> of{' '}
                    <span className="text-prime font-bold">{totalPages}</span> ({totalCount} total)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-border-theme text-sub hover:text-prime disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-border-theme text-sub hover:text-prime disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty State View */}
      {uiState === 'empty' && (
        <EmptyStateView
          title="No Transaction History Found"
          description="You have not generated any matrix referral income or deposit logs yet."
          actionText="Refresh Ledger"
          onAction={fetchTransactions}
        />
      )}

      {/* Withdraw Modal - Disabled with "Not available / Coming soon" notice */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-surface border border-border-theme p-6 shadow-2xl relative"
            >
              <h3 className="text-xl font-extrabold text-prime mb-1">Withdraw USDT Earnings</h3>
              <p className="text-xs text-sub mb-4">Direct instant transfer to connected BSC wallet via smart contract payout queue.</p>

              <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start space-x-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">Withdrawal Not Available Yet</span>
                  <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
                    Automated smart contract withdrawals are currently locked during mainnet audit. Direct payout disbursements will be enabled in the upcoming network release.
                  </p>
                </div>
              </div>

              <div className="space-y-4 opacity-50 pointer-events-none">
                <div>
                  <label className="block text-xs font-mono uppercase text-sub font-bold mb-1">Destination Address</label>
                  <input
                    type="text"
                    readOnly
                    value={address || 'Not Connected'}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme font-mono text-xs text-sub cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-sub font-bold mb-1">Withdrawal Amount (USDT)</label>
                  <input
                    type="number"
                    disabled
                    value={summary.availableBalance.toString()}
                    className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-surface-elevated border border-border-theme text-base font-bold text-prime cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-full py-2.5 rounded-full border border-border-theme text-xs font-bold text-sub hover:text-prime transition-all"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
