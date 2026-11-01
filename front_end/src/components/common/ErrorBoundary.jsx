// ErrorBoundary — catches runtime JavaScript rendering errors and displays a recovery interface
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  // Initialize error boundary state to track whether a crash has occurred
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Update state so the next render will show the fallback UI
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Log error details for diagnostics
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render crash:', error, errorInfo);
  }

  // Handle retry / reset action
  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    // If an uncaught rendering error occurred, render fallback UI instead of blank screen
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070d18] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-[#0c162b] border border-[#16274a] rounded-2xl p-8 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    // Normally render children unchanged
    return this.props.children;
  }
}
