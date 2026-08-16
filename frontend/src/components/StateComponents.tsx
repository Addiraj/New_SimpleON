import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Inbox, ArrowRight } from 'lucide-react';

interface SkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeletonCard: React.FC<SkeletonProps> = ({ lines = 3, className = '' }) => (
  <div className={`p-6 rounded-2xl bg-surface border border-border-theme space-y-4 ${className}`}>
    <div className="h-6 w-1/3 rounded-lg skeleton-shimmer"></div>
    <div className="h-10 w-2/3 rounded-xl skeleton-shimmer"></div>
    <div className="space-y-2 pt-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded skeleton-shimmer" style={{ opacity: 1 - i * 0.2 }}></div>
      ))}
    </div>
  </div>
);

export const LoadingSkeletonTable: React.FC = () => (
  <div className="p-6 rounded-2xl bg-surface border border-border-theme space-y-4">
    <div className="flex justify-between items-center pb-4 border-b border-border-theme">
      <div className="h-6 w-48 rounded-lg skeleton-shimmer"></div>
      <div className="h-8 w-28 rounded-xl skeleton-shimmer"></div>
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 py-3 border-b border-border-theme/50">
        <div className="h-10 w-10 rounded-full skeleton-shimmer"></div>
        <div className="flex-1 space-y-2">
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
  <div className="p-12 rounded-2xl bg-surface border border-dashed border-border-theme flex flex-col items-center justify-center text-center my-6">
    <div className="p-4 rounded-full bg-surface-elevated text-sub mb-4">
      {icon || <Inbox size={32} className="text-sub" />}
    </div>
    <h3 className="text-lg font-bold text-prime mb-1">{title}</h3>
    <p className="text-xs text-sub max-w-md mb-6 leading-relaxed">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 rounded-full bg-accent-red text-white text-xs font-bold hover:bg-accent-red/90 transition-all flex items-center space-x-2 shadow-md shadow-accent-red/20"
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
  <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-prime my-4 flex items-start space-x-4">
    <div className="p-2 rounded-xl bg-red-500/20 text-red-500 shrink-0">
      <AlertTriangle size={20} />
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-red-500 mb-1">{title}</h4>
      <p className="text-xs text-sub leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-xl bg-accent-red/20 hover:bg-accent-red/30 text-accent-red text-xs font-bold transition-all flex items-center space-x-1 shrink-0"
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
  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-prime my-4 flex items-start space-x-4">
    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
      <CheckCircle2 size={20} />
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-emerald-500 mb-1">{title}</h4>
      <p className="text-xs text-sub leading-relaxed">{message}</p>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-xs font-bold text-sub hover:text-prime transition-colors"
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
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 mb-6 rounded-2xl bg-surface border border-border-theme text-xs shadow-sm">
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
        <span className="font-mono text-sub font-bold uppercase tracking-wider text-[11px]">Investor UI Inspector:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onStateChange('loaded')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentState === 'loaded' ? 'bg-accent-red text-white shadow-sm' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          Normal Loaded
        </button>
        <button
          onClick={() => onStateChange('loading')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentState === 'loading' ? 'bg-accent-blue text-white shadow-sm' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          ⏳ Loading Skeleton
        </button>
        <button
          onClick={() => onStateChange('empty')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentState === 'empty' ? 'bg-accent-orange text-white shadow-sm' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          📭 Empty State
        </button>
        <button
          onClick={() => onStateChange('error')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentState === 'error' ? 'bg-red-600 text-white shadow-sm' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          ⚠️ Error Banner
        </button>
        <button
          onClick={() => onStateChange('success')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentState === 'success' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-surface-elevated text-sub hover:text-prime'
          }`}
        >
          ✅ Success Toast
        </button>
      </div>
    </div>
  );
};
