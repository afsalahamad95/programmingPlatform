import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../api";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { TrendingUp, Users, CheckCircle, Clock } from "lucide-react";

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

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch all data in parallel
			const [
				testResultsData,
				challengeResultsData,
				studentsData,
				testsData,
				challengesData,
			] = await Promise.all([
				adminApi.getTestResults(),
				adminApi.getStudentResults(),
				adminApi.getStudentResults(), // We'll extract unique students from results
				adminApi.getTestResults(), // We'll extract unique tests from results
				adminApi.getStudentResults(), // We'll extract unique challenges from results
			]);

			setTestResults(testResultsData);
			setChallengeResults(challengeResultsData);

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

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">
				Loading...
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500 text-center p-4">{error}</div>;
	}

	// ─── Dashboard Stats ─────────────────────────────────────────────────────────
	const totalAttempts = filteredResults.length;
	const avgScore = totalAttempts > 0 
		? (filteredResults.reduce((acc, r) => acc + r.percentageScore, 0) / totalAttempts).toFixed(1)
		: 0;
	const passRate = totalAttempts > 0
		? ((filteredResults.filter(r => r.status === "Passed").length / totalAttempts) * 100).toFixed(1)
		: 0;

	const chartData = filteredResults.slice(0, 10).map((r, i) => ({
		name: (r as any).studentName.split(" ")[0],
		score: r.percentageScore,
	}));

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
				<div className="glass-card p-6 flex flex-col justify-center">
					<div className="h-16 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData}>
								<Bar dataKey="score">
									{chartData.map((_, index) => (
										<Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#818cf8" : "#34d399"} fillOpacity={0.6} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
					<p className="text-[10px] font-mono text-gray-500 text-center mt-2 uppercase tracking-tighter">Recent Performance Trend</p>
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

			<div className="overflow-x-auto glass-card rounded-lg border-none mt-6">
				<table className="min-w-full text-left border-collapse">
					<thead>
						<tr className="bg-white/5 border-b border-white/10 text-gray-300 uppercase tracking-wider text-sm font-medium">
							<th className="px-4 py-2">Student</th>
							<th className="px-4 py-2">
								{resultType === "test" ? "Test" : "Challenge"}
							</th>
							<th className="px-4 py-2">Status</th>
							<th className="px-4 py-2">Score</th>
							<th className="px-4 py-2">Time Spent</th>
							<th className="px-4 py-2">Submitted At</th>
							{resultType === "challenge" && (
								<th className="px-4 py-2">Test Cases</th>
							)}
							<th className="px-4 py-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredResults.map((result, index) => (
							<tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
								<td className="px-4 py-3">
									<div className="font-medium text-white">{result.studentName}</div>
									<div className="text-sm text-gray-400">
										{result.studentEmail}
									</div>
								</td>
								<td className="px-4 py-3 text-gray-300">
									{resultType === "test"
										? (result as TestResult).testTitle
										: (result as ChallengeResult)
											.challengeTitle}
								</td>
								<td className="px-4 py-2">
									<span
										className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm border ${result.status === "Passed"
											? "bg-green-900/40 text-green-300 border-green-500/30"
											: result.status === "Failed"
												? "bg-red-900/40 text-red-300 border-red-500/30"
												: "bg-yellow-900/40 text-yellow-300 border-yellow-500/30"
											}`}
									>
										{result.status}
									</span>
								</td>
								<td className="px-4 py-3 font-medium text-white">
									{result.pointsScored}/{result.totalPoints}
									<div className="text-sm font-normal text-gray-400">
										({result.percentageScore}%)
									</div>
								</td>
								<td className="px-4 py-3 text-gray-300">
									{formatTime(result.timeSpent)}
								</td>
								<td className="px-4 py-3 text-gray-400 text-sm">
									{new Date(
										result.submittedAt
									).toLocaleString()}
								</td>
								{resultType === "challenge" && (
									<td className="px-4 py-2">
										{(result as ChallengeResult).testCases?.passed || 0}/
										{(result as ChallengeResult).testCases?.total || 0}
									</td>
								)}
								<td className="px-4 py-3">
									<Link
										to={`/student-results/${(result as TestResult).id || index}`}
										className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest decoration-indigo-500/30 underline-offset-4 hover:underline"
									>
										View Details
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default StudentResults;
