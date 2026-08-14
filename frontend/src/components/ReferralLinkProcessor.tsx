import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, UserPlus, X } from 'lucide-react';
import { referralApi } from '../services/api';
import { useWeb3Store } from '../store/useWeb3Store';
import {
  clearPendingReferral,
  clearReferralQueryParam,
  readPendingReferral,
  readReferralCodeFromSearch,
  savePendingReferral,
} from '../utils/referral';

type ReferralFlowState =
  | 'idle'
  | 'validating'
  | 'awaiting_wallet'
  | 'checking_relationship'
  | 'awaiting_confirmation'
  | 'assigning'
  | 'completed'
  | 'rejected';

interface SponsorDetails {
  displayName?: string | null;
  walletAddress?: string;
  shortWalletAddress?: string;
  referralCode?: string;
}

const terminalMessages: Record<string, { title: string; message: string }> = {
  already_assigned_same_sponsor: {
    title: 'Referral Already Assigned',
    message: 'You are already directly referred by this sponsor. Your current referral relationship remains unchanged.',
  },
  already_assigned_different_sponsor: {
    title: 'Existing Sponsor Found',
    message: 'Your account is already linked to another sponsor. For referral-tree integrity, your existing sponsor cannot be changed.',
  },
  already_in_downline: {
    title: 'Existing Network Relationship',
    message: 'You are already part of this sponsor\'s referral network. A duplicate direct referral relationship cannot be created.',
  },
  self_referral: {
    title: 'Invalid Self-Referral',
    message: 'You cannot use your own referral link.',
  },
  invalid_referral: {
    title: 'Invalid Referral Link',
    message: 'This referral link is invalid or no longer available.',
  },
  inactive_sponsor: {
    title: 'Inactive Sponsor',
    message: 'This sponsor is currently unavailable for new referrals.',
  },
  referral_loop: {
    title: 'Invalid Referral Loop',
    message: 'This referral relationship cannot be created because it would form an invalid referral loop.',
  },
  wallet_not_verified: {
    title: 'Wallet Verification Required',
    message: 'Connect and verify your wallet before assigning this referral sponsor.',
  },
};

export default function ReferralLinkProcessor() {
  const { isAuthenticated, isConnecting, openWalletModal } = useWeb3Store();
  const [flowState, setFlowState] = useState<ReferralFlowState>('idle');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<SponsorDetails | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);
  const lastValidationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const codeFromQuery = readReferralCodeFromSearch();
    if (codeFromQuery) {
      savePendingReferral(codeFromQuery);
      setReferralCode(codeFromQuery);
      clearReferralQueryParam();
      return;
    }

    const pending = readPendingReferral();
    if (pending) {
      setReferralCode(pending.referralCode);
    }
  }, []);

  useEffect(() => {
    const pending = readPendingReferral();
    if (!pending) return;

    const validationKey = `${pending.referralCode}:${isAuthenticated ? 'auth' : 'guest'}`;
    if (lastValidationKeyRef.current === validationKey && flowState !== 'idle') return;
    lastValidationKeyRef.current = validationKey;

    const currentRequestId = ++requestRef.current;
    setReferralCode(pending.referralCode);
    setFlowState(isAuthenticated ? 'checking_relationship' : 'validating');
    setStatus(null);
    setMessage(null);

    referralApi
      .validateCode(pending.referralCode)
      .then((res: any) => {
        if (requestRef.current !== currentRequestId) return;
        const data = res?.data || res;
        const nextStatus = data.relationshipStatus || data.status || (data.valid ? 'valid' : 'invalid_referral');

        setSponsor(data.sponsor || null);
        setStatus(nextStatus);
        setMessage(data.message || null);

        if (!data.valid) {
          setFlowState('rejected');
          return;
        }

        if (!isAuthenticated) {
          setFlowState('awaiting_wallet');
          return;
        }

        if (nextStatus === 'no_existing_upline' || nextStatus === 'valid') {
          setFlowState('awaiting_confirmation');
          return;
        }

        setFlowState('completed');
        clearPendingReferral();
      })
      .catch((err: any) => {
        if (requestRef.current !== currentRequestId) return;
        setStatus('invalid_referral');
        setMessage(err.message || 'This referral link is invalid or no longer available.');
        setFlowState('rejected');
      });
  }, [isAuthenticated, flowState]);

  const modalCopy = useMemo(() => {
    if (flowState === 'awaiting_wallet') {
      return {
        icon: <UserPlus size={18} className="text-accent-red" />,
        title: 'Referral Sponsor Detected',
        message: 'You opened an invitation from this sponsor. Connect your wallet to continue and establish the referral relationship.',
      };
    }

    if (flowState === 'awaiting_confirmation') {
      return {
        icon: <ShieldCheck size={18} className="text-accent-blue" />,
        title: 'Confirm Direct Referral',
        message: 'You are joining through this sponsor\'s referral link. This sponsor will be registered as your direct upline.',
      };
    }

    if (flowState === 'assigning' || flowState === 'validating' || flowState === 'checking_relationship') {
      return {
        icon: <RefreshCw size={18} className="animate-spin text-accent-blue" />,
        title: flowState === 'assigning' ? 'Assigning Sponsor' : 'Validating Referral',
        message: 'Please wait while SimpleOn verifies this referral relationship.',
      };
    }

    if (status === 'assigned') {
      return {
        icon: <CheckCircle2 size={18} className="text-emerald-500" />,
        title: 'Direct Referral Registered',
        message: 'You have been successfully registered as a direct referral of this sponsor.',
      };
    }

    const fallback = terminalMessages[status || 'invalid_referral'] || terminalMessages.invalid_referral;
    return {
      icon: <AlertCircle size={18} className="text-accent-red" />,
      title: fallback.title,
      message: message || fallback.message,
    };
  }, [flowState, message, status]);

  const closeAndClear = () => {
    clearPendingReferral();
    clearReferralQueryParam();
    setFlowState('idle');
    setReferralCode(null);
    setSponsor(null);
    setStatus(null);
    setMessage(null);
  };

  const handlePrimaryAction = async () => {
    if (flowState === 'awaiting_wallet') {
      openWalletModal();
      return;
    }

    if (flowState !== 'awaiting_confirmation' || !referralCode) {
      closeAndClear();
      return;
    }

    const currentRequestId = ++requestRef.current;
    setFlowState('assigning');

    try {
      const res = await referralApi.assignSponsor(referralCode, 'referral_link');
      if (requestRef.current !== currentRequestId) return;

      const data = res?.data || res;
      const nextStatus = data.status || 'assigned';
      setStatus(nextStatus);
      setMessage(data.message || null);
      setFlowState('completed');
      clearPendingReferral();
      window.dispatchEvent(new Event('referral_assigned'));
      window.dispatchEvent(new Event('dashboard_refresh'));
    } catch (err: any) {
      if (requestRef.current !== currentRequestId) return;
      setStatus('invalid_referral');
      setMessage(err.message || 'This referral link is invalid or no longer available.');
      setFlowState('rejected');
    }
  };

  const isOpen = flowState !== 'idle';
  const isBusy = flowState === 'validating' || flowState === 'checking_relationship' || flowState === 'assigning';
  const showCancel = flowState === 'awaiting_wallet' || flowState === 'awaiting_confirmation';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-surface border border-border-theme rounded-3xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex justify-between items-center pb-2 border-b border-border-theme">
              <div className="flex items-center space-x-2">
                {modalCopy.icon}
                <span className="text-sm font-extrabold text-prime">{modalCopy.title}</span>
              </div>
              {!isBusy && (
                <button onClick={closeAndClear} className="p-1 rounded-xl hover:bg-surface-elevated" title="Close">
                  <X size={16} />
                </button>
              )}
            </div>

            <p className="text-xs text-sub leading-relaxed">{modalCopy.message}</p>

            {(sponsor || referralCode) && (
              <div className="rounded-2xl bg-surface-elevated border border-border-theme p-4 space-y-2 text-xs">
                {sponsor?.displayName && (
                  <div className="flex justify-between gap-3">
                    <span className="text-sub font-bold">Sponsor</span>
                    <span className="text-prime font-extrabold">{sponsor.displayName}</span>
                  </div>
                )}
                {sponsor?.walletAddress && (
                  <div className="flex justify-between gap-3">
                    <span className="text-sub font-bold">Wallet</span>
                    <span className="text-prime font-mono font-extrabold">
                      {sponsor.shortWalletAddress || `${sponsor.walletAddress.slice(0, 6)}...${sponsor.walletAddress.slice(-4)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-sub font-bold">Referral Code</span>
                  <span className="text-accent-red font-mono font-extrabold">{referralCode}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-sub font-bold">Relationship</span>
                  <span className="text-prime font-extrabold">Direct Referral</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {showCancel && (
                <button
                  type="button"
                  onClick={closeAndClear}
                  className="flex-1 py-3 rounded-2xl bg-surface-elevated border border-border-theme text-prime text-xs font-black hover:bg-surface transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isBusy}
                className="flex-1 py-3 rounded-2xl bg-accent-red text-white text-xs font-black shadow-md hover:bg-accent-red/90 transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
              >
                {isBusy && <RefreshCw size={16} className="animate-spin" />}
                <span>
                  {flowState === 'awaiting_wallet'
                    ? (isConnecting ? 'Connecting...' : 'Connect Wallet & Start')
                    : flowState === 'awaiting_confirmation'
                    ? 'Confirm Sponsor'
                    : isBusy
                    ? 'Please Wait'
                    : 'Close'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
