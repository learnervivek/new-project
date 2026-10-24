import React from 'react';
import { Compass, RotateCcw, Home } from 'lucide-react';
import Button from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ivory-50 p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-ivory-300 shadow-soft-xl p-8 space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-center text-terracotta-600">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-charcoal-900 font-display">
                Something went wrong
              </h2>
              <p className="text-sm text-charcoal-600">
                An unexpected interface issue occurred. You can refresh or return home.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reload
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
