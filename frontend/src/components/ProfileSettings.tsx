import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, ShieldCheck, Wallet, Bell, Globe, Moon, Sun, Key, 
  Check, Copy, CheckCircle2, Lock, Smartphone, RefreshCw, FileText, AlertCircle, Save, Loader2 
} from 'lucide-react';
import { useWeb3Store } from '../store/useWeb3Store';
import { userApi } from '../services/api';
import { buildReferralUrl } from '../utils/referral';

export default function ProfileSettings() {
  const { address, walletType, isConnected, isAuthenticated, openWalletModal, signSiweAndLogin } = useWeb3Store();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'WALLET' | 'SECURITY' | 'NOTIFICATIONS' | 'ACTIVITY'>('PROFILE');
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Profile data from backend
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);

  // Form inputs
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [telegramNotifs, setTelegramNotifs] = useState(true);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const userAddress = address || profile?.walletAddress || '';
  const profileReferralCode = profile?.referralCode || 'SO-ROOT';
  const profileReferralLink = buildReferralUrl(profileReferralCode);

  // Load profile and preferences on mount / address change
  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const [profRes, prefRes, logsRes] = await Promise.all([
          userApi.getProfile().catch(() => null),
          userApi.getPreferences().catch(() => null),
          userApi.getActivityLogs().catch(() => null),
        ]);

        if (isMounted) {
          if (profRes) {
            const profData = profRes.data || profRes;
            setProfile(profData);
            setDisplayName(profData.displayName || '');
            setEmail(profData.email || '');
          }
          if (prefRes) {
            const prefData = prefRes.data || prefRes;
            setPreferences(prefData);
            setLanguage(prefData.language || 'en');
            setTheme(prefData.theme || 'dark');
            setEmailNotifs(prefData.emailNotifications ?? prefData.email_notifications ?? true);
            setInAppNotifs(prefData.inAppNotifications ?? prefData.in_app_notifications ?? true);
          }
          if (logsRes) {
            const logsData = logsRes.data?.logs || logsRes.logs || logsRes;
            if (Array.isArray(logsData)) {
              setActivityLogs(logsData);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load user profile or preferences:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(userAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAuthenticated) {
      setFeedback({
        type: 'error',
        message: 'Please connect your wallet and sign in to save settings.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // 1. Update profile (displayName, email)
      const updatedProfRes = await userApi.updateProfile({
        displayName,
        email,
      });
      const updatedProf = updatedProfRes.data || updatedProfRes;
      setProfile(updatedProf);

      // 2. Update preferences (language, theme, emailNotifications, inAppNotifications)
      const updatedPrefRes = await userApi.updatePreferences({
        language,
        theme,
        emailNotifications: emailNotifs,
        inAppNotifications: inAppNotifs,
      });
      const updatedPref = updatedPrefRes.data || updatedPrefRes;
      setPreferences(updatedPref);

      setFeedback({
        type: 'success',
        message: 'Profile and preferences saved successfully!',
      });
      
      // Refresh activity logs after saving
      userApi.getActivityLogs().then((res: any) => {
        const logsData = res.data?.logs || res.logs || res;
        if (Array.isArray(logsData)) {
          setActivityLogs(logsData);
        }
      }).catch(console.error);
    } catch (err: any) {
      console.error('Failed to save profile settings:', err);
      const errMsg = err.message || err.response?.data?.error?.message || 'Failed to save settings. Please check your inputs.';
      setFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-surface border border-border-theme p-8 shadow-xl relative overflow-hidden glass-panel">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border-2 border-accent-red/30 flex items-center justify-center text-accent-red font-black text-2xl font-mono shadow-md">
              0x
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-black text-prime font-mono">
                  {profile?.shortWalletAddress || `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px] border border-emerald-500/20 flex items-center space-x-1">
                  <ShieldCheck size={12} />
                  <span>Verified Web3 Partner</span>
                </span>
              </div>
              <p className="text-xs text-sub mt-1">
                Joined SimpleOn Matrix: <strong className="text-prime">{profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'Jan 15, 2026'}</strong> • Chain: <strong className="text-prime">BNB Smart Chain (97)</strong>
              </p>
            </div>
          </div>

          <button
            onClick={copyAddress}
            className="px-5 py-2.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-border-theme text-prime text-xs font-bold transition-all flex items-center space-x-2"
          >
            {copiedAddress ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copiedAddress ? 'Address Copied!' : 'Copy Wallet Address'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-border-theme">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'PROFILE' ? 'bg-accent-red text-white shadow-md' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          <User size={14} />
          <span>Profile Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('WALLET')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'WALLET' ? 'bg-accent-red text-white shadow-md' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          <Wallet size={14} />
          <span>Connected Wallets</span>
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'SECURITY' ? 'bg-accent-red text-white shadow-md' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Security & SIWE</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'NOTIFICATIONS' ? 'bg-accent-red text-white shadow-md' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          <Bell size={14} />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVITY')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'ACTIVITY' ? 'bg-accent-red text-white shadow-md' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          <FileText size={14} />
          <span>Activity Log</span>
        </button>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-accent-red/10 border-accent-red/30 text-accent-red'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-sub hover:text-prime">✕</button>
        </motion.div>
      )}

      {/* TAB CONTENT 1: PROFILE */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Account Identity */}
            <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
              <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">Account Identity</h3>
              
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-sub block text-[10px]">User ID</span>
                  <span className="font-bold text-prime">{profile?.id || '—'}</span>
                </div>

                <div>
                  <span className="text-sub block text-[10px]">Primary Web3 Address (Non-Editable)</span>
                  <span className="font-bold text-prime break-all">{userAddress}</span>
                </div>

                <div>
                  <span className="text-sub block text-[10px]">Referral Code (Non-Editable)</span>
                  <span className="font-bold text-accent-red">{profileReferralCode}</span>
                </div>

                <div>
                  <span className="text-sub block text-[10px]">Referral Link</span>
                  <span className="font-bold text-prime text-[11px] break-all">{profileReferralLink}</span>
                </div>

                <div>
                  <span className="text-sub block text-[10px]">Current Level (Non-Editable)</span>
                  <span className="font-bold text-prime">{profile?.currentLevel || 'Level 1'}</span>
                </div>

                <div>
                  <span className="text-sub block text-[10px]">Account Status</span>
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-500">
                    <CheckCircle2 size={12} />
                    <span>{profile?.accountStatus || profile?.status || 'ACTIVE'}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-border-theme space-y-3">
                  <div>
                    <label className="text-sub block text-[10px] mb-1 font-bold">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      className="w-full p-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime font-bold focus:border-accent-red outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sub block text-[10px] mb-1 font-bold">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@domain.com"
                      className="w-full p-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime font-bold focus:border-accent-red outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="p-6 rounded-3xl bg-surface border border-border-theme shadow-md space-y-4">
              <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">Preferences</h3>
              
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-sub block text-[10px] mb-1 font-bold">Display Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime font-bold focus:border-accent-red outline-none transition-all"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="zh">Mandarin (中文)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sub block text-[10px] mb-1 font-bold">Theme Preference</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime font-bold focus:border-accent-red outline-none transition-all"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                <div>
                  <label className="text-sub block text-[10px] mb-1 font-bold">Network Standard</label>
                  <div className="p-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime font-bold flex justify-between items-center">
                    <span>BNB Smart Chain Testnet (97)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-2xl bg-accent-red hover:bg-accent-red/90 text-white font-black text-xs shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT 2: WALLET */}
      {activeTab === 'WALLET' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
          <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">Connected Web3 Providers</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-prime text-xs">MetaMask Extension</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-sub font-mono">Status: Connected Active</p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2 opacity-60">
              <div className="flex justify-between items-center">
                <span className="font-bold text-prime text-xs">WalletConnect v2</span>
                <span className="w-2.5 h-2.5 rounded-full bg-sub" />
              </div>
              <p className="text-[11px] text-sub font-mono">Status: Standby</p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-elevated border border-border-theme space-y-2 opacity-60">
              <div className="flex justify-between items-center">
                <span className="font-bold text-prime text-xs">Coinbase Wallet</span>
                <span className="w-2.5 h-2.5 rounded-full bg-sub" />
              </div>
              <p className="text-[11px] text-sub font-mono">Status: Disconnected</p>
            </div>
          </div>

          <button
            onClick={openWalletModal}
            className="px-6 py-3 rounded-2xl bg-accent-red text-white text-xs font-black shadow-md hover:bg-accent-red/90 transition-all"
          >
            Switch Active Web3 Provider
          </button>
        </div>
      )}

      {/* TAB CONTENT 3: SECURITY */}
      {activeTab === 'SECURITY' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
          <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">SIWE & Cryptographic Proofs</h3>
          
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono space-y-1">
            <p className="font-bold flex items-center space-x-1">
              <ShieldCheck size={16} />
              <span>EIP-4361 Sign-In With Ethereum Active</span>
            </p>
            <p className="text-sub">Your session is secured via ECDSA cryptographic signatures. Passwords are never stored on centralized servers.</p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NOTIFICATIONS */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
          <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">Notification Channels</h3>
          
          <div className="space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-border-theme">
              <div>
                <span className="font-bold text-prime block">In-App Live Alerts</span>
                <span className="text-sub">Receive instant toast popups when referrals join or matrix completes</span>
              </div>
              <input
                type="checkbox"
                checked={inAppNotifs}
                onChange={(e) => setInAppNotifs(e.target.checked)}
                className="w-4 h-4 accent-accent-red cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-border-theme">
              <div>
                <span className="font-bold text-prime block">Email Notifications</span>
                <span className="text-sub">Receive daily summaries and level upgrade reports</span>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 accent-accent-red cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-border-theme">
              <div>
                <span className="font-bold text-prime block">Telegram Bot Alerts</span>
                <span className="text-sub">Push notifications for wallet distributions</span>
              </div>
              <input
                type="checkbox"
                checked={telegramNotifs}
                onChange={(e) => setTelegramNotifs(e.target.checked)}
                className="w-4 h-4 accent-accent-red cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-2xl bg-accent-red hover:bg-accent-red/90 text-white font-black text-xs shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Notification Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: ACTIVITY LOG */}
      {activeTab === 'ACTIVITY' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-theme shadow-xl space-y-6">
          <h3 className="text-sm font-black text-prime uppercase tracking-wider font-mono">Security & Session Audit Log</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-theme text-sub uppercase text-[10px]">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-prime">{log.action}</td>
                    <td className="py-3.5 px-4 text-sub">{log.ip}</td>
                    <td className="py-3.5 px-4 text-sub">{log.time}</td>
                    <td className="py-3.5 px-4 text-prime font-bold">{log.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
