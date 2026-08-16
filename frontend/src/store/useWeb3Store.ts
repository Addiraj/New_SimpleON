import { create } from 'zustand';
import { ethers } from 'ethers';
import { api, authApi, notificationApi } from '../services/api';
import { UserProfile, BoosterCalculationsResponse } from '../types';
import { appKitModal } from '../appkit';
import { readReferralCodeFromSearch, savePendingReferral, readPendingReferral } from '../utils/referral';

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
  setBasePlan: (amount: number) => Promise<void>;
  fetchCalculations: (basePlan?: number) => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  upgradeTier: (targetTier: string) => Promise<string>;
  registerAndActivate: (referrer?: string) => Promise<string>;
  activateMainPlan: () => Promise<string>;
  switchChain: (targetChainId: number) => Promise<void>;
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
      const { provider, basePlan } = get();
      if (!provider) throw new Error('Wallet not connected or provider unavailable');

      const signer = await provider.getSigner();

      const usdtAddress = import.meta.env.VITE_USDT_ADDRESS || import.meta.env.VITE_USDT_CONTRACT_ADDRESS;
      const boosterAddress = import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.VITE_SIMPLEON_CONTRACT_ADDRESS;

      if (!usdtAddress || !boosterAddress) {
        throw new Error('Contract addresses not configured in environment');
      }

      const usdtAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const boosterAbi = ["function upgradeTier(uint8 targetTier) external"];

      const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, signer);
      const boosterContract = new ethers.Contract(boosterAddress, boosterAbi, signer);

      let costStr = '0';
      let tierEnum = 0;
      if (targetTier === 'BUILDER') { costStr = '40'; tierEnum = 2; }
      else if (targetTier === 'LEADER') { costStr = '80'; tierEnum = 3; }
      else if (targetTier === 'CHAMPION') { costStr = '320'; tierEnum = 4; }
      else throw new Error('Invalid upgrade target');

      const amountToApprove = ethers.parseUnits((basePlan * parseFloat(costStr)).toString(), 18);

      console.log('Requesting USDT approval...');
      const approveTx = await usdtContract.approve(boosterAddress, amountToApprove);
      await approveTx.wait();

      console.log('Requesting tier upgrade...');
      const upgradeTx = await boosterContract.upgradeTier(tierEnum);
      await upgradeTx.wait();

      console.log('Upgrade transaction confirmed on blockchain');
      // The backend blockchain listener will pick this up and update MySQL.
      await get().fetchCalculations(get().basePlan);
      return upgradeTx.hash;
    } catch (err: any) {
      console.error('Upgrade tier error:', err.message);
      throw err;
    }
  },

  registerAndActivate: async (referrer?: string) => {
    try {
      const { provider, basePlan } = get();
      if (!provider) throw new Error('Wallet not connected or provider unavailable');

      const signer = await provider.getSigner();
      const usdtAddress = import.meta.env.VITE_USDT_ADDRESS || import.meta.env.VITE_USDT_CONTRACT_ADDRESS;
      const boosterAddress = import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.VITE_SIMPLEON_CONTRACT_ADDRESS;

      if (!usdtAddress || !boosterAddress) {
        throw new Error('Contract addresses not configured in environment');
      }

      const usdtAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const boosterAbi = ["function registerAndActivate(address referrer) external"];

      const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, signer);
      const boosterContract = new ethers.Contract(boosterAddress, boosterAbi, signer);

      const amountToApprove = ethers.parseUnits((basePlan * 10).toString(), 18); // Starter is 10 USDT at basePlan=1

      console.log('Requesting USDT approval...');
      const approveTx = await usdtContract.approve(boosterAddress, amountToApprove);
      await approveTx.wait();

      console.log('Requesting register and activate...');
      // Use zero address if no referrer
      const referrerAddress = referrer || ethers.ZeroAddress;
      const joinTx = await boosterContract.registerAndActivate(referrerAddress);
      await joinTx.wait();

      console.log('Join transaction confirmed on blockchain');
      await get().fetchCalculations(get().basePlan);
      return joinTx.hash;
    } catch (err: any) {
      console.error('Join error:', err.message);
      throw err;
    }
  },

  activateMainPlan: async () => {
    try {
      const { provider, basePlan } = get();
      if (!provider) throw new Error('Wallet not connected or provider unavailable');

      const signer = await provider.getSigner();
      const usdtAddress = import.meta.env.VITE_USDT_ADDRESS || import.meta.env.VITE_USDT_CONTRACT_ADDRESS;
      const boosterAddress = import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.VITE_SIMPLEON_CONTRACT_ADDRESS;

      if (!usdtAddress || !boosterAddress) {
        throw new Error('Contract addresses not configured in environment');
      }

      const usdtAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const boosterAbi = ["function activateMainPlan() external"];

      const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, signer);
      const boosterContract = new ethers.Contract(boosterAddress, boosterAbi, signer);

      const amountToApprove = ethers.parseUnits((basePlan * 100).toString(), 18); // Main Plan is 100x basePlan

      console.log('Requesting USDT approval...');
      const approveTx = await usdtContract.approve(boosterAddress, amountToApprove);
      await approveTx.wait();

      console.log('Requesting activate Main Plan...');
      const tx = await boosterContract.activateMainPlan();
      await tx.wait();

      console.log('Main plan activated on blockchain');
      await get().fetchCalculations(get().basePlan);
      return tx.hash;
    } catch (err: any) {
      console.error('Activate Main Plan error:', err.message);
      throw err;
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
}));
