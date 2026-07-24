import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, Trophy, Users, Wallet, Zap, ShieldAlert, X, CheckCheck, Loader2
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { notificationApi } from '../services/api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  amount?: string;
}

export default function NotificationCenter() {
  const { isNotificationCenterOpen, toggleNotificationCenter, fetchUnreadCount } = useWeb3Store();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ page: 1, limit: 30 });
      const rawList = res.data?.notifications || res.notifications || [];
      
      const formatted: NotificationItem[] = rawList.map((item: any) => {
        let displayTime = 'Just now';
        if (item.createdAt) {
          const dt = new Date(item.createdAt);
          displayTime = dt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }

        return {
          id: item.id,
          type: item.type || 'SYSTEM',
          title: item.title,
          message: item.message,
          time: displayTime,
          isUnread: !item.isRead,
          amount: item.data?.amount ? `${item.data.amount} USDT` : undefined,
        };
      });

      setNotifications(formatted);
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNotificationCenterOpen) {
      loadNotifications();
    }
  }, [isNotificationCenterOpen]);

  const markSingleRead = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isUnread: false } : n))
      );
      await notificationApi.markAsRead(id);
      fetchUnreadCount();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const markAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
      await notificationApi.markAllAsRead();
      fetchUnreadCount();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATRIX_REWARD':
      case 'REFERRAL_REWARD':
      case 'REWARD':
        return <Trophy size={16} className="text-emerald-500" />;
      case 'LEVEL_UPGRADED':
      case 'BOOSTER_UPGRADED':
      case 'PLAN_ACTIVATED':
      case 'UPGRADE':
        return <Zap size={16} className="text-amber-500" />;
      case 'MATRIX_POSITION_FILLED':
      case 'MATRIX_CYCLE_COMPLETED':
      case 'REFERRAL':
        return <Users size={16} className="text-accent-blue" />;
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_FAILED':
      case 'LOGIN_SUCCESS':
      case 'WALLET':
        return <Wallet size={16} className="text-accent-purple" />;
      case 'SYSTEM':
      default:
        return <ShieldAlert size={16} className="text-accent-red" />;
    }
  };

  if (!isNotificationCenterOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-surface border-l border-border-theme h-full flex flex-col shadow-2xl"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border-theme flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell size={18} className="text-accent-red" />
            <h2 className="text-base font-black text-prime">Notification Center</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={markAllRead}
              className="p-1.5 rounded-xl hover:bg-surface-elevated text-sub hover:text-prime text-xs font-bold flex items-center space-x-1"
              title="Mark All Read"
            >
              <CheckCheck size={16} />
            </button>

            <button
              onClick={toggleNotificationCenter}
              className="p-1.5 rounded-xl hover:bg-surface-elevated text-sub hover:text-prime"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-sub">
              <Loader2 size={24} className="animate-spin mb-2 text-accent-red" />
              <span className="text-xs font-mono">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="p-4 rounded-2xl bg-surface-elevated border border-border-theme text-sub">
                <Bell size={28} />
              </div>
              <h3 className="text-sm font-bold text-prime">No Notifications</h3>
              <p className="text-xs text-sub max-w-xs">You're all caught up! New account alerts and reward activity will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.isUnread && markSingleRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  n.isUnread ? 'bg-surface-elevated border-accent-red/30 shadow-sm' : 'bg-surface/50 border-border-theme opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-surface border border-border-theme shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-extrabold text-prime flex items-center space-x-1">
                        <span>{n.title}</span>
                        {n.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />}
                      </h3>
                      <p className="text-[11px] text-sub leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-sub font-mono block pt-1">{n.time}</span>
                    </div>
                  </div>

                  {n.amount && (
                    <span className={`text-xs font-mono font-bold shrink-0 ${n.amount.startsWith('+') ? 'text-emerald-500' : 'text-accent-red'}`}>
                      {n.amount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-theme bg-surface-elevated/40 text-center">
          <p className="text-[11px] text-sub font-mono">Real-time Web3 Events Subscribed via Backend</p>
        </div>
      </motion.div>
    </div>
  );
}
