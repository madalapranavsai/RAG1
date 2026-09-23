import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="surface-card max-w-md w-full p-6 sm:p-8 rounded-2xl border border-slate-800 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Something unexpected occurred</h2>
            <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
              DocuMind encountered a display issue while rendering this view. Your workspace data and documents are safe.
            </p>
            {this.state.error?.message && (
              <div className="p-3 mb-6 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Diagnostic:</span>
                <p className="text-xs font-mono text-rose-400 truncate">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-semibold text-xs shadow-sm interactive-press transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-900" />
                <span>Reload View</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 interactive-press transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Overview</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
