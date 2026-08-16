import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, Settings, FileText, Code2, LogOut, Users, DollarSign } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { authApi } from '../services/api';

import AdminDashboard from './AdminDashboard';
import DesignSystemShowcase from './DesignSystemShowcase';
import ContractDocs from './ContractDocs';
import ApiDocs from './ApiDocs';
import AdminUsersList from './AdminUsersList';
import AdminTransactionsList from './AdminTransactionsList';

export default function AdminLayout() {
  const { isAdminLoggedIn, setAdminLoggedIn } = useWeb3Store();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'ui' | 'contracts' | 'api' | 'users' | 'transactions'>('dashboard');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.adminLogin(username, password);
      if (res && res.success) {
        setAdminLoggedIn(true);
        setError('');
      } else {
        setError('Invalid admin credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    setAdminLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md card p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="h-16 w-16 bg-surface-sunken border border-border-subtle rounded-2xl flex items-center justify-center mb-5 shadow-inner">
              <Shield className="text-accent-red h-8 w-8" />
            </div>
            <h2 className="text-[22px] font-black text-prime">Admin Portal</h2>
            <p className="text-[13px] text-sub mt-2 text-center">Restricted access. Please authenticate.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div>
              <label className="block text-[11px] font-bold text-sub uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-sunken border border-border-subtle rounded-xl px-4 py-3.5 text-prime focus:outline-none focus:border-accent-red transition-colors text-[14px]"
                placeholder="Admin username"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-sub uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-sunken border border-border-subtle rounded-xl px-4 py-3.5 text-prime focus:outline-none focus:border-accent-red transition-colors text-[14px]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-color-negative/10 border border-color-negative/20 rounded-xl p-3.5 text-color-negative text-[13px] text-center font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-primary py-3.5"
            >
              <Lock size={16} />
              <span>Authenticate</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.location.reload();
              }}
              className="w-full mt-3 text-sub hover:text-prime text-[13px] font-bold transition-colors py-2"
            >
              Back to App
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeAdminTab) {
      case 'dashboard': return <AdminDashboard setActiveAdminTab={setActiveAdminTab} />;
      case 'users': return <AdminUsersList setActiveAdminTab={setActiveAdminTab} />;
      case 'transactions': return <AdminTransactionsList setActiveAdminTab={setActiveAdminTab} />;
      case 'ui': return <DesignSystemShowcase />;
      case 'contracts': return <ContractDocs />;
      case 'api': return <ApiDocs />;
      default: return <AdminDashboard setActiveAdminTab={setActiveAdminTab} />;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Settings size={16} /> },
    { id: 'users', label: 'Users', icon: <Users size={16} /> },
    { id: 'transactions', label: 'Transactions', icon: <DollarSign size={16} /> },
    { id: 'ui', label: 'UI Spec', icon: <Code2 size={16} /> },
    { id: 'contracts', label: 'Contracts', icon: <FileText size={16} /> },
    { id: 'api', label: 'API', icon: <Shield size={16} /> },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-page">
      {/* Admin Sidebar */}
      <div className="lg:w-72 bg-surface border-r border-border-subtle flex flex-col shrink-0 relative z-20 shadow-sm">
        <div className="p-6 border-b border-border-subtle flex items-center gap-4 bg-surface-sunken/50">
          <div className="h-12 w-12 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
            <Shield className="text-accent-red h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-prime">Admin Portal</h2>
            <p className="text-[11px] font-bold text-sub uppercase tracking-wider mt-0.5">System Management</p>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-[13px] ${
                activeAdminTab === tab.id
                  ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20 font-extrabold translate-x-1'
                  : 'text-sub hover:bg-surface-sunken hover:text-prime font-bold hover:translate-x-1'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border-subtle space-y-2 bg-surface-sunken/50">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-prime hover:bg-surface rounded-xl transition-colors text-[13px] font-bold border border-transparent hover:border-border-subtle"
          >
            <span>Back to App</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-color-negative hover:bg-color-negative/10 rounded-xl transition-colors text-[13px] font-bold border border-transparent hover:border-color-negative/20"
          >
            <LogOut size={16} />
            <span>Secure Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 overflow-x-hidden p-4 lg:p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAdminTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
