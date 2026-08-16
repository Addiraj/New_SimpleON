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
    <div className="py-10 space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveAdminTab('dashboard')} className="text-sub hover:text-prime transition-colors font-mono text-[13px] font-bold flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-surface">
              &larr; Back to Dashboard
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-prime flex items-center gap-3 mt-4">
            <div className="p-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20">
              <Users className="text-accent-blue" size={24} />
            </div>
            <span>All Registered Users</span>
          </h1>
          <p className="text-[13px] text-sub pt-1 font-bold">Total {totalUsers} users found</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-20">
            <RefreshCw className="animate-spin text-accent-blue" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left font-mono text-[13px] border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border-subtle text-sub uppercase text-[10px] bg-surface-sunken/50 tracking-wider">
                  <th className="py-4 px-6 font-bold">User Address</th>
                  <th className="py-4 px-6 font-bold">Role</th>
                  <th className="py-4 px-6 font-bold">Joined Date</th>
                  <th className="py-4 px-6 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="py-4 px-6 font-bold text-prime">
                      <span className="bg-surface-sunken px-2 py-1 rounded border border-border-subtle">
                        {u.wallet_address}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-accent-blue">{u.role}</td>
                    <td className="py-4 px-6 text-muted">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${u.status === 'ACTIVE' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted text-[13px]">No users found.</td>
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
