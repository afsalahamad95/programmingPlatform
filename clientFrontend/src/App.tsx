import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import TestAttempt from "./components/TestAttempt";
import TestList from "./components/TestList";
import ChallengesPage from "./components/ChallengesPage";
import ChallengeAttempt from "./components/ChallengeAttempt";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./contexts/AuthContext";
import TestResult from "./components/TestResult";
import ChatBot from "./components/ChatBot";
import RoadmapGenerator from "./components/RoadmapGenerator";
import ResumeGenerator from "./components/ResumeGenerator";
import Profile from "./components/Profile";
import MockInterview from "./components/MockInterview";

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
		<nav className="glass-nav sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex">
						<div className="flex-shrink-0 flex items-center">
							<span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 drop-shadow-sm">
								Programming Platform
							</span>
						</div>
						{user && (
							<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
								<Link
									to="/"
									className="border-purple-400 text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
								>
									Tests
								</Link>
								<Link
									to="/challenges"
									className="border-transparent text-gray-200 hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
								>
									Challenges
								</Link>
								<Link
									to="/roadmap"
									className="border-transparent text-indigo-300 hover:text-indigo-100 hover:border-indigo-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
								>
									AI Roadmap
								</Link>
								<Link
									to="/resume"
									className="border-transparent text-emerald-300 hover:text-emerald-100 hover:border-emerald-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
								>
									AI Resume
								</Link>
								<Link
									to="/mock-interview"
									className="border-transparent text-pink-300 hover:text-pink-100 hover:border-pink-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
								>
									AI Interview
								</Link>
								<Link
									to="/profile"
									className="border-transparent text-purple-300 hover:text-purple-100 hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
								>
									Profile
								</Link>
							</div>
						)}
					</div>
					{user && (
						<div className="flex items-center">
							<span className="text-gray-200 mr-4 font-medium backdrop-blur-sm bg-white/5 py-1 px-3 rounded-full border border-white/10">
								{user.fullName}
							</span>
							<button
								onClick={() => logout()}
								className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-all"
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
					<div className="min-h-screen text-gray-100 flex flex-col">
						<Navigation />
						<div className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
							<Routes>
								<Route path="/login" element={<Login />} />
								<Route path="/register" element={<Register />} />
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
								<Route
									path="/roadmap"
									element={
										<ProtectedRoute>
											<RoadmapGenerator />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/resume"
									element={
										<ProtectedRoute>
											<ResumeGenerator />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/profile"
									element={
										<ProtectedRoute>
											<Profile />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/mock-interview"
									element={
										<ProtectedRoute>
											<MockInterview />
										</ProtectedRoute>
									}
								/>
							</Routes>
						</div>
						<ChatBot />
					</div>
				</Router>
			</AuthProvider>
		</QueryClientProvider>
	);
}

export default App;
