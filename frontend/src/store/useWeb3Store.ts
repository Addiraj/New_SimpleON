import { create } from 'zustand';
import { ethers } from 'ethers';
import { api, authApi, notificationApi } from '../services/api';
import { UserProfile, BoosterCalculationsResponse } from '../types';
import { appKitModal } from '../appkit';
import { readReferralCodeFromSearch, savePendingReferral } from '../utils/referral';

interface Web3State {
  // Wallet Connection
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  isConnecting: boolean;
  walletType: 'metamask' | 'walletconnect' | 'trustwallet' | 'coinbase' | 'injected' | string | null;
  connectionError: string | null;
  hasPromptedSiwe: boolean;

  // Balances
  bnbBalance: string;
  usdtBalance: string;

  // SIWE Web3 Auth
  isAuthenticated: boolean;
  jwtToken: string | null;
  userProfile: UserProfile | null;

  // App UI State
  isWalletModalOpen: boolean;
  basePlan: number;
  calculations: BoosterCalculationsResponse | null;
  activeView: 'landing' | 'dashboard' | 'matrix' | 'plans' | 'wallet' | 'ledger' | 'referrals' | 'capping' | 'profile' | 'admin' | 'contracts' | 'apiDocs';

  // Notification State
  isNotificationCenterOpen: boolean;
  unreadNotificationCount: number;

  // Admin State
  isAdminLoggedIn: boolean;

  // Action Handlers
  initAuth: () => Promise<void>;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  toggleNotificationCenter: () => void;
  setActiveView: (view: 'landing' | 'dashboard' | 'matrix' | 'plans' | 'wallet' | 'ledger' | 'referrals' | 'capping' | 'profile' | 'admin' | 'contracts' | 'apiDocs') => void;
  setAdminLoggedIn: (status: boolean) => void;

  connectWallet: (walletType: 'metamask' | 'walletconnect' | 'trustwallet' | 'coinbase' | 'injected') => Promise<void>;
  signSiweAndLogin: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  setConnectionError: (errorMsg: string | null) => void;
  setHasPromptedSiwe: (status: boolean) => void;
  simulateState: (state: 'loading' | 'success' | 'disconnected' | 'error') => void;

  setBasePlan: (amount: number) => Promise<void>;
  fetchCalculations: (basePlan?: number) => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  upgradeTier: (targetTier: string) => Promise<void>;
  switchChain: (targetChainId: number) => Promise<void>;
  claimDemoCoins: () => Promise<void>;
}

export const useWeb3Store = create<Web3State>((set, get) => ({
  isConnected: false,
  address: null,
  chainId: 97,
  provider: null,
  isConnecting: false,
  walletType: null,
  connectionError: null,
  hasPromptedSiwe: false,

  bnbBalance: '0.00',
  usdtBalance: '0.00',

  isAuthenticated: false,
  jwtToken: localStorage.getItem('simpleon_web3_jwt'),
  userProfile: null,

  isWalletModalOpen: false,
  basePlan: 1.0,
  calculations: null,
  activeView: 'landing',

  isNotificationCenterOpen: false,
  unreadNotificationCount: 0,
  
  isAdminLoggedIn: false,

  openWalletModal: () => {
    appKitModal.open();
  },
  closeWalletModal: () => appKitModal.close(),
  toggleNotificationCenter: () => set((state) => ({ isNotificationCenterOpen: !state.isNotificationCenterOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setAdminLoggedIn: (status) => set({ isAdminLoggedIn: status }),

  fetchUnreadCount: async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      const count = res.data?.unreadCount ?? res.unreadCount ?? 0;
      set({ unreadNotificationCount: count });
    } catch (err) {
      // ignore
    }
  },

  setConnectionError: (errorMsg) => set({ connectionError: errorMsg }),
  setHasPromptedSiwe: (status) => set({ hasPromptedSiwe: status }),

  /**
   * Initialize authentication on store load & detect URL referral code
   */
  initAuth: async () => {
    // Detect URL referral code parameter (e.g. ?ref=SO-A1B2C3D4 or ?ref=0x123...)
    if (typeof window !== 'undefined') {
      const refCode = readReferralCodeFromSearch();
      if (refCode) {
        savePendingReferral(refCode);
      }
    }

    const token = localStorage.getItem('simpleon_web3_jwt');
    const refreshToken = localStorage.getItem('simpleon_web3_refresh_token');

    if (!token && !refreshToken) {
      return;
    }

    try {
      const res = await authApi.getMe();
      const user = res.user || res.data?.user || res;
      const cleanAddress = user.walletAddress || user.address;

      set({
        isAuthenticated: true,
        jwtToken: token,
        userProfile: user,
        address: cleanAddress ? cleanAddress.toLowerCase() : null,
        isConnected: true,
      });

      get().fetchUnreadCount();
    } catch (err) {
      // Try refresh token if access token expired
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refreshToken(refreshToken);
          const { accessToken, refreshToken: newRefreshToken, user } = refreshRes.data || refreshRes;

          if (accessToken) {
            localStorage.setItem('simpleon_web3_jwt', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('simpleon_web3_refresh_token', newRefreshToken);
            }

            const cleanAddress = user?.walletAddress || user?.address;
            set({
              isAuthenticated: true,
              jwtToken: accessToken,
              userProfile: user,
              address: cleanAddress ? cleanAddress.toLowerCase() : null,
              isConnected: true,
            });
            return;
          }
        } catch (refreshErr) {
          // Both access and refresh tokens invalid
          localStorage.removeItem('simpleon_web3_jwt');
          localStorage.removeItem('simpleon_web3_refresh_token');
          set({ isAuthenticated: false, jwtToken: null, userProfile: null, isConnected: false, address: null });
        }
      } else {
        localStorage.removeItem('simpleon_web3_jwt');
        set({ isAuthenticated: false, jwtToken: null, userProfile: null, isConnected: false, address: null });
      }
    }
  },

  simulateState: (state) => {
    if (state === 'loading') {
      set({ isConnecting: true, isConnected: false, connectionError: null });
    } else if (state === 'success') {
      const simAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'.toLowerCase();
      set({
        isConnecting: false,
        isConnected: true,
        address: simAddress,
        chainId: 97,
        walletType: get().walletType || 'metamask',
        connectionError: null,
        isAuthenticated: true,
        bnbBalance: '0.00',
        usdtBalance: '0.00'
      });
      get().fetchCalculations(1.0);
    } else if (state === 'disconnected') {
      get().disconnectWallet();
    } else if (state === 'error') {
      set({
        isConnecting: false,
        isConnected: false,
        connectionError: 'User rejected SIWE authentication signature request (Error Code: 4001). Please try connecting again and approve the EIP-712 prompt in your Web3 wallet.'
      });
    }
  },

  connectWallet: async (walletType) => {
    appKitModal.open();
  },

  signSiweAndLogin: async () => {
    const { address, provider, chainId } = get();
    if (!address) {
      set({ isConnecting: false });
      return;
    }

    try {
      set({ isConnecting: true });

      // 1. Fetch single-use nonce & signing message from backend API
      const nonceRes = await authApi.getNonce(address, chainId || 97);
      const { nonce, message } = nonceRes.data || nonceRes;

      let signature: string;

      if (provider) {
        try {
          const signer = await provider.getSigner();
          signature = await signer.signMessage(message);
        } catch (signErr: any) {
          if (signErr.code === 4001 || signErr.message?.includes('rejected')) {
            set({
              isConnecting: false,
              connectionError: 'Signature request rejected by user. SIWE authentication was cancelled.',
            });
            return;
          }
          throw signErr;
        }
      } else {
        throw new Error('No active Web3 provider to sign SIWE message');
      }

      // 2. Verify signature with backend
      const pendingReferral = readPendingReferral();
      const verifyRes = await authApi.verifySignature({
        address,
        signature,
        message,
        referrerAddress: pendingReferral?.referralCode || undefined,
      });

      const { accessToken, refreshToken, token, user } = verifyRes.data || verifyRes;
      const activeAccessToken = accessToken || token;

      if (activeAccessToken) {
        localStorage.setItem('simpleon_web3_jwt', activeAccessToken);
      }
      if (refreshToken) {
        localStorage.setItem('simpleon_web3_refresh_token', refreshToken);
      }

      set({
        isAuthenticated: true,
        jwtToken: activeAccessToken,
        userProfile: user,
        basePlan: user?.basePlanAmount || 1.0,
        isWalletModalOpen: false,
        isConnecting: false,
        connectionError: null,
      });

      await get().fetchCalculations(user?.basePlanAmount || 1.0);
      get().fetchUnreadCount();
    } catch (err: any) {
      console.error('SIWE Auth Error:', err.message);
      set({
        isConnecting: false,
        connectionError: err.message || 'SIWE authentication signature verification failed.',
      });
    }
  },

  disconnectWallet: async () => {
    try {
      await appKitModal.disconnect();
    } catch (e) {
      console.error(e);
    }
    const storedRefreshToken = localStorage.getItem('simpleon_web3_refresh_token');
    if (storedRefreshToken) {
      await authApi.logout(storedRefreshToken);
    }

    localStorage.removeItem('simpleon_web3_jwt');
    localStorage.removeItem('simpleon_web3_refresh_token');

    set({
      isConnected: false,
      address: null,
      chainId: 97,
      provider: null,
      isAuthenticated: false,
      jwtToken: null,
      userProfile: null,
      walletType: null,
      isConnecting: false,
      connectionError: null,
      activeView: 'landing',
      hasPromptedSiwe: false,
    });
  },

  setBasePlan: async (amount: number) => {
    set({ basePlan: amount });
    await get().fetchCalculations(amount);
  },

  fetchCalculations: async (basePlan) => {
    const plan = basePlan || get().basePlan;
    try {
      const res: any = await api.get(`/booster/calculations?basePlan=${plan}`);
      set({ calculations: res.data || res });
    } catch (err) {
      console.error('Fetch calculations failed:', err);
    }
  },

  fetchProfile: async () => {
    const { address } = get();
    if (!address) return;
    try {
      const res: any = await api.get(`/user/profile?address=${address}`);
      set({ userProfile: res.data?.user || res.user || res });
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  },

  upgradeTier: async (targetTier: string) => {
    try {
      const res: any = await api.post('/booster/upgrade', { targetTier });
      set({ userProfile: res.data?.user || res.user || res });
      await get().fetchCalculations(get().basePlan);
    } catch (err: any) {
      console.error('Upgrade tier error:', err.message);
    }
  },

  switchChain: async (targetChainId: number) => {
    const { provider } = get();
    const hexChainId = `0x${targetChainId.toString(16)}`;

    if (provider && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
        set({ chainId: targetChainId });
      } catch (err: any) {
        console.warn('Chain switch failed:', err.message);
        set({ chainId: targetChainId });
      }
    } else {
      set({ chainId: targetChainId });
    }
  },

  claimDemoCoins: async () => {
    try {
      // @ts-ignore
      const { walletApi } = await import('../services/api');
      await walletApi.claimDemoCoins();
      // Dispatch a dashboard refresh event to quickly update numbers everywhere
      window.dispatchEvent(new Event('dashboard_refresh'));
    } catch (err: any) {
      console.error('Failed to claim demo coins:', err);
    }
  },
}));
