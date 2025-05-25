import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null
	};

	public static getDerivedStateFromError(error: Error): State {
		// Update state so the next render will show the fallback UI.
		return { hasError: true, error: error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// You can also log the error to an error reporting service
		console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
	}

	public render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return (
				<div className="flex items-center justify-center min-h-screen bg-red-100">
					<div className="px-4 py-5 sm:p-6 bg-white shadow sm:rounded-lg text-center">
						<h3 className="text-lg font-medium text-red-800">Something went wrong.</h3>
						<p className="mt-2 text-sm text-red-600">
							An unexpected error occurred while trying to render this page.
						</p>
						{this.state.error && (
							<pre className="mt-4 text-xs text-gray-800 text-left overflow-auto max-h-60">
								{this.state.error.message}
							</pre>
						)}
						<button
							onClick={() => window.location.reload()}
							className="mt-5 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary; 