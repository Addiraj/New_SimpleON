import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('simpleon_web3_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor with automatic token rotation on 401
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem('simpleon_web3_refresh_token');

      if (storedRefreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', {
            refreshToken: storedRefreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = res.data?.data || res.data;

          if (accessToken) {
            localStorage.setItem('simpleon_web3_jwt', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('simpleon_web3_refresh_token', newRefreshToken);
            }

            api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            processQueue(null, accessToken);
            isRefreshing = false;

            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          localStorage.removeItem('simpleon_web3_jwt');
          localStorage.removeItem('simpleon_web3_refresh_token');
          return Promise.reject(refreshErr);
        }
      }

      isRefreshing = false;
      localStorage.removeItem('simpleon_web3_jwt');
      localStorage.removeItem('simpleon_web3_refresh_token');
    }

    const message = error.response?.data?.error?.message || error.message || 'API Request Failed';
    return Promise.reject(new Error(message));
  }
);

// Auth API endpoints helper
export const authApi = {
  getNonce: async (walletAddress: string, chainId = 97) => {
    const res: any = await api.post('/auth/nonce', { walletAddress, chainId });
    return res.data || res;
  },

  verifySignature: async (data: {
    address: string;
    signature: string;
    message: string;
    referrerAddress?: string;
  }) => {
    const res: any = await api.post('/auth/verify', data);
    return res.data || res;
  },

  refreshToken: async (refreshToken: string) => {
    const res: any = await api.post('/auth/refresh', { refreshToken });
    return res.data || res;
  },

  logout: async (refreshToken?: string) => {
    try {
      const res: any = await api.post('/auth/logout', { refreshToken });
      return res.data || res;
    } catch (err) {
      return { success: true };
    }
  },

  getMe: async () => {
    const res: any = await api.get('/auth/me');
    return res.data || res;
  },

  adminLogin: async (username: string, password: string) => {
    const res: any = await api.post('/auth/admin/login', { username, password });
    return res.data || res;
  },
};

// User Profile & Preferences API
export const userApi = {
  getProfile: async () => {
    const res: any = await api.get('/user/profile');
    return res.data || res;
  },

  updateProfile: async (data: { displayName?: string; email?: string }) => {
    const res: any = await api.patch('/user/profile', data);
    return res.data || res;
  },

  getPreferences: async () => {
    const res: any = await api.get('/user/preferences');
    return res.data || res;
  },

  updatePreferences: async (data: {
    language?: string;
    theme?: string;
    emailNotifications?: boolean;
    inAppNotifications?: boolean;
  }) => {
    const res: any = await api.patch('/user/preferences', data);
    return res.data || res;
  },

  getActivityLogs: async () => {
    const res: any = await api.get('/user/activity-logs');
    return res.data || res;
  },
};

// Booster Plan API
export const boosterApi = {
  getPlans: async (signal?: AbortSignal) => {
    const res: any = await api.get('/booster/plans', { signal });
    return res.data || res;
  },

  getPlanBySlug: async (slug: string) => {
    const res: any = await api.get(`/booster/plans/${slug}`);
    return res.data || res;
  },

  getCurrentPlan: async () => {
    const res: any = await api.get('/booster/current-plan');
    return res.data || res;
  },

  getEligibility: async (slug?: string) => {
    const res: any = await api.get('/booster/eligibility', { params: slug ? { slug } : {} });
    return res.data || res;
  },

  calculate: async (basePlan: number, signal?: AbortSignal) => {
    const res: any = await api.post('/booster/calculate', { basePlan }, { signal });
    return res.data || res;
  },
};

// Referral Backend API
export const referralApi = {
  getSummary: async () => {
    const res: any = await api.get('/referrals/summary');
    return res.data || res;
  },

  getDirect: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res: any = await api.get('/referrals/direct', { params });
    return res.data || res;
  },

  getTree: async (params?: { maxDepth?: number; search?: string }) => {
    const res: any = await api.get('/referrals/tree', { params });
    return res.data || res;
  },

  getLink: async () => {
    const res: any = await api.get('/referrals/link');
    return res.data || res;
  },

  validateCode: async (referralCode: string) => {
    const res: any = await api.get(`/referrals/validate/${encodeURIComponent(referralCode)}`);
    return res.data || res;
  },

  assignSponsor: async (referralCode: string, source = 'referral_link') => {
    const res: any = await api.post('/referrals/assign-sponsor', { referralCode, source });
    return res.data || res;
  },

  assign: async (referralCode: string, source = 'referral_link') => {
    const res: any = await api.post('/referrals/assign', { referralCode, source });
    return res.data || res;
  },
};

// Payment Intent API
export const paymentApi = {
  createJoinIntent: async (data?: { levelSlug?: string; levelOrder?: number; levelId?: string }) => {
    const res: any = await api.post('/payments/join-intent', data || {});
    return res.data || res;
  },

  createUpgradeIntent: async (data?: { levelSlug?: string; levelOrder?: number; levelId?: string }) => {
    const res: any = await api.post('/payments/upgrade-intent', data || {});
    return res.data || res;
  },

  createRetopupIntent: async (data?: { levelSlug?: string; levelOrder?: number; levelId?: string }) => {
    const res: any = await api.post('/payments/retopup-intent', data || {});
    return res.data || res;
  },

  getById: async (id: string) => {
    const res: any = await api.get(`/payments/${id}`);
    return res.data || res;
  },

  getByReference: async (reference: string) => {
    const res: any = await api.get(`/payments/reference/${encodeURIComponent(reference)}`);
    return res.data || res;
  },

  confirmMock: async (id: string, txHash?: string) => {
    const res: any = await api.post(`/payments/${id}/mock-confirm`, { txHash });
    return res.data || res;
  },

  verifyPayment: async (data: { paymentIntentId: string; txHash: string }) => {
    const res: any = await api.post('/payments/verify', data);
    return res.data || res;
  },
};

// Upgrade API
export const upgradeApi = {
  getEligibility: async (targetSlug?: string) => {
    const res: any = await api.get('/upgrades/eligibility', { params: targetSlug ? { targetSlug } : {} });
    return res.data || res;
  },

  getHistory: async () => {
    const res: any = await api.get('/upgrades/history');
    return res.data || res;
  },

  executeUpgrade: async (data?: { targetSlug?: string; idempotencyKey?: string }) => {
    const res: any = await api.post('/upgrades/execute', data || {});
    return res.data || res;
  },

  createPaymentIntent: async (data?: { levelSlug?: string }) => {
    const res: any = await api.post('/upgrades/create-payment-intent', data || {});
    return res.data || res;
  },
};

// Capping API
export const cappingApi = {
  getStatus: async () => {
    const res: any = await api.get('/capping/status');
    return res.data || res;
  },

  getHistory: async (page: number = 1, limit: number = 10) => {
    const res: any = await api.get('/capping/history', { params: { page, limit } });
    return res.data || res;
  },

  getSummary: async () => {
    const res: any = await api.get('/capping/summary');
    return res.data || res;
  },
};

// Wallet API
export const walletApi = {
  getSummary: async () => {
    const res: any = await api.get('/wallet/summary');
    return res.data || res;
  },

  getLedger: async (params?: { page?: number; limit?: number; entryType?: string; status?: string; direction?: string; search?: string; startDate?: string; endDate?: string }) => {
    const res: any = await api.get('/wallet/ledger', { params });
    return res.data || res;
  },

  claimDemoCoins: async () => {
    const res: any = await api.post('/wallet/faucet');
    return res.data || res;
  },

  demoActivate: async (referralCode?: string) => {
    const res: any = await api.post('/wallet/demo-activate', { referralCode });
    return res.data || res;
  },
};

// Transaction API
export const transactionApi = {
  getTransactions: async (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string; startDate?: string; endDate?: string }) => {
    const res: any = await api.get('/transactions', { params });
    return res.data || res;
  },

  getTransactionById: async (id: string) => {
    const res: any = await api.get(`/transactions/${id}`);
    return res.data || res;
  },

  exportCSV: async (params?: { type?: string; status?: string; search?: string; startDate?: string; endDate?: string }) => {
    const res: any = await api.get('/transactions/export', { params, responseType: 'blob' });
    return res;
  },
};

// Matrix API
export const matrixApi = {
  getSummary: async (params?: { levelConfigId?: string; tier?: string; tierCode?: string; address?: string }, signal?: AbortSignal) => {
    const res: any = await api.get('/matrix/summary', { params, signal });
    return res.data || res;
  },

  getCurrent: async (params?: { levelConfigId?: string; tier?: string; tierCode?: string; address?: string }, signal?: AbortSignal) => {
    const res: any = await api.get('/matrix/current', { params, signal });
    return res.data || res;
  },

  getCycles: async (params?: { levelConfigId?: string; tier?: string; tierCode?: string; address?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const res: any = await api.get('/matrix/cycles', { params, signal });
    return res.data || res;
  },

  getCycleById: async (id: string) => {
    const res: any = await api.get(`/matrix/cycles/${id}`);
    return res.data || res;
  },

  getCyclePositions: async (id: string) => {
    const res: any = await api.get(`/matrix/cycles/${id}/positions`);
    return res.data || res;
  },

  getTree: async (params?: { levelConfigId?: string; depth?: number }) => {
    const res: any = await api.get('/matrix/tree', { params });
    return res.data || res;
  },
};

// Dashboard API
export const dashboardApi = {
  getDashboard: async (params?: { address?: string }) => {
    const res: any = await api.get('/dashboard', { params });
    return res.data || res;
  },

  getSummary: async (params?: { address?: string }) => {
    const res: any = await api.get('/dashboard/summary', { params });
    return res.data || res;
  },

  getRecentTransactions: async (params?: { address?: string; limit?: number }) => {
    const res: any = await api.get('/dashboard/recent-transactions', { params });
    return res.data || res;
  },
};

// Notification API
export const notificationApi = {
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const res: any = await api.get('/notifications', { params });
    return res.data || res;
  },

  getUnreadCount: async () => {
    const res: any = await api.get('/notifications/unread-count');
    return res.data || res;
  },

  markAsRead: async (id: string) => {
    const res: any = await api.patch(`/notifications/${id}/read`);
    return res.data || res;
  },

  markAllAsRead: async () => {
    const res: any = await api.patch('/notifications/read-all');
    return res.data || res;
  },
};

// Stats API
export const statsApi = {
  getGlobalStats: async () => {
    const res: any = await api.get('/stats/global');
    return res.data || res;
  }
};
