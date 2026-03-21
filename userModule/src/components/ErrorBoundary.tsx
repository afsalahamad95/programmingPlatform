import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorMessage from './ErrorMessage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white/5 flex items-center justify-center p-4">
          <ErrorMessage
            message="Something went wrong. Please try refreshing the page."
            error={this.state.error}
          />
        </div>
      );
    }

    return this.props.children;
  }
}