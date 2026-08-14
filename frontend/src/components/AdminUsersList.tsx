import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Users, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';

export default function AdminUsersList({ setActiveAdminTab }: { setActiveAdminTab: (tab: any) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const limit = 15;

  const fetchUsers = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers({ page: currentPage, limit });
      if (res.success) {
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.totalPages);
        setTotalUsers(res.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
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
            <Users className="text-accent-blue" size={28} />
            <span>All Registered Users</span>
          </h1>
          <p className="text-sm text-sub">Total {totalUsers} users found</p>
        </div>
      </div>

      <div className="rounded-3xl bg-surface border border-border-theme shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-20">
            <RefreshCw className="animate-spin text-accent-blue" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px] bg-surface-elevated/30">
                  <th className="py-4 px-6">User Address</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-prime">{u.wallet_address}</td>
                    <td className="py-4 px-6 font-bold text-accent-blue">{u.role}</td>
                    <td className="py-4 px-6 text-sub">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sub">No users found.</td>
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
