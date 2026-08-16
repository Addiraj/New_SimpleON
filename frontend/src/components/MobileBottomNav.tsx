import React from 'react';
import { 
  LayoutDashboard, Network, Rocket, Users, Wallet, Zap 
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';

export default function MobileBottomNav() {
  const { activeView, setActiveView } = useWeb3Store();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'matrix', label: 'Matrix', icon: Network },
    { id: 'plans', label: 'Plans', icon: Rocket },
    { id: 'referrals', label: 'Team', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'capping', label: 'Capping', icon: Zap },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border-theme px-1 py-1.5 flex items-center justify-around"
      aria-label="Mobile quick navigation"
    >
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id as any);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[48px] ${
              isActive
                ? 'text-accent-red'
                : 'text-muted hover:text-sub'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[9px] ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent-red" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
