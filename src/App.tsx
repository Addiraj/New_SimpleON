import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Plans from './components/Plans';
import Simulator from './components/Simulator';
import Footer from './components/Footer';

import WalletModal from './components/WalletModal';
import WalletPage from './components/WalletPage';
import Dashboard from './components/Dashboard';
import ReferralDashboard from './components/ReferralDashboard';
import X5MatrixUI from './components/X5MatrixUI';
import MatrixVisualizer from './components/MatrixVisualizer';
import DailyCappingDashboard from './components/DailyCappingDashboard';
import ProfileSettings from './components/ProfileSettings';
import AdminDashboard from './components/AdminDashboard';
import DesignSystemShowcase from './components/DesignSystemShowcase';
import NotificationCenter from './components/NotificationCenter';
import MobileBottomNav from './components/MobileBottomNav';
import ContractDocs from './components/ContractDocs';
import ApiDocs from './components/ApiDocs';
import ArchitectureDocs from './components/ArchitectureDocs';
import LedgerTransactions from './components/LedgerTransactions';
import { useWeb3Store } from './store/useWeb3Store';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('home');
  const { basePlan, setBasePlan, activeView, setActiveView, fetchCalculations, initAuth } = useWeb3Store();

  // Sync store activeView with local activeTab
  const currentTab = activeView !== 'landing' ? activeView : activeTab;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setActiveView('landing');
    } else {
      setActiveView(tab as any);
    }
  };

  useEffect(() => {
    initAuth();
    fetchCalculations(1.0);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
      case 'landing':
        return (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            id="tab-content-home"
          >
            <LandingPage onNavigateTab={handleTabChange} />
          </motion.div>
        );
      case 'wallet':
        return (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            id="tab-content-wallet"
          >
            <WalletPage />
          </motion.div>
        );
      case 'plans':
        return (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            id="tab-content-plans"
          >
            <Plans basePlan={basePlan} />
          </motion.div>
        );
      case 'calculator':
        return (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            id="tab-content-calculator"
          >
            <Simulator basePlan={basePlan} setBasePlan={setBasePlan} />
          </motion.div>
        );
      case 'dashboard':
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Dashboard />
          </motion.div>
        );
      case 'referrals':
        return (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            id="tab-content-referrals"
          >
            <ReferralDashboard />
          </motion.div>
        );
      case 'matrix':
        return (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <X5MatrixUI />
          </motion.div>
        );
      case 'capping':
        return (
          <motion.div
            key="capping"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <DailyCappingDashboard />
          </motion.div>
        );
      case 'profile':
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ProfileSettings />
          </motion.div>
        );
      case 'admin':
        return (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <AdminDashboard />
          </motion.div>
        );
      case 'design-system':
        return (
          <motion.div
            key="design-system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <DesignSystemShowcase />
          </motion.div>
        );
      case 'ledger':
        return (
          <motion.div
            key="ledger"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <LedgerTransactions />
          </motion.div>
        );
      case 'contracts':
        return (
          <motion.div
            key="contracts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ContractDocs />
          </motion.div>
        );
      case 'apiDocs':
        return (
          <motion.div
            key="apiDocs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ApiDocs />
          </motion.div>
        );
      case 'architecture':
        return (
          <motion.div
            key="architecture"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ArchitectureDocs />
          </motion.div>
        );
      default:
        return <LandingPage onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div 
      id="app-root-wrapper"
      className="bg-page text-prime min-h-screen font-sans flex flex-col transition-colors duration-300 overflow-x-hidden pb-16 md:pb-0"
    >
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        activeTab={currentTab} 
        setActiveTab={handleTabChange} 
      />

      <main id="app-main-content" className="flex-grow">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      <Footer setActiveTab={handleTabChange} />
      <WalletModal />
      <NotificationCenter />
      <MobileBottomNav />
    </div>
  );
}
