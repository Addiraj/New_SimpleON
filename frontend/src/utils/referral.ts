export const PENDING_REFERRAL_KEY = 'simpleon_pending_referral';
export const LEGACY_REFERRER_KEY = 'simpleon_referrer_code';
const REFERRAL_TTL_MS = 24 * 60 * 60 * 1000;

export interface PendingReferralContext {
  referralCode: string;
  source: 'referral_link';
  capturedAt: string;
}

const isLocalhostUrl = (url: URL) =>
  ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

const chooseReferralBaseUrl = () => {
  const currentOrigin = window.location.origin;
  const configuredBaseUrl = import.meta.env.VITE_APP_URL as string | undefined;

  if (!configuredBaseUrl) {
    return currentOrigin;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl.replace(/\/+$/, ''));
    const currentUrl = new URL(currentOrigin);

    if (isLocalhostUrl(configuredUrl) && !isLocalhostUrl(currentUrl)) {
      return currentOrigin;
    }

    return configuredUrl.origin;
  } catch {
    return currentOrigin;
  }
};

export function normalizeReferralCode(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null;

  let decoded = rawCode;
  try {
    decoded = decodeURIComponent(rawCode);
  } catch {
    decoded = rawCode;
  }

  const normalized = decoded.trim().toUpperCase();
  if (!normalized || !/^SO-[A-Z0-9]{8,64}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function buildReferralUrl(referralCode: string): string {
  const selectedBaseUrl = chooseReferralBaseUrl();
  let baseUrl: URL;

  try {
    baseUrl = new URL(selectedBaseUrl.replace(/\/+$/, ''));
  } catch {
    baseUrl = new URL(window.location.origin);
  }

  if (baseUrl.protocol === 'http:' && !isLocalhostUrl(baseUrl)) {
    baseUrl.protocol = 'https:';
  }

  return `${baseUrl.origin}/?ref=${encodeURIComponent(referralCode)}`;
}

export function readReferralCodeFromSearch(search = window.location.search): string | null {
  const params = new URLSearchParams(search);
  return normalizeReferralCode(params.get('ref'));
}

export function savePendingReferral(referralCode: string): PendingReferralContext {
  const pending: PendingReferralContext = {
    referralCode,
    source: 'referral_link',
    capturedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(PENDING_REFERRAL_KEY, JSON.stringify(pending));
  localStorage.setItem(LEGACY_REFERRER_KEY, referralCode);
  return pending;
}

export function readPendingReferral(): PendingReferralContext | null {
  const raw = sessionStorage.getItem(PENDING_REFERRAL_KEY);
  if (!raw) return null;

  try {
    const pending = JSON.parse(raw) as PendingReferralContext;
    const referralCode = normalizeReferralCode(pending.referralCode);
    const capturedAt = new Date(pending.capturedAt).getTime();

    if (!referralCode || Number.isNaN(capturedAt) || Date.now() - capturedAt > REFERRAL_TTL_MS) {
      clearPendingReferral();
      return null;
    }

    return { ...pending, referralCode };
  } catch {
    clearPendingReferral();
    return null;
  }
}

export function clearPendingReferral() {
  sessionStorage.removeItem(PENDING_REFERRAL_KEY);
  localStorage.removeItem(LEGACY_REFERRER_KEY);
}

export function clearReferralQueryParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('ref')) return;

  url.searchParams.delete('ref');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl || '/');
}
