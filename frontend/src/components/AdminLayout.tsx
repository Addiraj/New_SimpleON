import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, Settings, FileText, Code2, LogOut } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

import AdminDashboard from './AdminDashboard';
import DesignSystemShowcase from './DesignSystemShowcase';
import ContractDocs from './ContractDocs';
import ApiDocs from './ApiDocs';

export default function AdminLayout() {
  const { isAdminLoggedIn, setAdminLoggedIn } = useWeb3Store();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'ui' | 'contracts' | 'api'>('dashboard');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envUser = import.meta.env.VITE_ADMIN_USERNAME;
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;

    if (username === envUser && password === envPass) {
      setAdminLoggedIn(true);
      setError('');
    } else {
      setError('Invalid admin credentials');
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
          className="w-full max-w-md bg-surface border border-border-theme rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="h-16 w-16 bg-surface-elevated border border-border-theme rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Shield className="text-accent-red h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-prime">Admin Portal</h2>
            <p className="text-sm text-sub mt-1 text-center">Restricted access. Please authenticate.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-sub mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-page border border-border-theme rounded-xl px-4 py-3 text-prime focus:outline-none focus:border-accent-red transition-colors"
                placeholder="Admin username"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-sub mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-page border border-border-theme rounded-xl px-4 py-3 text-prime focus:outline-none focus:border-accent-red transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500 text-sm text-center font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-accent-red hover:bg-red-600 text-white font-bold rounded-xl px-4 py-3 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-red-500/20"
            >
              <Lock size={18} />
              <span>Authenticate</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.location.reload();
              }}
              className="w-full mt-2 text-sub hover:text-prime text-sm font-semibold transition-colors"
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
      case 'dashboard': return <AdminDashboard />;
      case 'ui': return <DesignSystemShowcase />;
      case 'contracts': return <ContractDocs />;
      case 'api': return <ApiDocs />;
      default: return <AdminDashboard />;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Settings size={16} /> },
    { id: 'ui', label: 'UI Spec', icon: <Code2 size={16} /> },
    { id: 'contracts', label: 'Contracts', icon: <FileText size={16} /> },
    { id: 'api', label: 'API', icon: <Shield size={16} /> },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-page">
      {/* Admin Sidebar */}
      <div className="lg:w-64 bg-surface border-r border-border-theme flex flex-col shrink-0">
        <div className="p-6 border-b border-border-theme flex items-center space-x-3">
          <Shield className="text-accent-red h-8 w-8" />
          <div>
            <h2 className="font-black text-prime">Admin Portal</h2>
            <p className="text-xs text-sub">System Management</p>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeAdminTab === tab.id
                  ? 'bg-accent-red text-white shadow-lg shadow-red-500/20 font-bold'
                  : 'text-sub hover:bg-surface-elevated hover:text-prime font-semibold'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border-theme space-y-2">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-prime hover:bg-surface-elevated rounded-xl transition-colors font-bold"
          >
            <span>Back to App</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-bold"
          >
            <LogOut size={16} />
            <span>Secure Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 overflow-x-hidden p-4 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAdminTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
