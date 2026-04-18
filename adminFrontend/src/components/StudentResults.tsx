import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import {
	Tooltip,
	ResponsiveContainer,
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	PieChart,
	Pie,
	Cell,
	RadarChart,
	Radar,
	PolarGrid,
	PolarAngleAxis,
	LineChart,
	Line,
	Legend,
} from "recharts";
import {
	TrendingUp,
	Users,
	CheckCircle,
	BrainCircuit,
	Trophy,
	Clock,
	BarChart2,
	Activity,
	Target,
	Download,
	RefreshCw,
	Medal,
	Sparkles,
	Loader2,
	AlertTriangle,
	ArrowUpRight,
	ArrowDownRight,
	Minus,
	Lightbulb,
	ShieldAlert,
	Star,
	BookOpen,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

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
	id: string;
	studentId: string;
	studentName: string;
	studentEmail: string;
	testId: string;
	testTitle: string;
	status: "Submitted" | "Passed" | "Failed";
	percentageScore: number;
	pointsScored: number;
	totalPoints: number;
	timeSpent: number;
	submittedAt: string;
	answers: { questionId: string; questionType: string; score: number; maxScore: number }[];
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
	timeSpent: number;
	submittedAt: string;
	testCases: { passed: number; total: number };
}

interface Analytics {
	totalAttempts: number;
	avgScore: number;
	passRate: number;
	passCount: number;
	failCount: number;
	submittedCount: number;
	avgTimeSpent: number;
	uniqueStudents: number;
	uniqueTests: number;
	scoreDistribution: { range: string; count: number }[];
	typeDistribution: { type: string; count: number }[];
	hourlyHeatmap: { hour: number; count: number }[];
	timeSeries: { date: string; attempts: number; avgScore: number }[];
	weeklyTimeSeries: { week: string; attempts: number; avgScore: number }[];
	testBreakdown: { testId: string; title: string; attempts: number; avgScore: number; passRate: number; avgTime: number }[];
	studentBreakdown: { studentId: string; name: string; email: string; attempts: number; avgScore: number; bestScore: number; avgTime: number }[];
	leaderboard: { studentId: string; name: string; email: string; attempts: number; avgScore: number; bestScore: number }[];
	hardestQuestions: { questionId: string; total: number; correct: number; difficulty: number }[];
	generatedAt: string;
}

type ResultType = "test" | "challenge";
type ActiveTab = "overview" | "results" | "leaderboard" | "tests" | "difficulty" | "ai_insights";

interface AIInsights {
	summary: string;
	key_insights: string[];
	risk_students: string[];
	top_performers: string[];
	hardest_content: string[];
	recommendations: string[];
	trend: "improving" | "declining" | "stable";
	trend_explanation: string;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#818cf8", "#34d399", "#f472b6", "#fb923c", "#38bdf8", "#a78bfa"];
const PIE_COLORS = ["#818cf8", "#f472b6", "#fb923c"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const statusBadge = (status: string) => {
	if (status === "Passed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
	if (status === "Failed") return "bg-rose-500/10 text-rose-400 border-rose-500/30";
	return "bg-amber-500/10 text-amber-400 border-amber-500/30";
};

const medalColor = (rank: number) => {
	if (rank === 1) return "text-yellow-400";
	if (rank === 2) return "text-gray-300";
	if (rank === 3) return "text-amber-600";
	return "text-gray-500";
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
	icon: React.ElementType;
	label: string;
	value: string | number;
	color: string;
	sub?: string;
}> = ({ icon: Icon, label, value, color, sub }) => (
	<div className="glass-card p-5 flex items-center space-x-4">
		<div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
			<Icon className="w-5 h-5" />
		</div>
		<div className="min-w-0">
			<p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 truncate">{label}</p>
			<h3 className="text-2xl font-bold text-white leading-tight">{value}</h3>
			{sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
		</div>
	</div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const StudentResults: React.FC = () => {
	const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
	const [resultType, setResultType] = useState<ResultType>("test");
	const [testResults, setTestResults] = useState<TestResult[]>([]);
	const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [tests, setTests] = useState<Test[]>([]);
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [selectedStudent, setSelectedStudent] = useState("all");
	const [selectedItem, setSelectedItem] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [analytics, setAnalytics] = useState<Analytics | null>(null);
	const [timeRange, setTimeRange] = useState<"daily" | "weekly">("daily");
	const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
	const [aiLoading, setAILoading] = useState(false);
	const [aiError, setAIError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const [testResultsData, challengeResultsData, analyticsData] = await Promise.all([
				adminApi.getTestResults(),
				adminApi.getStudentResults(),
				adminApi.getTestResultsAnalytics(),
			]);

			setTestResults(testResultsData);
			setChallengeResults(challengeResultsData);
			setAnalytics(analyticsData);

			const uniqueStudents = new Map<string, Student>();
			[...testResultsData, ...challengeResultsData].forEach((r: TestResult | ChallengeResult) => {
				if (!uniqueStudents.has(r.studentId)) {
					uniqueStudents.set(r.studentId, { id: r.studentId, name: r.studentName, email: r.studentEmail });
				}
			});
			setStudents(Array.from(uniqueStudents.values()));

			const uniqueTests = new Map<string, Test>();
			testResultsData.forEach((r: TestResult) => {
				if (!uniqueTests.has(r.testId)) {
					uniqueTests.set(r.testId, { id: r.testId, title: r.testTitle, totalPoints: r.totalPoints });
				}
			});
			setTests(Array.from(uniqueTests.values()));

			const uniqueChallenges = new Map<string, Challenge>();
			challengeResultsData.forEach((r: ChallengeResult) => {
				if (!uniqueChallenges.has(r.challengeId)) {
					uniqueChallenges.set(r.challengeId, { id: r.challengeId, title: r.challengeTitle, totalPoints: r.totalPoints });
				}
			});
			setChallenges(Array.from(uniqueChallenges.values()));
		} catch (err) {
			console.error("Error fetching data:", err);
			setError("Failed to load analytics. Please try again.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchData(); }, [fetchData]);

	useEffect(() => {
		if (!autoRefresh) return;
		const id = window.setInterval(fetchData, 30_000);
		return () => clearInterval(id);
	}, [autoRefresh, fetchData]);

	const filteredResults =
		resultType === "test"
			? testResults.filter(r => (selectedStudent === "all" || r.studentId === selectedStudent) && (selectedItem === "all" || r.testId === selectedItem))
			: challengeResults.filter(r => (selectedStudent === "all" || r.studentId === selectedStudent) && (selectedItem === "all" || (r as ChallengeResult).challengeId === selectedItem));

	const exportToCSV = () => {
		const headers = ["Student Name", "Student Email", resultType === "test" ? "Test" : "Challenge", "Status", "Score", "Time Spent", "Submitted At"];
		const rows = filteredResults.map(r => [
			r.studentName,
			r.studentEmail,
			resultType === "test" ? (r as TestResult).testTitle : (r as ChallengeResult).challengeTitle,
			r.status,
			`${r.pointsScored}/${r.totalPoints} (${r.percentageScore}%)`,
			formatTime(r.timeSpent),
			new Date(r.submittedAt).toLocaleString(),
		]);
		const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${resultType}-results-${new Date().toISOString().split("T")[0]}.csv`;
		link.click();
	};

	const generateAIInsights = async () => {
		if (!analytics) return;
		setAILoading(true);
		setAIError(null);
		try {
			const payload = {
				total_attempts:    analytics.totalAttempts,
				avg_score:         analytics.avgScore,
				pass_rate:         analytics.passRate,
				unique_students:   analytics.uniqueStudents,
				unique_tests:      analytics.uniqueTests,
				score_distribution: analytics.scoreDistribution,
				test_breakdown:    analytics.testBreakdown,
				student_breakdown: analytics.studentBreakdown,
				hardest_questions: analytics.hardestQuestions,
				type_distribution: analytics.typeDistribution,
			};
			const data = await adminApi.getAIInsights(payload);
			setAIInsights(data);
		} catch (e: any) {
			setAIError(e?.response?.data?.detail || e.message || "Failed to generate insights.");
		} finally {
			setAILoading(false);
		}
	};

	// ── Loading state ─────────────────────────────────────────────────────────
	if (loading && !testResults.length) {
		return (
			<div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
				<div className="relative w-24 h-24">
					<div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
					<div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
					<div className="absolute inset-2 border-4 border-purple-500/20 rounded-full" />
					<div className="absolute inset-2 border-4 border-purple-500 rounded-full border-b-transparent animate-spin-slow" />
					<div className="absolute inset-0 flex items-center justify-center">
						<BrainCircuit className="w-8 h-8 text-indigo-400 animate-pulse" />
					</div>
				</div>
				<h3 className="mt-6 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Loading Analytics</h3>
				<p className="text-gray-400 text-sm mt-2">Aggregating platform data…</p>
			</div>
		);
	}

	if (error) return <div className="text-red-400 text-center p-8">{error}</div>;

	const chartTimeSeries = timeRange === "daily"
		? (analytics?.timeSeries ?? [])
		: (analytics?.weeklyTimeSeries ?? []).map(w => ({ ...w, date: w.week }));

	// ── Tab Navigation ────────────────────────────────────────────────────────
	const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
		{ id: "overview", label: "Overview", icon: BarChart2 },
		{ id: "results", label: "Results", icon: Activity },
		{ id: "leaderboard", label: "Leaderboard", icon: Trophy },
		{ id: "tests", label: "Test Analysis", icon: Target },
		{ id: "difficulty", label: "Difficulty", icon: BrainCircuit },
		{ id: "ai_insights", label: "AI Insights", icon: Sparkles },
	];

	return (
		<div className="container mx-auto px-4 py-6 text-gray-200 max-w-screen-2xl">
			{/* ── Header ── */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-white tracking-wide">Analytics Dashboard</h1>
					{analytics?.generatedAt && (
						<p className="text-xs text-gray-500 font-mono mt-0.5">
							Updated {new Date(analytics.generatedAt).toLocaleTimeString()}
						</p>
					)}
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchData}
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/50 text-sm transition-colors"
					>
						<RefreshCw className="w-3.5 h-3.5" /> Refresh
					</button>
					<label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
						<div
							onClick={() => setAutoRefresh(v => !v)}
							className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? "bg-indigo-500" : "bg-gray-700"}`}
						>
							<span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoRefresh ? "translate-x-4" : ""}`} />
						</div>
						Auto-refresh
					</label>
				</div>
			</div>

			{/* ── Top Stats ── */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
				<StatCard icon={Activity} label="Total Attempts" value={analytics?.totalAttempts ?? 0} color="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" />
				<StatCard icon={TrendingUp} label="Avg. Score" value={`${analytics?.avgScore ?? 0}%`} color="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" />
				<StatCard icon={CheckCircle} label="Pass Rate" value={`${analytics?.passRate ?? 0}%`} color="bg-blue-500/20 text-blue-400 border border-blue-500/30" sub={`${analytics?.passCount ?? 0} passed`} />
				<StatCard icon={Users} label="Students" value={analytics?.uniqueStudents ?? 0} color="bg-purple-500/20 text-purple-400 border border-purple-500/30" sub={`${analytics?.uniqueTests ?? 0} tests`} />
				<StatCard icon={Clock} label="Avg. Time" value={formatTime(analytics?.avgTimeSpent ?? 0)} color="bg-rose-500/20 text-rose-400 border border-rose-500/30" />
			</div>

			{/* ── Tab Bar ── */}
			<div className="flex gap-1 mb-6 bg-white/[0.02] rounded-xl p-1 border border-white/5 overflow-x-auto">
				{tabs.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						onClick={() => setActiveTab(id)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
							activeTab === id
								? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
								: "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
						}`}
					>
						<Icon className="w-4 h-4" />
						{label}
					</button>
				))}
			</div>

			{/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
			{activeTab === "overview" && (
				<div className="space-y-6">
					{/* Time range toggle + trend chart */}
					<div className="glass-card p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="font-semibold text-white">Performance Trend</h2>
							<div className="flex gap-1 text-xs bg-white/[0.04] rounded-lg p-0.5 border border-white/10">
								<button onClick={() => setTimeRange("daily")} className={`px-3 py-1 rounded-md transition-colors ${timeRange === "daily" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>Daily</button>
								<button onClick={() => setTimeRange("weekly")} className={`px-3 py-1 rounded-md transition-colors ${timeRange === "weekly" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>Weekly</button>
							</div>
						</div>
						<ResponsiveContainer width="100%" height={220}>
							<AreaChart data={chartTimeSeries}>
								<defs>
									<linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#818cf8" stopOpacity={0.6} />
										<stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
									</linearGradient>
									<linearGradient id="gAttempts" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
										<stop offset="95%" stopColor="#34d399" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
								<XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
								<YAxis yAxisId="score" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
								<YAxis yAxisId="attempts" orientation="right" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
								<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#e5e7eb" }} labelStyle={{ color: "#9ca3af" }} />
								<Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
								<Area yAxisId="score" type="monotone" dataKey="avgScore" name="Avg Score (%)" stroke="#818cf8" strokeWidth={2} fill="url(#gScore)" />
								<Area yAxisId="attempts" type="monotone" dataKey="attempts" name="Attempts" stroke="#34d399" strokeWidth={2} fill="url(#gAttempts)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>

					{/* 2-column: score distribution + question type */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="glass-card p-6">
							<h2 className="font-semibold text-white mb-4">Score Distribution</h2>
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={analytics?.scoreDistribution ?? []}>
									<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
									<XAxis dataKey="range" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
									<YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
									<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
									<Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
										{(analytics?.scoreDistribution ?? []).map((_, i) => (
											<Cell key={i} fill={i >= 7 ? "#34d399" : i >= 4 ? "#818cf8" : "#f472b6"} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>

						<div className="glass-card p-6">
							<h2 className="font-semibold text-white mb-4">Question Type Breakdown</h2>
							<div className="flex items-center justify-center gap-8">
								<ResponsiveContainer width={180} height={180}>
									<PieChart>
										<Pie data={analytics?.typeDistribution ?? []} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
											{(analytics?.typeDistribution ?? []).map((_, i) => (
												<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
											))}
										</Pie>
										<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
									</PieChart>
								</ResponsiveContainer>
								<div className="space-y-3">
									{(analytics?.typeDistribution ?? []).map((item, i) => (
										<div key={item.type} className="flex items-center gap-3">
											<div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
											<span className="text-sm text-gray-300 w-24">{item.type}</span>
											<span className="font-mono text-sm font-bold text-white">{item.count}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Hourly Activity Heatmap */}
					<div className="glass-card p-6">
						<h2 className="font-semibold text-white mb-4">Submission Activity by Hour</h2>
						<div className="flex items-end gap-1 h-16">
							{(analytics?.hourlyHeatmap ?? []).map(({ hour, count }) => {
								const maxCount = Math.max(...(analytics?.hourlyHeatmap ?? []).map(h => h.count), 1);
								const pct = count / maxCount;
								return (
									<div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
										<div
											className="w-full rounded-t transition-all"
											style={{ height: `${Math.max(4, pct * 56)}px`, background: `rgba(129,140,248,${0.15 + pct * 0.85})` }}
										/>
										<span className="text-[9px] text-gray-600 group-hover:text-gray-400 transition-colors">{hour}</span>
										{/* Tooltip */}
										<div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
											{count} submissions
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Pass/Fail/Submitted breakdown */}
					<div className="grid grid-cols-3 gap-4">
						{[
							{ label: "Passed", count: analytics?.passCount ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
							{ label: "Failed", count: analytics?.failCount ?? 0, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
							{ label: "Submitted", count: analytics?.submittedCount ?? 0, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
						].map(({ label, count, color, bg }) => (
							<div key={label} className={`glass-card p-5 border ${bg} flex justify-between items-center`}>
								<span className="text-sm font-medium text-gray-300">{label}</span>
								<span className={`text-2xl font-bold ${color}`}>{count}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ═══════════════════ RESULTS TAB ═══════════════════ */}
			{activeTab === "results" && (
				<div className="space-y-4">
					{/* Filters */}
					<div className="glass-card p-4">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div>
								<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Type</label>
								<select value={resultType} onChange={e => { setResultType(e.target.value as ResultType); setSelectedItem("all"); }} className="glass-input w-full p-2 rounded-lg text-sm">
									<option value="test">Tests</option>
									<option value="challenge">Challenges</option>
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Student</label>
								<select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm">
									<option value="all">All Students</option>
									{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{resultType === "test" ? "Test" : "Challenge"}</label>
								<select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm">
									<option value="all">All</option>
									{(resultType === "test" ? tests : challenges).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
								</select>
							</div>
							<div className="flex items-end">
								<button onClick={exportToCSV} className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-purple-600/40 border border-purple-500/40 rounded-lg text-sm text-purple-300 hover:bg-purple-600/60 transition-colors">
									<Download className="w-4 h-4" /> Export CSV
								</button>
							</div>
						</div>
					</div>

					<div className="text-xs text-gray-500 font-mono">
						Showing {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
					</div>

					<div className="overflow-hidden glass-card rounded-xl border border-white/5">
						<div className="overflow-x-auto">
							<table className="min-w-full text-left border-collapse">
								<thead>
									<tr className="bg-white/[0.02] border-b border-white/10 text-indigo-300 uppercase tracking-wider text-[11px] font-bold">
										<th className="px-5 py-3.5">Student</th>
										<th className="px-5 py-3.5">{resultType === "test" ? "Test" : "Challenge"}</th>
										<th className="px-5 py-3.5">Status</th>
										<th className="px-5 py-3.5">Score</th>
										<th className="px-5 py-3.5">Time</th>
										<th className="px-5 py-3.5">Submitted</th>
										{resultType === "challenge" && <th className="px-5 py-3.5">Test Cases</th>}
										<th className="px-5 py-3.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{filteredResults.map((result, index) => (
										<tr key={index} className="hover:bg-white/[0.025] transition-colors group">
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
														{result.studentName.charAt(0).toUpperCase()}
													</div>
													<div>
														<div className="font-medium text-white text-sm group-hover:text-indigo-300 transition-colors">{result.studentName}</div>
														<div className="text-[11px] text-gray-500 font-mono">{result.studentEmail}</div>
													</div>
												</div>
											</td>
											<td className="px-5 py-3.5 text-gray-300 text-sm">
												{resultType === "test" ? (result as TestResult).testTitle : (result as ChallengeResult).challengeTitle}
											</td>
											<td className="px-5 py-3.5">
												<span className={`px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border ${statusBadge(result.status)}`}>
													<span className={`w-1.5 h-1.5 rounded-full animate-pulse ${result.status === "Passed" ? "bg-emerald-400" : result.status === "Failed" ? "bg-rose-400" : "bg-amber-400"}`} />
													{result.status}
												</span>
											</td>
											<td className="px-5 py-3.5">
												<div className="flex flex-col gap-1 w-28">
													<div className="flex justify-between text-xs">
														<span className="font-bold text-white">{result.pointsScored}/{result.totalPoints}</span>
														<span className={`font-mono font-bold ${result.percentageScore >= 70 ? "text-emerald-400" : "text-rose-400"}`}>{result.percentageScore}%</span>
													</div>
													<div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
														<div
															className={`h-1.5 rounded-full ${result.percentageScore >= 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-rose-500 to-rose-400"}`}
															style={{ width: `${result.percentageScore}%` }}
														/>
													</div>
												</div>
											</td>
											<td className="px-5 py-3.5 text-gray-400 text-sm font-mono">{formatTime(result.timeSpent)}</td>
											<td className="px-5 py-3.5 text-gray-400 text-sm">
												{new Date(result.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
											</td>
											{resultType === "challenge" && (
												<td className="px-5 py-3.5">
													<span className="font-mono text-sm text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
														{(result as ChallengeResult).testCases?.passed ?? 0}/{(result as ChallengeResult).testCases?.total ?? 0}
													</span>
												</td>
											)}
											<td className="px-5 py-3.5 text-right">
												<Link
													to={`/student-results/${(result as TestResult).id || index}`}
													className="inline-flex items-center px-3 py-1 border border-indigo-500/40 rounded text-xs font-bold text-indigo-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all"
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
			)}

			{/* ═══════════════════ LEADERBOARD TAB ═══════════════════ */}
			{activeTab === "leaderboard" && (
				<div className="space-y-4">
					<div className="glass-card rounded-xl border border-white/5 overflow-hidden">
						<div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
							<Trophy className="w-5 h-5 text-yellow-400" />
							<h2 className="font-semibold text-white">Top Performers</h2>
						</div>
						<div className="divide-y divide-white/5">
							{(analytics?.leaderboard ?? []).map((student, i) => (
								<div key={student.studentId} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.025] transition-colors">
									<div className="w-8 text-center">
										{i < 3 ? (
											<Medal className={`w-5 h-5 mx-auto ${medalColor(i + 1)}`} />
										) : (
											<span className="text-gray-500 font-mono text-sm font-bold">#{i + 1}</span>
										)}
									</div>
									<div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
										{student.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-white text-sm truncate">{student.name}</div>
										<div className="text-[11px] text-gray-500 font-mono truncate">{student.email}</div>
									</div>
									<div className="flex items-center gap-6 text-sm">
										<div className="text-center">
											<div className="text-[10px] text-gray-500 uppercase tracking-wide">Avg</div>
											<div className={`font-bold font-mono ${student.avgScore >= 70 ? "text-emerald-400" : "text-rose-400"}`}>{student.avgScore}%</div>
										</div>
										<div className="text-center">
											<div className="text-[10px] text-gray-500 uppercase tracking-wide">Best</div>
											<div className="font-bold font-mono text-indigo-400">{student.bestScore}%</div>
										</div>
										<div className="text-center">
											<div className="text-[10px] text-gray-500 uppercase tracking-wide">Attempts</div>
											<div className="font-bold text-gray-300">{student.attempts}</div>
										</div>
										{/* Score bar */}
										<div className="w-24 hidden md:block">
											<div className="w-full bg-gray-700/50 rounded-full h-1.5">
												<div
													className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
													style={{ width: `${student.avgScore}%` }}
												/>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Per-student avg score bar chart */}
					<div className="glass-card p-6">
						<h2 className="font-semibold text-white mb-4">Student Average Score Comparison</h2>
						<ResponsiveContainer width="100%" height={Math.max(200, (analytics?.leaderboard?.length ?? 0) * 36)}>
							<BarChart layout="vertical" data={analytics?.leaderboard ?? []} margin={{ left: 80 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
								<XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
								<YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} width={80} tickLine={false} axisLine={false} />
								<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${v}%`, "Avg Score"]} />
								<Bar dataKey="avgScore" name="Avg Score (%)" radius={[0, 4, 4, 0]}>
									{(analytics?.leaderboard ?? []).map((_, i) => (
										<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* ═══════════════════ TESTS TAB ═══════════════════ */}
			{activeTab === "tests" && (
				<div className="space-y-6">
					<div className="glass-card rounded-xl border border-white/5 overflow-hidden">
						<div className="px-6 py-4 border-b border-white/5">
							<h2 className="font-semibold text-white">Test Performance Breakdown</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left border-collapse">
								<thead>
									<tr className="bg-white/[0.02] border-b border-white/10 text-indigo-300 uppercase tracking-wider text-[11px] font-bold">
										<th className="px-5 py-3.5">Test Title</th>
										<th className="px-5 py-3.5">Attempts</th>
										<th className="px-5 py-3.5">Avg Score</th>
										<th className="px-5 py-3.5">Pass Rate</th>
										<th className="px-5 py-3.5">Avg Time</th>
										<th className="px-5 py-3.5">Trend</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{(analytics?.testBreakdown ?? []).map((test) => (
										<tr key={test.testId} className="hover:bg-white/[0.025] transition-colors">
											<td className="px-5 py-3.5 font-medium text-white text-sm">{test.title}</td>
											<td className="px-5 py-3.5 text-gray-300 font-mono text-sm">{test.attempts}</td>
											<td className="px-5 py-3.5">
												<span className={`font-bold font-mono text-sm ${test.avgScore >= 70 ? "text-emerald-400" : "text-rose-400"}`}>{test.avgScore}%</span>
											</td>
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-2">
													<span className={`font-bold font-mono text-sm ${test.passRate >= 70 ? "text-emerald-400" : "text-amber-400"}`}>{test.passRate}%</span>
													<div className="w-16 bg-gray-700/50 rounded-full h-1.5 hidden sm:block">
														<div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${test.passRate}%` }} />
													</div>
												</div>
											</td>
											<td className="px-5 py-3.5 text-gray-400 text-sm font-mono">{formatTime(test.avgTime)}</td>
											<td className="px-5 py-3.5">
												{/* Mini score bar */}
												<div className="w-20 bg-gray-700/50 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${test.avgScore >= 70 ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
														style={{ width: `${test.avgScore}%` }}
													/>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Test comparison bar chart */}
					<div className="glass-card p-6">
						<h2 className="font-semibold text-white mb-4">Test Pass Rate Comparison</h2>
						<ResponsiveContainer width="100%" height={220}>
							<BarChart data={analytics?.testBreakdown ?? []}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
								<XAxis dataKey="title" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
								<YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
								<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${v}%`]} />
								<Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
								<Bar dataKey="avgScore" name="Avg Score (%)" fill="#818cf8" radius={[4, 4, 0, 0]} />
								<Bar dataKey="passRate" name="Pass Rate (%)" fill="#34d399" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* ═══════════════════ DIFFICULTY TAB ═══════════════════ */}
			{activeTab === "difficulty" && (
				<div className="space-y-6">
					<div className="glass-card rounded-xl border border-white/5 overflow-hidden">
						<div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
							<BrainCircuit className="w-5 h-5 text-rose-400" />
							<div>
								<h2 className="font-semibold text-white">Hardest Questions</h2>
								<p className="text-xs text-gray-500 mt-0.5">Questions with the lowest correct-answer rate</p>
							</div>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left border-collapse">
								<thead>
									<tr className="bg-white/[0.02] border-b border-white/10 text-indigo-300 uppercase tracking-wider text-[11px] font-bold">
										<th className="px-5 py-3.5">Question ID</th>
										<th className="px-5 py-3.5">Attempts</th>
										<th className="px-5 py-3.5">Correct</th>
										<th className="px-5 py-3.5">Success Rate</th>
										<th className="px-5 py-3.5">Difficulty</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{(analytics?.hardestQuestions ?? []).map((q) => {
										const pct = Math.round(q.difficulty * 100);
										const diffLabel = pct < 30 ? "Hard" : pct < 60 ? "Medium" : "Easy";
										const diffColor = pct < 30 ? "text-rose-400" : pct < 60 ? "text-amber-400" : "text-emerald-400";
										return (
											<tr key={q.questionId} className="hover:bg-white/[0.025] transition-colors">
												<td className="px-5 py-3.5 font-mono text-xs text-gray-400">{q.questionId.slice(-8)}…</td>
												<td className="px-5 py-3.5 text-gray-300 font-mono text-sm">{q.total}</td>
												<td className="px-5 py-3.5 text-emerald-400 font-mono text-sm">{q.correct}</td>
												<td className="px-5 py-3.5">
													<div className="flex items-center gap-2">
														<span className={`font-bold font-mono text-sm ${diffColor}`}>{pct}%</span>
														<div className="w-20 bg-gray-700/50 rounded-full h-1.5 hidden sm:block">
															<div className={`h-1.5 rounded-full ${pct < 30 ? "bg-rose-500" : pct < 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
														</div>
													</div>
												</td>
												<td className="px-5 py-3.5">
													<span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${pct < 30 ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : pct < 60 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
														{diffLabel}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* Success rate radar — top 6 questions */}
					{(analytics?.hardestQuestions?.length ?? 0) > 0 && (
						<div className="glass-card p-6">
							<h2 className="font-semibold text-white mb-4">Question Success Rate Radar (Top 10)</h2>
							<ResponsiveContainer width="100%" height={300}>
								<RadarChart data={(analytics?.hardestQuestions ?? []).map(q => ({ subject: q.questionId.slice(-6), rate: Math.round(q.difficulty * 100) }))}>
									<PolarGrid stroke="rgba(255,255,255,0.08)" />
									<PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 10 }} />
									<Radar name="Success Rate (%)" dataKey="rate" stroke="#818cf8" fill="#818cf8" fillOpacity={0.2} />
									<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${v}%`, "Success Rate"]} />
								</RadarChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* Student comparison line chart */}
					{(analytics?.studentBreakdown?.length ?? 0) > 1 && (
						<div className="glass-card p-6">
							<h2 className="font-semibold text-white mb-4">Student Attempt Count vs Avg Score</h2>
							<ResponsiveContainer width="100%" height={220}>
								<LineChart data={analytics?.studentBreakdown?.slice(0, 15) ?? []}>
									<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
									<XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
									<YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
									<Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
									<Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
									<Line type="monotone" dataKey="avgScore" name="Avg Score (%)" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
									<Line type="monotone" dataKey="bestScore" name="Best Score (%)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
								</LineChart>
							</ResponsiveContainer>
						</div>
					)}
				</div>
			)}

			{/* ═══════════════════ AI INSIGHTS TAB ═══════════════════ */}
			{activeTab === "ai_insights" && (
				<div className="space-y-6">
					{/* Generate button */}
					{!aiInsights && (
						<div className="glass-card p-10 flex flex-col items-center text-center gap-6">
							<div className="relative">
								<div className="absolute inset-0 bg-indigo-600/20 rounded-full blur-2xl" />
								<div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center">
									<BrainCircuit className="w-10 h-10 text-indigo-400" />
								</div>
							</div>
							<div>
								<h2 className="text-2xl font-bold text-white mb-2">AI Cohort Analysis</h2>
								<p className="text-gray-400 max-w-lg text-sm leading-relaxed">
									Let the AI analyse your entire cohort's performance data and surface actionable insights —
									at-risk students, top performers, content gaps, and admin recommendations.
								</p>
							</div>
							{aiError && (
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm max-w-md">
									<AlertTriangle className="w-4 h-4 flex-shrink-0" />
									{aiError}
								</div>
							)}
							<button
								onClick={generateAIInsights}
								disabled={aiLoading || !analytics}
								className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-[0_0_30px_rgba(99,102,241,0.35)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
								{aiLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analysing Cohort…</> : <><Sparkles className="w-5 h-5" /> Generate AI Insights</>}
							</button>
						</div>
					)}

					{aiInsights && (
						<>
							{/* Refresh button */}
							<div className="flex justify-end">
								<button
									onClick={() => { setAIInsights(null); generateAIInsights(); }}
									className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/40 text-sm transition-all">
									<RefreshCw className="w-3.5 h-3.5" /> Regenerate
								</button>
							</div>

							{/* Trend + Summary */}
							<div className="glass-card p-6">
								<div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-5">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Executive Summary</span>
											<span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
												aiInsights.trend === "improving"
													? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
													: aiInsights.trend === "declining"
													? "bg-rose-500/10 border-rose-500/30 text-rose-400"
													: "bg-gray-500/10 border-gray-500/30 text-gray-400"
											}`}>
												{aiInsights.trend === "improving" ? <ArrowUpRight className="w-3 h-3" /> : aiInsights.trend === "declining" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
												{aiInsights.trend.charAt(0).toUpperCase() + aiInsights.trend.slice(1)}
											</span>
										</div>
										<p className="text-base text-gray-200 leading-relaxed">{aiInsights.summary}</p>
										<p className="text-sm text-gray-500 mt-2 italic">{aiInsights.trend_explanation}</p>
									</div>
								</div>

								{/* Key insights grid */}
								{aiInsights.key_insights.length > 0 && (
									<div>
										<p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-3 flex items-center gap-2">
											<Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Key Insights
										</p>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{aiInsights.key_insights.map((insight, i) => (
												<div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8">
													<span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
													<p className="text-sm text-gray-300 leading-snug">{insight}</p>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* 3-col: At-risk / Top performers / Hardest content */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* At-risk students */}
								<div className="glass-card p-5">
									<div className="flex items-center gap-2.5 mb-4">
										<div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
											<ShieldAlert className="w-4 h-4 text-rose-400" />
										</div>
										<div>
											<p className="text-sm font-bold text-white">At-Risk Students</p>
											<p className="text-[10px] text-gray-500">Avg score below 40%</p>
										</div>
									</div>
									{aiInsights.risk_students.length === 0 ? (
										<p className="text-sm text-emerald-400 flex items-center gap-2">
											<CheckCircle className="w-4 h-4" /> No at-risk students identified
										</p>
									) : (
										<ul className="space-y-2">
											{aiInsights.risk_students.map((name, i) => (
												<li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
													<span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
													{name}
												</li>
											))}
										</ul>
									)}
								</div>

								{/* Top performers */}
								<div className="glass-card p-5">
									<div className="flex items-center gap-2.5 mb-4">
										<div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
											<Star className="w-4 h-4 text-yellow-400" />
										</div>
										<div>
											<p className="text-sm font-bold text-white">Top Performers</p>
											<p className="text-[10px] text-gray-500">Highest average scores</p>
										</div>
									</div>
									{aiInsights.top_performers.length === 0 ? (
										<p className="text-sm text-gray-500">Not enough data yet.</p>
									) : (
										<ul className="space-y-2">
											{aiInsights.top_performers.map((name, i) => (
												<li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
													<span className={`text-[10px] font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-amber-600"}`}>
														{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
													</span>
													{name}
												</li>
											))}
										</ul>
									)}
								</div>

								{/* Hardest content */}
								<div className="glass-card p-5">
									<div className="flex items-center gap-2.5 mb-4">
										<div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
											<BookOpen className="w-4 h-4 text-indigo-400" />
										</div>
										<div>
											<p className="text-sm font-bold text-white">Hardest Content</p>
											<p className="text-[10px] text-gray-500">Tests/topics students struggle with</p>
										</div>
									</div>
									{aiInsights.hardest_content.length === 0 ? (
										<p className="text-sm text-gray-500">No struggling areas identified.</p>
									) : (
										<ul className="space-y-2">
											{aiInsights.hardest_content.map((item, i) => (
												<li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
													<span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
													{item}
												</li>
											))}
										</ul>
									)}
								</div>
							</div>

							{/* Admin recommendations */}
							{aiInsights.recommendations.length > 0 && (
								<div className="glass-card p-6">
									<div className="flex items-center gap-3 mb-5">
										<div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
											<Target className="w-4 h-4 text-purple-400" />
										</div>
										<div>
											<p className="font-bold text-white">Admin Action Items</p>
											<p className="text-xs text-gray-500">AI-generated recommendations for improving cohort outcomes</p>
										</div>
									</div>
									<div className="space-y-3">
										{aiInsights.recommendations.map((rec, i) => (
											<div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 transition-colors">
												<span className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
												<p className="text-sm text-gray-200 leading-relaxed">{rec}</p>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default StudentResults;
