import React, { useState } from 'react';
import { Sun, Moon, Menu, X, ArrowRight, Calculator, Wallet, Network, Code, Terminal, Zap, Bell, User, ShieldCheck } from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ theme, toggleTheme, activeTab, setActiveTab }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    isConnected, address, chainId, openWalletModal, disconnectWallet, 
    toggleNotificationCenter, unreadNotificationCount 
  } = useWeb3Store();

  const formattedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'plans', label: 'Plans' },
    { id: 'matrix', label: 'X5 Matrix' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'referrals', label: 'Team' },
    { id: 'capping', label: 'Capping' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'profile', label: 'Profile' },
    { id: 'admin', label: 'Admin' },
    { id: 'design-system', label: 'UI Spec' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'apiDocs', label: 'API' },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header id="app-header" className="sticky top-0 z-50 w-full border-b border-border-theme bg-surface/85 backdrop-blur-md transition-colors duration-300">
      <div id="nav-container" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand Name */}
        <div 
          id="brand-logo-group" 
          className="flex cursor-pointer items-center space-x-3" 
          onClick={() => handleNavClick('home')}
        >
          <div id="logo-hexagon" className="relative flex h-10 w-10 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-accent-red fill-current drop-shadow-[0_2px_8px_rgba(220,38,38,0.3)]">
              <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" />
            </svg>
            <span id="logo-s" className="relative z-10 text-xl font-black text-white select-none italic tracking-wider">S</span>
          </div>
          <div id="brand-text" className="flex flex-col">
            <span id="brand-name" className="text-xl font-extrabold tracking-tight text-prime">
              Simple<span className="text-accent-red">On</span>
            </span>
            <span id="brand-tag" className="text-[9px] uppercase tracking-widest text-sub font-bold -mt-1">
              Web3 Booster
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav id="desktop-nav" className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-2 text-xs font-bold transition-colors duration-200 rounded-lg ${
                  isActive 
                    ? 'text-accent-red bg-accent-red/5' 
                    : 'text-sub hover:text-prime hover:bg-surface-elevated'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Header Action Buttons */}
        <div id="header-actions" className="hidden md:flex items-center space-x-3">
          {/* Notification Center Trigger */}
          <button
            id="notification-center-btn"
            onClick={toggleNotificationCenter}
            className="relative rounded-xl border border-border-theme p-2 text-prime bg-surface hover:bg-surface-elevated transition-colors duration-200"
            aria-label="Notification Center"
          >
            <Bell size={18} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-[9px] font-black text-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="rounded-xl border border-border-theme p-2 text-prime bg-surface hover:bg-surface-elevated transition-colors duration-200"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Web3 Wallet Connection Button */}
          <appkit-button />
        </div>

        {/* Mobile Controls */}
        <div id="mobile-controls" className="flex items-center space-x-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-border-theme p-2 text-prime bg-surface"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-border-theme p-2 text-prime bg-surface"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="border-b border-border-theme bg-surface px-4 py-4 lg:hidden space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold rounded-xl ${
                activeTab === item.id ? 'bg-accent-red/10 text-accent-red' : 'text-sub hover:bg-surface-elevated'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
          <div className="pt-2 border-t border-border-theme flex justify-center">
            <appkit-button />
          </div>
        </div>
      )}
    </header>
  );
}
