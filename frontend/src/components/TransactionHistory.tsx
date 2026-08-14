import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, Search, Filter, ExternalLink, 
  RefreshCw, Download, CheckCircle2, AlertTriangle, AlertCircle, Clock
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { transactionApi } from '../services/api';
import { LoadingSkeletonTable, EmptyStateView, ErrorStateAlert } from './StateComponents';

interface TransactionItem {
  id: string;
  txHash: string;
  blockchainTransactionHash?: string;
  type: string;
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

export default function TransactionHistory() {
  const { isConnected } = useWeb3Store();
  const [uiState, setUiState] = useState<'loaded' | 'loading' | 'empty' | 'error'>('loading');
  
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!isConnected) return;
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
          type: tx.type || tx.transactionType || 'UNKNOWN',
          amountUsdt: tx.amountUsdt ?? tx.amount ?? 0,
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
      console.error('Failed to fetch blockchain transactions:', err);
      setUiState('error');
    }
  }, [page, typeFilter, statusFilter, searchQuery, isConnected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

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
      link.setAttribute('download', `blockchain-tx-export-${new Date().toISOString().split('T')[0]}.csv`);
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

  const getTransactionDirection = (type: string) => {
    const debits = ['PLAN_JOIN', 'UPGRADE', 'RETOPUP', 'WITHDRAWAL'];
    if (debits.includes(type)) return 'DEBIT';
    return 'CREDIT';
  };

  if (!isConnected) {
    return (
      <EmptyStateView
        title="Connect Wallet"
        description="Please connect your Web3 wallet to view your real-time transaction history."
        actionText="Not Available"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Filters & Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search Tx Hash..."
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
              <option value="ALL">All Types</option>
              <option value="PLAN_JOIN">Plan Join</option>
              <option value="UPGRADE">Upgrade</option>
              <option value="RETOPUP">Re-Topup</option>
              <option value="MATRIX_REWARD">Matrix Reward</option>
              <option value="REFERRAL_REWARD">Referral Reward</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
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
              <option value="FAILED">Failed</option>
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sub pointer-events-none" size={14} />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-theme text-xs font-bold text-prime hover:bg-border-theme transition-all flex items-center space-x-1.5 shrink-0"
          >
            {isExporting ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {uiState === 'loading' && <LoadingSkeletonTable />}

      {uiState === 'error' && (
        <ErrorStateAlert 
          title="Failed to Load Transactions" 
          message="Could not communicate with the blockchain indexer. Please check your network connection and try again."
          onRetry={fetchTransactions}
        />
      )}

      {uiState === 'empty' && (
        <EmptyStateView
          title="No Blockchain Transactions"
          description="No transaction history matches your search query or filter criteria."
          actionText="Reset Filters"
          onAction={() => { setSearchQuery(''); setTypeFilter('ALL'); setStatusFilter('ALL'); setPage(1); }}
        />
      )}

      {uiState === 'loaded' && (
        <div className="overflow-x-auto rounded-xl border border-border-theme">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-elevated border-b border-border-theme text-sub uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Hash / Details</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Amount (USDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme/50 bg-surface">
              {transactions.map((tx) => {
                const isDebit = getTransactionDirection(tx.type) === 'DEBIT';
                
                return (
                  <tr key={tx.id} className="hover:bg-surface-elevated/50 transition-colors">
                    
                    {/* Action Column */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isDebit 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {isDebit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <div>
                          <div className="font-extrabold text-prime">
                            {tx.type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[10px] text-sub flex items-center space-x-1 mt-0.5">
                            <Clock size={10} />
                            <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hash & Details Column */}
                    <td className="py-4 px-4 font-mono">
                      {tx.explorerUrl ? (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-red hover:underline flex items-center space-x-1.5"
                        >
                          <span className="font-bold">{formatAddress(tx.txHash)}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-sub font-bold">{formatAddress(tx.txHash)}</span>
                      )}
                      {tx.description && (
                        <div className="text-[10px] text-sub mt-1 max-w-[200px] truncate font-sans">
                          {tx.description}
                        </div>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center space-x-1 ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                        'bg-red-500/10 text-red-500 border-red-500/30'
                      }`}>
                        {tx.status === 'COMPLETED' && <CheckCircle2 size={10} />}
                        {tx.status === 'PENDING' && <RefreshCw size={10} className="animate-spin" />}
                        {tx.status === 'FAILED' && <AlertTriangle size={10} />}
                        <span>{tx.status}</span>
                      </span>
                    </td>

                    {/* Amount Column */}
                    <td className="py-4 px-4 text-right">
                      <div className={`font-mono font-black text-sm ${
                        isDebit ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                        {isDebit ? '-' : '+'}${tx.amountUsdt.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-sub font-mono uppercase mt-0.5">USDT</div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border-theme mt-4">
          <div className="text-xs text-sub">
            Showing <span className="font-bold text-prime">{(page - 1) * 10 + 1}</span> to <span className="font-bold text-prime">{Math.min(page * 10, totalCount)}</span> of <span className="font-bold text-prime">{totalCount}</span> Transactions
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold font-mono">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border-theme disabled:opacity-50 hover:bg-surface-elevated transition-colors"
            >
              PREV
            </button>
            <span className="text-prime px-2">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border-theme disabled:opacity-50 hover:bg-surface-elevated transition-colors"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
