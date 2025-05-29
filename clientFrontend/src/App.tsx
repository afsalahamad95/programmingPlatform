import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import TestAttempt from "./components/TestAttempt";
import TestList from "./components/TestList";
import ChallengesPage from "./components/ChallengesPage";
import ChallengeAttempt from "./components/ChallengeAttempt";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./contexts/AuthContext";
import TestResult from "./components/TestResult";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 3,
			retryDelay: (attemptIndex) =>
				Math.min(1000 * 2 ** attemptIndex, 30000),
			refetchOnWindowFocus: false,
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
});

// Configure React Router
const routerConfig = {
	basename: "/",
	window: window,
};

function Navigation() {
	const { user, logout } = useAuth();

	return (
		<nav className="bg-white shadow">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex">
						<div className="flex-shrink-0 flex items-center">
							<span className="text-xl font-bold text-indigo-600">
								Programming Platform
							</span>
						</div>
						{user && (
							<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
								<Link
									to="/"
									className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
								>
									Tests
								</Link>
								<Link
									to="/challenges"
									className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
								>
									Challenges
								</Link>
							</div>
						)}
					</div>
					{user && (
						<div className="flex items-center">
							<span className="text-gray-700 mr-4">
								{user.fullName}
							</span>
							<button
								onClick={() => logout()}
								className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
							>
								Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Router {...routerConfig}>
					<div className="min-h-screen bg-gray-50">
						<Navigation />
						<div className="py-8">
							<Routes>
								<Route path="/login" element={<Login />} />
								<Route
									path="/"
									element={
										<ProtectedRoute>
											<TestList />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/tests/:id"
									element={
										<ProtectedRoute>
											<ErrorBoundary>
												<TestAttempt />
											</ErrorBoundary>
										</ProtectedRoute>
									}
								/>
								<Route
									path="/challenges"
									element={
										<ProtectedRoute>
											<ChallengesPage />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/challenges/:id"
									element={
										<ProtectedRoute>
											<ChallengeAttempt />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/results/:attemptId"
									element={
										<ProtectedRoute>
											<TestResult />
										</ProtectedRoute>
									}
								/>
							</Routes>
						</div>
					</div>
				</Router>
			</AuthProvider>
		</QueryClientProvider>
	);
}

export default App;
