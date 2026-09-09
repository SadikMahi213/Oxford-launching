import { Component } from "react";

// Shared crash guard: a failed widget (runtime error or failed lazy chunk)
// shows a local error card with retry instead of blanking the whole page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState((prev) => ({ error: null, retryKey: prev.retryKey + 1 }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 md:p-6">
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-base font-bold text-red-300">
              Something went wrong loading this section.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Your account and other sections are unaffected.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
