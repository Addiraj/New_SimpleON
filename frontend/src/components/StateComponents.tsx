import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Inbox, ArrowRight } from 'lucide-react';

interface SkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeletonCard: React.FC<SkeletonProps> = ({ lines = 3, className = '' }) => (
  <div className={`card p-6 flex flex-col gap-4 ${className}`}>
    <div className="h-6 w-1/3 rounded-lg skeleton-shimmer"></div>
    <div className="h-10 w-2/3 rounded-xl skeleton-shimmer"></div>
    <div className="flex flex-col gap-2 pt-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded skeleton-shimmer" style={{ opacity: 1 - i * 0.2 }}></div>
      ))}
    </div>
  </div>
);

export const LoadingSkeletonTable: React.FC = () => (
  <div className="card p-6 flex flex-col gap-4">
    <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
      <div className="h-6 w-48 rounded-lg skeleton-shimmer"></div>
      <div className="h-8 w-28 rounded-xl skeleton-shimmer"></div>
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-border-subtle/50">
        <div className="h-10 w-10 rounded-full skeleton-shimmer"></div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-1/4 rounded skeleton-shimmer"></div>
          <div className="h-3 w-1/2 rounded skeleton-shimmer"></div>
        </div>
        <div className="h-6 w-20 rounded-lg skeleton-shimmer"></div>
      </div>
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyStateView: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon
}) => (
  <div className="card p-12 border-dashed flex flex-col items-center justify-center text-center my-6 gap-6">
    <div className="p-4 rounded-2xl bg-surface-sunken text-sub border border-border-subtle shadow-inner">
      {icon || <Inbox size={32} className="text-sub" />}
    </div>
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-[15px] font-black text-prime tracking-wider uppercase">{title}</h3>
      <p className="text-[13px] text-muted max-w-md leading-relaxed">{description}</p>
    </div>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="btn btn-primary"
      >
        <span>{actionText}</span>
        <ArrowRight size={14} />
      </button>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorStateAlert: React.FC<ErrorStateProps> = ({
  title = "API Sync Error",
  message,
  onRetry
}) => (
  <div className="card p-5 border-color-negative/30 bg-color-negative/5 flex items-start gap-4">
    <div className="p-2.5 rounded-xl bg-color-negative/10 text-color-negative border border-color-negative/20 shrink-0">
      <AlertTriangle size={20} />
    </div>
    <div className="flex-1 flex flex-col gap-1">
      <h4 className="text-[13px] font-bold text-color-negative">{title}</h4>
      <p className="text-[12px] text-muted leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3.5 py-2 rounded-xl bg-color-negative/10 hover:bg-color-negative/20 text-color-negative text-[11px] font-bold transition-colors flex items-center gap-1.5 shrink-0 uppercase tracking-wider"
      >
        <RefreshCw size={12} />
        <span>Retry Sync</span>
      </button>
    )}
  </div>
);

interface SuccessStateProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export const SuccessStateBanner: React.FC<SuccessStateProps> = ({
  title = "Operation Successful",
  message,
  onDismiss
}) => (
  <div className="card p-5 border-accent-green/30 bg-accent-green/5 flex items-start gap-4">
    <div className="p-2.5 rounded-xl bg-accent-green/10 text-accent-green border border-accent-green/20 shrink-0">
      <CheckCircle2 size={20} />
    </div>
    <div className="flex-1 flex flex-col gap-1">
      <h4 className="text-[13px] font-bold text-accent-green">{title}</h4>
      <p className="text-[12px] text-muted leading-relaxed">{message}</p>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-[11px] font-bold text-muted hover:text-prime transition-colors uppercase tracking-wider"
      >
        Dismiss
      </button>
    )}
  </div>
);

interface UiStateSwitcherProps {
  currentState: 'loaded' | 'loading' | 'empty' | 'error' | 'success';
  onStateChange: (state: 'loaded' | 'loading' | 'empty' | 'error' | 'success') => void;
}

export const UiStateSwitcher: React.FC<UiStateSwitcherProps> = ({ currentState, onStateChange }) => {
  return (
    <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
        <span className="font-mono text-sub font-bold uppercase tracking-wider text-[11px]">Investor UI Inspector:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onStateChange('loaded')}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            currentState === 'loaded' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          Normal Loaded
        </button>
        <button
          onClick={() => onStateChange('loading')}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            currentState === 'loading' ? 'bg-accent-blue text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          ⏳ Loading Skeleton
        </button>
        <button
          onClick={() => onStateChange('empty')}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            currentState === 'empty' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          📭 Empty State
        </button>
        <button
          onClick={() => onStateChange('error')}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            currentState === 'error' ? 'bg-color-negative text-white shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          ⚠️ Error Banner
        </button>
        <button
          onClick={() => onStateChange('success')}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            currentState === 'success' ? 'bg-accent-green text-slate-950 shadow-sm' : 'bg-surface-sunken text-sub hover:text-prime border border-transparent hover:border-border-subtle'
          }`}
        >
          ✅ Success Toast
        </button>
      </div>
    </div>
  );
};
