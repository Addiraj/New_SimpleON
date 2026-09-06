import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Menu, X, Bell, ChevronDown } from 'lucide-react';
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
    isConnected, toggleNotificationCenter, unreadNotificationCount, userProfile
  } = useWeb3Store();

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
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close mobile menu on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-50 w-full border-b border-border-theme bg-surface/90 backdrop-blur-xl transition-colors duration-200"
    >
      <div
        id="nav-container"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <div
          id="brand-logo-group"
          className="flex shrink-0 cursor-pointer items-center gap-2.5"
          onClick={() => handleNavClick('home')}
          role="button"
          tabIndex={0}
          aria-label="SimpleOn Home"
          onKeyDown={(e) => e.key === 'Enter' && handleNavClick('home')}
        >
          <div id="logo-hexagon" className="relative flex h-8 w-8 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-accent-red fill-current" aria-hidden="true">
              <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" />
            </svg>
            <span className="relative z-10 text-sm font-black text-white select-none italic">S</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight text-prime flex items-center gap-1.5">
              Simple<span className="text-accent-red">On</span>
              {userProfile?.status === 'ACTIVE' && (
                <span className="badge badge-brand text-[9px] py-0.5 hidden sm:inline-flex">
                  {userProfile.tier || 'Launch'}
                </span>
              )}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-muted font-bold">
              Web3 Booster
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav id="desktop-nav" className="hidden xl:flex items-center gap-0.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-accent-red bg-accent-red-muted'
                    : 'text-sub hover:text-prime hover:bg-surface-elevated'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-[9px] h-[2px] rounded-full bg-accent-red"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Notification */}
          <button
            id="notification-center-btn"
            onClick={toggleNotificationCenter}
            className="relative rounded-lg p-2 text-sub hover:text-prime hover:bg-surface-elevated border border-transparent hover:border-border-theme transition-all duration-200"
            aria-label={`Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
          >
            <Bell size={16} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red text-[9px] font-bold text-white px-1">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-sub hover:text-prime hover:bg-surface-elevated border border-transparent hover:border-border-theme transition-all duration-200 hidden sm:flex"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Wallet Button */}
          <div className="hidden md:block">
            <appkit-button />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden rounded-lg p-2 text-sub hover:text-prime hover:bg-surface-elevated border border-transparent hover:border-border-theme transition-all duration-200"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <motion.nav
              id="mobile-nav-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 right-0 top-14 z-50 bg-surface border-b border-border-theme xl:hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto shadow-xl"
              aria-label="Mobile navigation"
            >
              <div className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex w-full items-center px-4 py-3 text-[13px] font-semibold rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-accent-red-muted text-accent-red'
                          : 'text-sub hover:bg-surface-elevated hover:text-prime'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile wallet + theme */}
              <div className="p-4 border-t border-border-theme flex items-center justify-between gap-3">
                <appkit-button />
                <button
                  onClick={toggleTheme}
                  className="rounded-lg p-2.5 text-sub hover:text-prime hover:bg-surface-elevated border border-border-theme transition-all sm:hidden"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
