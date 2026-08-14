import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught rendering exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-page text-prime font-sans">
          <div className="max-w-md w-full p-6 rounded-3xl bg-surface border border-border-theme shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-prime">
                {this.props.fallbackTitle || 'Module Refresh Required'}
              </h3>
              <p className="text-xs text-sub leading-relaxed">
                {this.state.error?.message || 'A code update occurred while the session was active. Please reload to sync the latest modules.'}
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center space-x-2"
            >
              <RefreshCw size={14} />
              <span>Reload Module</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
