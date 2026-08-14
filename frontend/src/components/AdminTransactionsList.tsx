import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { DollarSign, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';

export default function AdminTransactionsList({ setActiveAdminTab }: { setActiveAdminTab: (tab: any) => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const limit = 15;

  const fetchTransactions = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const res = await adminApi.getTransactions({ page: currentPage, limit });
      if (res.success) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.pagination.totalPages);
        setTotalTransactions(res.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveAdminTab('dashboard')} className="text-sub hover:text-prime transition-colors font-mono text-sm">
              &larr; Back to Dashboard
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-prime flex items-center space-x-3 mt-4">
            <DollarSign className="text-emerald-500" size={28} />
            <span>All Global Transactions</span>
          </h1>
          <p className="text-sm text-sub">Total {totalTransactions} transactions recorded</p>
        </div>
      </div>

      <div className="rounded-3xl bg-surface border border-border-theme shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-20">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px] bg-surface-elevated/30">
                  <th className="py-4 px-6">Tx Hash / ID</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">From User</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-prime max-w-[120px] truncate" title={tx.blockchain_transaction_hash || tx.id}>
                      {tx.blockchain_transaction_hash || tx.id}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 rounded bg-accent-blue/10 text-accent-blue font-bold text-[10px]">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-500">
                      +${parseFloat(tx.amount).toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-4 px-6 text-sub truncate max-w-[120px]">{tx.user?.wallet_address || 'System'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-sub">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sub">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-surface border border-border-theme disabled:opacity-50 hover:bg-surface-elevated transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-mono text-sub">Page {page} of {totalPages}</span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-surface border border-border-theme disabled:opacity-50 hover:bg-surface-elevated transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

    </div>
  );
}
