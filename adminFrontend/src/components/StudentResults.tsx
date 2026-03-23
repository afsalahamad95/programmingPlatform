import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../api";
import {
	Tooltip,
	ResponsiveContainer,
	AreaChart,
	Area,
} from "recharts";
import { TrendingUp, Users, CheckCircle, BrainCircuit } from "lucide-react";

interface Student {
	id: string;
	name: string;
	email: string;
}

interface Test {
	id: string;
	title: string;
	totalPoints: number;
}

interface Challenge {
	id: string;
	title: string;
	totalPoints: number;
}

interface TestResult {
	id: string; // attemptId
	studentId: string;
	studentName: string;
	studentEmail: string;
	testId: string;
	testTitle: string;
	status: "Submitted" | "Passed" | "Failed";
	percentageScore: number;
	pointsScored: number;
	totalPoints: number;
	timeSpent: number; // in seconds
	submittedAt: string;
	answers: {
		questionId: string;
		questionType: "MCQ" | "Subjective" | "Coding";
		score: number;
		maxScore: number;
	}[];
}

interface ChallengeResult {
	studentId: string;
	studentName: string;
	studentEmail: string;
	challengeId: string;
	challengeTitle: string;
	status: "Submitted" | "Passed" | "Failed";
	percentageScore: number;
	pointsScored: number;
	totalPoints: number;
	timeSpent: number; // in seconds
	submittedAt: string;
	testCases: {
		passed: number;
		total: number;
	};
}

type ResultType = "test" | "challenge";

const StudentResults: React.FC = () => {
	const [resultType, setResultType] = useState<ResultType>("test");
	const [testResults, setTestResults] = useState<TestResult[]>([]);
	const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [tests, setTests] = useState<Test[]>([]);
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [selectedStudent, setSelectedStudent] = useState<string>("all");
	const [selectedItem, setSelectedItem] = useState<string>("all");
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

	const [analytics, setAnalytics] = useState<any>(null);

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch all data in parallel + new analytics
			const [
				testResultsData,
				challengeResultsData,
				analyticsData,
			] = await Promise.all([
				adminApi.getTestResults(),
				adminApi.getStudentResults(), // this seems to be challenge results actually based on original code
				adminApi.getTestResultsAnalytics(), // Our new Redis-cached lightning fast endpoint
			]);

			setTestResults(testResultsData);
			setChallengeResults(challengeResultsData);
			setAnalytics(analyticsData);

			// Extract unique students from results
			const uniqueStudents = new Map<string, Student>();
			[...testResultsData, ...challengeResultsData].forEach((result: any) => {
				if (!uniqueStudents.has(result.studentId)) {
					uniqueStudents.set(result.studentId, {
						id: result.studentId,
						name: result.studentName,
						email: result.studentEmail,
					});
				}
			});
			setStudents(Array.from(uniqueStudents.values()));

			// Extract unique tests from results
			const uniqueTests = new Map<string, Test>();
			testResultsData.forEach((result: TestResult) => {
				if (!uniqueTests.has(result.testId)) {
					uniqueTests.set(result.testId, {
						id: result.testId,
						title: result.testTitle,
						totalPoints: result.totalPoints,
					});
				}
			});
			setTests(Array.from(uniqueTests.values()));

			// Extract unique challenges from results
			const uniqueChallenges = new Map<string, Challenge>();
			challengeResultsData.forEach((result: ChallengeResult) => {
				if (!uniqueChallenges.has(result.challengeId)) {
					uniqueChallenges.set(result.challengeId, {
						id: result.challengeId,
						title: result.challengeTitle,
						totalPoints: result.totalPoints,
					});
				}
			});
			setChallenges(Array.from(uniqueChallenges.values()));
		} catch (err) {
			console.error("Error fetching data:", err);
			setError("Failed to load data. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		let intervalId: number | null = null;
		if (autoRefresh) {
			intervalId = window.setInterval(fetchData, 30000);
		}
		return () => {
			if (intervalId) window.clearInterval(intervalId);
		};
	}, [autoRefresh]);

	const filteredResults =
		resultType === "test"
			? testResults.filter((result) => {
				const studentMatch =
					selectedStudent === "all" ||
					result.studentId === selectedStudent;
				const itemMatch =
					selectedItem === "all" ||
					result.testId === selectedItem;
				return studentMatch && itemMatch;
			})
			: challengeResults.filter((result) => {
				const studentMatch =
					selectedStudent === "all" ||
					result.studentId === selectedStudent;
				const itemMatch =
					selectedItem === "all" ||
					result.challengeId === selectedItem;
				return studentMatch && itemMatch;
			});

	const formatTime = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	};

	const exportToCSV = () => {
		const headers = [
			"Student Name",
			"Student Email",
			resultType === "test" ? "Test Title" : "Challenge Title",
			"Status",
			"Score",
			"Time Spent",
			"Submitted At",
		];

		const csvData = filteredResults.map((result) => [
			result.studentName,
			result.studentEmail,
			resultType === "test"
				? (result as TestResult).testTitle
				: (result as ChallengeResult).challengeTitle,
			result.status,
			`${result.pointsScored}/${result.totalPoints} (${result.percentageScore}%)`,
			formatTime(result.timeSpent),
			new Date(result.submittedAt).toLocaleString(),
		]);

		const csvContent = [
			headers.join(","),
			...csvData.map((row) => row.join(",")),
		].join("\n");

		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${resultType}-results-${new Date().toISOString().split("T")[0]
			}.csv`;
		link.click();
	};

	if (loading && !testResults.length) {
		return (
			<div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
				<div className="relative w-24 h-24">
					<div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
					<div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
					<div className="absolute inset-2 border-4 border-purple-500/20 rounded-full"></div>
					<div className="absolute inset-2 border-4 border-purple-500 rounded-full border-b-transparent animate-spin-slow"></div>
					<div className="absolute inset-0 flex items-center justify-center">
						<BrainCircuit className="w-8 h-8 text-indigo-400 animate-pulse" />
					</div>
				</div>
				<h3 className="mt-6 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Loading Neural Analytics</h3>
				<p className="text-gray-400 text-sm mt-2">Connecting to cache nodes...</p>
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500 text-center p-4">{error}</div>;
	}

	// ─── Dashboard Stats (Powered by Analytics API) ─────────────────────────────────────────────────────────
	const totalAttempts = analytics?.totalAttempts || 0;
	const avgScore = analytics?.avgScore || 0;
	const passRate = analytics?.passRate || 0;

	// Reverse the timeSeries so oldest is first for the chart, but only if it exists
	const chartData = analytics?.timeSeries ? [...analytics.timeSeries].reverse() : [];

	return (
		<div className="container mx-auto px-4 py-8 text-gray-200">
			{/* Dashboard Summary */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div className="glass-card p-6 flex items-center space-x-4">
					<div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
						<Users className="text-indigo-400 w-6 h-6" />
					</div>
					<div>
						<p className="text-xs font-mono text-indigo-400/70 uppercase tracking-widest">Total Attempts</p>
						<h3 className="text-2xl font-bold text-white">{totalAttempts}</h3>
					</div>
				</div>
				<div className="glass-card p-6 flex items-center space-x-4">
					<div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
						<TrendingUp className="text-emerald-400 w-6 h-6" />
					</div>
					<div>
						<p className="text-xs font-mono text-emerald-400/70 uppercase tracking-widest">Avg. Score</p>
						<h3 className="text-2xl font-bold text-white">{avgScore}%</h3>
					</div>
				</div>
				<div className="glass-card p-6 flex items-center space-x-4">
					<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
						<CheckCircle className="text-blue-400 w-6 h-6" />
					</div>
					<div>
						<p className="text-xs font-mono text-blue-400/70 uppercase tracking-widest">Pass Rate</p>
						<h3 className="text-2xl font-bold text-white">{passRate}%</h3>
					</div>
				</div>
				<div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden group">
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div className="h-16 w-full relative z-10">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData}>
								<defs>
									<linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
										<stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
									</linearGradient>
								</defs>
								<Tooltip
									contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}
									itemStyle={{ color: '#818cf8' }}
									labelStyle={{ color: '#9ca3af' }}
								/>
								<Area type="monotone" dataKey="avgScore" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
					<p className="text-[10px] font-mono text-indigo-400/70 text-center mt-2 uppercase tracking-tighter">Daily Average Performance</p>
				</div>
			</div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-white tracking-wide">Student Results</h1>
				<div className="space-x-4">
					<button
						onClick={exportToCSV}
						className="bg-purple-600/50 text-white border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] px-4 py-2 rounded hover:bg-purple-600/70 transition-colors"
					>
						Export to CSV
					</button>
					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
							className="form-checkbox"
						/>
						<span>Auto-refresh</span>
					</label>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Result Type
					</label>
					<select
						value={resultType}
						onChange={(e) => {
							setResultType(e.target.value as ResultType);
							setSelectedItem("all");
						}}
						className="glass-input w-full p-2 rounded"
					>
						<option value="test">Tests</option>
						<option value="challenge">Challenges</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Filter by Student
					</label>
					<select
						value={selectedStudent}
						onChange={(e) => setSelectedStudent(e.target.value)}
						className="glass-input w-full p-2 rounded"
					>
						<option value="all">All Students</option>
						{students.map((student) => (
							<option key={student.id} value={student.id}>
								{student.name}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Filter by {resultType === "test" ? "Test" : "Challenge"}
					</label>
					<select
						value={selectedItem}
						onChange={(e) => setSelectedItem(e.target.value)}
						className="glass-input w-full p-2 rounded"
					>
						<option value="all">
							All {resultType === "test" ? "Tests" : "Challenges"}
						</option>
						{(resultType === "test" ? tests : challenges).map(
							(item) => (
								<option key={item.id} value={item.id}>
									{item.title}
								</option>
							)
						)}
					</select>
				</div>
			</div>

			<div className="overflow-hidden glass-card rounded-xl mt-6 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
				<div className="overflow-x-auto">
					<table className="min-w-full text-left border-collapse">
						<thead>
							<tr className="bg-white/[0.02] border-b border-white/10 text-indigo-300 uppercase tracking-wider text-xs font-bold">
								<th className="px-6 py-4">Student</th>
								<th className="px-6 py-4">
									{resultType === "test" ? "Test" : "Challenge"}
								</th>
								<th className="px-6 py-4">Status</th>
								<th className="px-6 py-4">Score</th>
								<th className="px-6 py-4">Time Spent</th>
								<th className="px-6 py-4">Submitted At</th>
								{resultType === "challenge" && (
									<th className="px-6 py-4">Test Cases</th>
								)}
								<th className="px-6 py-4 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
						{filteredResults.map((result, index) => (
							<tr key={index} className="hover:bg-white/[0.03] transition-colors group">
								<td className="px-6 py-4">
									<div className="flex items-center space-x-3">
										<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
											{result.studentName.charAt(0)}
										</div>
										<div>
											<div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{result.studentName}</div>
											<div className="text-xs text-gray-400 font-mono">
												{result.studentEmail}
											</div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 text-gray-300 font-medium">
									{resultType === "test"
										? (result as TestResult).testTitle
										: (result as ChallengeResult)
											.challengeTitle}
								</td>
								<td className="px-6 py-4">
									<span
										className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-[0_0_10px_rgba(0,0,0,0.2)] ${result.status === "Passed"
											? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10"
											: result.status === "Failed"
												? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10"
												: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10"
											}`}
									>
										<span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${result.status === "Passed" ? "bg-emerald-400" : result.status === "Failed" ? "bg-rose-400" : "bg-amber-400"}`}></span>
										{result.status}
									</span>
								</td>
								<td className="px-6 py-4">
									<div className="flex flex-col gap-1 w-full max-w-[120px]">
										<div className="flex justify-between items-end">
											<span className="font-bold text-white text-sm">
												{result.pointsScored}/{result.totalPoints}
											</span>
											<span className={`text-xs font-mono font-bold ${result.percentageScore >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
												{result.percentageScore}%
											</span>
										</div>
										<div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
											<div 
												className={`h-1.5 rounded-full transition-all duration-1000 ${result.percentageScore >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_theme(colors.emerald.500)]' : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_theme(colors.rose.500)]'}`} 
												style={{ width: `${result.percentageScore}%` }}
											></div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 text-gray-300 text-sm font-mono">
									{formatTime(result.timeSpent)}
								</td>
								<td className="px-6 py-4 text-gray-400 text-sm">
									{new Date(
										result.submittedAt
									).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
								</td>
								{resultType === "challenge" && (
									<td className="px-6 py-4">
										<div className="flex items-center space-x-2">
											<div className="font-mono text-sm text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
												{(result as ChallengeResult).testCases?.passed || 0}/
												{(result as ChallengeResult).testCases?.total || 0}
											</div>
										</div>
									</td>
								)}
								<td className="px-6 py-4 text-right">
									<Link
										to={`/student-results/${(result as TestResult).id || index}`}
										className="inline-flex items-center px-3 py-1.5 border border-indigo-500/50 rounded text-xs font-bold text-indigo-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all uppercase tracking-widest"
									>
										View
									</Link>
								</td>
							</tr>
						))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default StudentResults;
