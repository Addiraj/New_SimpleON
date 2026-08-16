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
    <div className="py-10 space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveAdminTab('dashboard')} className="text-sub hover:text-prime transition-colors font-mono text-[13px] font-bold flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-surface">
              &larr; Back to Dashboard
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-prime flex items-center gap-3 mt-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="text-emerald-500" size={24} />
            </div>
            <span>All Global Transactions</span>
          </h1>
          <p className="text-[13px] text-sub pt-1 font-bold">Total {totalTransactions} transactions recorded</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-20">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left font-mono text-[13px] border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border-subtle text-sub uppercase text-[10px] bg-surface-sunken/50 tracking-wider">
                  <th className="py-4 px-6 font-bold">Tx Hash / ID</th>
                  <th className="py-4 px-6 font-bold">Type</th>
                  <th className="py-4 px-6 font-bold">Amount</th>
                  <th className="py-4 px-6 font-bold">From User</th>
                  <th className="py-4 px-6 font-bold">Status</th>
                  <th className="py-4 px-6 font-bold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="py-4 px-6 font-bold text-prime max-w-[150px] truncate" title={tx.blockchain_transaction_hash || tx.id}>
                      <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle">
                        {tx.blockchain_transaction_hash || tx.id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-lg border border-accent-blue/20 bg-accent-blue/10 text-accent-blue font-bold text-[10px] uppercase tracking-wider">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-black text-emerald-500">
                      +${parseFloat(tx.amount).toFixed(2)} <span className="text-[10px] text-emerald-500/70">{tx.currency}</span>
                    </td>
                    <td className="py-4 px-6 text-muted truncate max-w-[150px]">
                      {tx.user?.wallet_address ? (
                        <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle text-[11px] font-bold">
                          {tx.user.wallet_address}
                        </span>
                      ) : (
                        <span className="text-prime font-bold text-[11px] uppercase tracking-wider bg-surface-sunken px-2 py-1 rounded border border-border-subtle">System</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                        tx.status === 'COMPLETED' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-color-negative/10 text-color-negative border border-color-negative/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-muted">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted text-[13px]">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-surface-sunken border border-border-subtle disabled:opacity-50 hover:bg-surface transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[13px] font-mono text-sub font-bold">Page {page} of {totalPages}</span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-surface-sunken border border-border-subtle disabled:opacity-50 hover:bg-surface transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

    </div>
  );
}
