import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, InboxIcon, Wifi, WifiOff } from "lucide-react";
import { Test } from "../types";
import { useQuery } from "react-query";
import {
	getActiveTests,
	getScheduledTests,
	getConnectionStatus,
	onConnectionStatusChange,
	getRecommendedTests,
} from "../api";
import { Sparkles, BrainCircuit, Target, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function TestList() {
	const navigate = useNavigate();
	const [isConnected, setIsConnected] = React.useState(getConnectionStatus());

	// Subscribe to connection status changes
	React.useEffect(() => {
		const unsubscribe = onConnectionStatusChange((status) => {
			setIsConnected(status);
		});
		return () => unsubscribe();
	}, []);

	// Fetch active and scheduled tests
	const {
		data: activeTests = [],
		isLoading: isLoadingActive,
		error: activeError,
	} = useQuery("activeTests", getActiveTests, {
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		refetchOnWindowFocus: false,
		refetchInterval: 60000, // Refetch every 60 seconds
	});

	const {
		data: scheduledTests = [],
		isLoading: isLoadingScheduled,
		error: scheduledError,
	} = useQuery("scheduledTests", getScheduledTests, {
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		refetchOnWindowFocus: false,
		refetchInterval: 60000,
	});

	const { data: recommendedTest, isLoading: isLoadingRecommended } = useQuery(
		"recommendedTests",
		getRecommendedTests,
		{ staleTime: 10 * 60 * 1000 } // Recommendations can be stale longer
	);

	const isLoading = isLoadingActive || isLoadingScheduled || isLoadingRecommended;
	const error = activeError || scheduledError;

	// Ensure we have arrays of tests
	const tests = React.useMemo(() => {
		const active = Array.isArray(activeTests) ? activeTests : [];
		const scheduled = Array.isArray(scheduledTests) ? scheduledTests : [];
		return [...active, ...scheduled];
	}, [activeTests, scheduledTests]);

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString("en-US", {
			dateStyle: "medium",
			timeStyle: "short",
		});
	};

	if (isLoading) {
		return (
			<div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
				<p className="text-sm text-gray-400 font-mono tracking-widest">Loading tests…</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="glass-card p-12 text-center border-rose-500/20">
				<p className="text-rose-400 font-semibold">Failed to load tests</p>
				<p className="text-sm text-gray-500 mt-1">{(error as Error).message || "Please try again later"}</p>
			</div>
		);
	}

	return (
		<div className="glass-card">
			<div className="p-6 border-b border-white/10">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Calendar className="w-6 h-6 text-purple-400" />
						<h2 className="text-xl font-semibold text-white">
							Available Tests
						</h2>
					</div>
					<div className="flex items-center gap-2 text-sm">
						{isConnected ? (
							<>
								<Wifi className="w-4 h-4 text-green-500" />
								<span className="text-green-600">
									Live updates enabled
								</span>
							</>
						) : (
							<>
								<WifiOff className="w-4 h-4 text-gray-400" />
								<span className="text-gray-500">
									Offline mode
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Recommended Section */}
			{recommendedTest && (
				<div className="p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-b border-white/10">
					<div className="flex items-center gap-2 mb-4">
						<div className="p-1 px-2 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-indigo-500/30">
							<Sparkles className="w-3 h-3" /> Personalized for You
						</div>
					</div>
					<div 
						onClick={() => navigate(`/tests/${recommendedTest.id}`)}
						className="glass-card !bg-white/5 border border-indigo-500/20 p-5 hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden"
					>
						<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all"></div>
						<div className="flex justify-between items-center relative z-10">
							<div className="space-y-1">
								<h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
									{recommendedTest.title}
									<Target className="w-5 h-5 text-indigo-400 opacity-50" />
								</h3>
								<p className="text-sm text-gray-400 max-w-xl">
									{recommendedTest.description}
								</p>
								<div className="flex gap-4 mt-3 text-xs font-medium text-gray-500">
									<span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {recommendedTest.duration} mins</span>
									<span className="flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5" /> {recommendedTest.questions?.length || 0} Questions</span>
								</div>
							</div>
							<div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
								<ArrowRight className="w-6 h-6" />
							</div>
						</div>
					</div>
				</div>
			)}

			{!tests.length ? (
				<div className="p-12 text-center">
					<InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-medium text-gray-200">
						No tests available
					</h3>
					<p className="mt-1 text-sm text-gray-400">
						There are no active or scheduled tests at the moment.
					</p>
				</div>
			) : (
				<div className="divide-y divide-white/10">
					{tests.map((test: Test) => {
						const now = new Date();
						const status =
							now < test.startTime
								? "scheduled"
								: now >= test.startTime && now <= test.endTime
								? "in-progress"
								: "completed";

						const statusColors = {
							scheduled: "bg-yellow-100 text-yellow-800",
							"in-progress": "bg-green-100 text-green-800",
							completed: "bg-gray-100 text-gray-800",
						};

						return (
							<div
								key={`${test.id}-${status}`}
								className="p-6 hover:bg-white/5 transition-colors cursor-pointer"
								onClick={() => navigate(`/tests/${test.id}`)}
							>
								<div className="flex justify-between items-start mb-4">
									<div>
										<h3 className="text-lg font-medium text-white">
											{test.title}
										</h3>
										<p className="text-sm text-gray-300 mt-1">
											{test.description}
										</p>
									</div>
									<span
										className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
									>
										{status.charAt(0).toUpperCase() +
											status.slice(1)}
									</span>
								</div>

								<div className="flex flex-wrap gap-4 text-sm text-gray-500">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4" />
										<span>
											Start: {formatDate(test.startTime)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4" />
										<span>
											Duration: {test.duration} mins
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4" />
										<span>
											{test.questions?.length ?? 0}{" "}
											Questions
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
