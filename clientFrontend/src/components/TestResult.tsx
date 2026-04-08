import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { getTestAttempt, getTest, getCurrentUser } from "../api";
import { chatApi } from "../api/chatApi";
import { Test, MCQQuestion, Question, User } from "../types";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	Radar,
	LabelList,
} from "recharts";

// ─── Custom Markdown Renderer (Minimal) ──────────────────────────────────────
const escapeHtml = (str: string) =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

const SimpleMarkdown = ({ content }: { content: string }) => {
	// Escape raw HTML first to prevent XSS, then apply markdown transforms
	const html = escapeHtml(content)
		.replace(/### (.*)/g, '<h3 class="text-xl font-bold text-indigo-300 mt-6 mb-2">$1</h3>')
		.replace(/## (.*)/g, '<h2 class="text-2xl font-bold text-purple-300 mt-8 mb-4 border-b border-purple-500/30 pb-2">$1</h2>')
		.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
		.replace(/^- (.*)/gm, '<li class="ml-4 text-gray-300">$1</li>')
		.replace(/\n\n/g, "<br/>")
		.replace(/\|/g, "");

	return (
		<div
			className="prose prose-invert max-w-none leading-relaxed space-y-1"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};

// ─── API Data Shapes ──────────────────────────────────────────────────────────
interface AttemptData {
	id: string;
	testId: string;
	userId: string;
	score: number;
	answers: Record<string, string>; // questionId → answer string
	feedback: string;
	submittedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isMCQ = (q: Question): q is MCQQuestion => q.type === "mcq";

const STATUS_COLORS = {
	correct: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#10b981", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
	incorrect: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.35)", text: "#ef4444", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
	pending: { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.3)", text: "#818cf8", badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
} as const;

const DONUT_COLORS = ["#10b981", "#ef4444", "#818cf8"];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-gray-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
			{label && <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>}
			{payload.map((entry: any, i: number) => (
				<p key={i} className="text-sm font-semibold" style={{ color: entry.color || entry.fill || "#a5b4fc" }}>
					{entry.name}: <span className="text-white">{entry.value}</span>
				</p>
			))}
		</div>
	);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TestResult: React.FC = () => {
	const { attemptId } = useParams<{ attemptId: string }>();

	const { data: attempt, isLoading: loadingAttempt, error: attemptError } = useQuery<AttemptData>(
		["testAttempt", attemptId],
		() => getTestAttempt(attemptId!) as unknown as Promise<AttemptData>,
		{ enabled: !!attemptId }
	);

	const { data: test, isLoading: loadingTest, error: testError } = useQuery<Test>(
		["test", attempt?.testId],
		() => getTest(attempt!.testId),
		{ enabled: !!attempt?.testId }
	);

	// ─── Derived analytics ────────────────────────────────────────────────────
	const { data: user } = useQuery<User>("currentUser", getCurrentUser);

	// ─── Derived analytics ────────────────────────────────────────────────────
	const analytics = useMemo(() => {
		if (!attempt || !test) return null;

		const answerMap = attempt.answers ?? {};
		let totalPossible = 0;
		let totalEarned = 0;
		let correct = 0, incorrect = 0, pending = 0;

		const subjects: Record<string, { correct: number; total: number }> = {};
		const weakTopics: string[] = [];

		const questionRows = test.questions.map((q) => {
			totalPossible += q.points;
			const given = answerMap[q.id];
			const subject = q.subject || "General";
			if (!subjects[subject]) subjects[subject] = { correct: 0, total: 0 };
			subjects[subject].total++;

			if (isMCQ(q)) {
				const selectedIdx = parseInt(given ?? "-1", 10);
				const isCorrect = selectedIdx === q.correctOption;
				const pts = isCorrect ? q.points : 0;
				totalEarned += pts;
				if (isCorrect) {
					correct++;
					subjects[subject].correct++;
				} else {
					incorrect++;
					const topic = q.subject || "General";
					if (!weakTopics.includes(topic)) weakTopics.push(topic);
				}
				return { q, given, selectedIdx, isCorrect, pts, status: isCorrect ? "correct" : "incorrect" as const };
			} else {
				pending++;
				return { q, given, selectedIdx: -1, isCorrect: null, pts: 0, status: "pending" as const };
			}
		});

		const pct = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
		const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
		const gradeColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
		const completionRate = test.questions.length > 0 ? (Object.keys(answerMap).length / test.questions.length) * 100 : 0;

		const donutData = [
			{ name: "Correct", value: correct },
			{ name: "Incorrect", value: incorrect },
			{ name: "Needs Review", value: pending },
		].filter((d) => d.value > 0);

		const barData = null; // Unused in final subject-focused UI

		const horizontalBarData = Object.entries(subjects).map(([name, data]) => ({
			name,
			accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
		}));

		const radarData = [
			{ subject: "Accuracy", value: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0 },
			{ subject: "Completion", value: Math.round(completionRate) },
			{ subject: "Score %", value: Math.round(pct) },
			{ subject: "Subjects", value: Object.keys(subjects).length * 10 }, // normalized
		];

		return {
			questionRows, totalPossible, totalEarned, pct, grade, gradeColor,
			correct, incorrect, pending, donutData, barData, radarData,
			horizontalBarData, completionRate, subjects, weakTopics
		};
	}, [attempt, test]);

	// ─── AI Roadmap State ──────────────────────────────────────────────────────
	const [roadmap, setRoadmap] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	const handleGenerateRoadmap = async () => {
		if (!analytics || !test) return;
		setGenerating(true);
		try {
			const res = await chatApi.generateRoadmapFromResult({
				test_title: test.title,
				student_name: user?.fullName || "Student",
				score_pct: analytics.pct,
				grade: analytics.grade,
				correct: analytics.correct,
				incorrect: analytics.incorrect,
				pending: analytics.pending,
				total_questions: test.questions.length,
				subject_breakdown: analytics.subjects,
				weak_topics: analytics.weakTopics,
			});
			setRoadmap(res.answer);
		} catch (err) {
			console.error("Roadmap generation failed:", err);
		} finally {
			setGenerating(false);
		}
	};

	// ─── Loading / Error states ───────────────────────────────────────────────
	if (loadingAttempt || loadingTest) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-6">
				<div className="relative w-24 h-24">
					<div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
					<div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 animate-spin" />
				</div>
				<p className="text-indigo-300 text-lg font-medium tracking-widest uppercase animate-pulse">Analyzing Results…</p>
			</div>
		);
	}

	if (attemptError || testError || !attempt || !test || !analytics) {
		return (
			<div className="min-h-screen flex items-center justify-center p-8">
				<div className="max-w-md w-full glass-card p-10 text-center">
					<div className="text-5xl mb-4">⚠️</div>
					<h2 className="text-2xl font-bold text-white mb-2">Results Not Found</h2>
					<p className="text-gray-400 mb-6">This attempt could not be loaded. It may have been deleted or the ID is invalid.</p>
					<Link to="/" className="glass-button-primary px-6 py-3 rounded-full font-medium">Back to Dashboard</Link>
				</div>
			</div>
		);
	}

	const {
		questionRows, totalPossible, totalEarned, pct, grade, gradeColor,
		correct, incorrect, donutData, radarData,
		horizontalBarData, completionRate
	} = analytics;

	return (
		<div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12 text-gray-100 animate-in fade-in duration-700">

			{/* ── Hero header ── */}
			<div className="relative overflow-hidden rounded-[2.5rem] p-10 md:p-16 bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.15)] backdrop-blur-3xl">
				{/* futuristic decoration */}
				<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
				<div className="pointer-events-none absolute -top-48 -right-48 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
				<div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />

				<div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
					<div className="flex-1 text-center lg:text-left">
						<div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
							<span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
							<span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400">Mission Report // Complete</span>
						</div>
						<h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4 tracking-tight">
							{test.title}
						</h1>
						<p className="text-lg text-gray-400 max-w-2xl mx-auto lg:mx-0 font-medium">
							{test.description}
						</p>
						<div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 mt-8 text-sm text-gray-500">
							<span className="flex items-center gap-2">
								<span className="text-indigo-400">📅</span> {new Date(attempt.submittedAt).toLocaleDateString()}
							</span>
							<span className="flex items-center gap-2">
								<span className="text-indigo-400">🕒</span> {new Date(attempt.submittedAt).toLocaleTimeString()}
							</span>
						</div>

						{attempt.feedback && (
							<div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-inner group transition-all hover:bg-white/[0.07]">
								<div className="flex items-center gap-3 mb-2">
									<span className="text-xl">💬</span>
									<span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Mentor Feed</span>
								</div>
								<p className="text-gray-300 italic leading-relaxed">{attempt.feedback}</p>
							</div>
						)}
					</div>

					{/* Score ring */}
					<div className="flex-shrink-0 relative group">
						<div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
						<div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
							<svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
								<circle
									cx="50" cy="50" r="44" fill="none"
									stroke={gradeColor}
									strokeWidth="8"
									strokeDasharray={`${pct * 2.763} 276.3`}
									strokeLinecap="round"
									className="transition-all duration-[2000ms] ease-out-expo"
									style={{ filter: `drop-shadow(0 0 10px ${gradeColor})` }}
								/>
							</svg>
							<div className="text-center z-10">
								<div className="text-7xl font-black mb-1 drop-shadow-2xl" style={{ color: gradeColor }}>{grade}</div>
								<div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{pct.toFixed(1)}%</div>
							</div>
						</div>
						<div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full glass border border-white/10 shadow-2xl">
							<p className="text-xl font-black text-white">{totalEarned}<span className="text-gray-500 text-sm font-normal"> / {totalPossible}</span></p>
						</div>
					</div>
				</div>
			</div>

			{/* ── Stat grid ── */}
			<div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
				{[
					{ label: "Accuracy", value: `${Math.round((correct / (correct + incorrect || 1)) * 100)}%`, icon: "🎯", color: "from-emerald-400 to-teal-500" },
					{ label: "Completion", value: `${Math.round(completionRate)}%`, icon: "⚡", color: "from-blue-400 to-indigo-500" },
					{ label: "Correct", value: correct, icon: "✅", color: "from-green-400 to-emerald-600" },
					{ label: "Incorrect", value: incorrect, icon: "❌", color: "from-rose-400 to-red-600" },
					{ label: "Rankings", value: "Top 15%", icon: "🏆", color: "from-amber-400 to-orange-500" },
					{ label: "Total Questions", value: test.questions.length, icon: "📋", color: "from-purple-400 to-indigo-600" },
				].map((stat) => (
					<div key={stat.label} className="glass group rounded-2xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20">
						<div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.color} opacity-10 blur-2xl transform translate-x-4 -translate-y-4`} />
						<span className="text-2xl mb-4 block">{stat.icon}</span>
						<span className="text-2xl font-black text-white block truncate">{stat.value}</span>
						<span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{stat.label}</span>
					</div>
				))}
			</div>

			{/* ── Charts row ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* Donut */}
					<div className="glass rounded-3xl p-8">
						<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">
							<span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Response Distribution
						</h3>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
										{donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
									</Pie>
									<Tooltip content={<DarkTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>
						<div className="flex flex-wrap justify-center gap-6 mt-4">
							{donutData.map((d, i) => (
								<div key={i} className="flex items-center gap-2 text-xs font-bold">
									<div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
									<span className="text-gray-400 uppercase tracking-tighter">{d.name}</span>
									<span className="text-white">{d.value}</span>
								</div>
							))}
						</div>
					</div>

					{/* Radar */}
					<div className="glass rounded-3xl p-8">
						<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">
							<span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Capability Matrix
						</h3>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart data={radarData}>
									<PolarGrid stroke="rgba(255,255,255,0.05)" />
									<PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "bold" }} />
									<Radar name="Level" dataKey="value" stroke="#818cf8" fill="#818cf8" fillOpacity={0.2} strokeWidth={3} />
									<Tooltip content={<DarkTooltip />} />
								</RadarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>

				{/* Subject Accuracy Horizontal Bar */}
				<div className="glass rounded-3xl p-8">
					<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">
						<span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Subject Proficiency
					</h3>
					<div className="h-64 overflow-y-auto custom-scrollbar">
						<ResponsiveContainer width="100%" height={Math.max(256, horizontalBarData.length * 60)}>
							<BarChart data={horizontalBarData} layout="vertical" margin={{ left: 20, right: 30 }}>
								<XAxis type="number" hide domain={[0, 100]} />
								<YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={80} />
								<Tooltip content={<DarkTooltip />} />
								<Bar dataKey="accuracy" fill="url(#barGradient)" radius={[0, 10, 10, 0]} barSize={24}>
									<LabelList dataKey="accuracy" position="right" fill="#fff" fontSize={11} formatter={(v: any) => `${v}%`} />
								</Bar>
								<defs>
									<linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
										<stop offset="0%" stopColor="#4f46e5" />
										<stop offset="100%" stopColor="#9333ea" />
									</linearGradient>
								</defs>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* ── AI Roadmap Panel ── */}
			<div className="relative group">
				<div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
				<div className="relative glass rounded-[2.5rem] overflow-hidden">
					<div className="p-8 md:p-12">
						<div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
							<div>
								<h2 className="text-3xl font-black text-white mb-2 flex items-center gap-4">
									<span className="text-4xl">🤖</span> AI Study Architect
								</h2>
								<p className="text-gray-400 max-w-xl">
									Based on your performance in <span className="text-indigo-300 font-bold">{test.title}</span>, our AI can construct a hyper-personalised learning roadmap just for you.
								</p>
							</div>
							{!roadmap && (
								<button
									onClick={handleGenerateRoadmap}
									disabled={generating}
									className="relative flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] active:scale-95 group overflow-hidden"
								>
									{generating && <div className="absolute inset-0 bg-indigo-400/20 animate-pulse" />}
									<span className={generating ? "animate-spin" : ""}>{generating ? "⚙️" : "✨"}</span>
									{generating ? "Architecting Roadmap..." : "Generate AI Roadmap"}
								</button>
							)}
						</div>

						{generating && (
							<div className="space-y-6 animate-pulse">
								<div className="h-8 bg-white/5 rounded-lg w-1/4" />
								<div className="space-y-3">
									<div className="h-4 bg-white/5 rounded-lg w-full" />
									<div className="h-4 bg-white/5 rounded-lg w-[90%]" />
									<div className="h-4 bg-white/5 rounded-lg w-[95%]" />
								</div>
								<div className="h-32 bg-white/5 rounded-3xl w-full" />
							</div>
						)}

						{roadmap && (
							<div className="bg-black/30 border border-white/5 rounded-3xl p-8 md:p-10 shadow-inner max-h-[600px] overflow-y-auto custom-scrollbar">
								<SimpleMarkdown content={roadmap} />
								<div className="mt-12 flex justify-end">
									<button
										onClick={() => window.print()}
										className="text-xs font-bold text-gray-500 hover:text-indigo-400 transition-colors flex items-center gap-2 uppercase tracking-widest"
									>
										🖨️ Export as Transmission
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Per-question review ── */}
			<div className="space-y-8">
				<h2 className="text-3xl font-black text-white flex items-center gap-4">
					<span className="w-1.5 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
					Knowledge Review
				</h2>
				<div className="grid grid-cols-1 gap-6">
					{questionRows.map(({ q, given, selectedIdx, pts, status }: any, idx: number) => {
						const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
						const mcq = isMCQ(q);

						return (
							<div
								key={q.id}
								className="rounded-3xl overflow-hidden glass transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
								style={{ background: c.bg, border: `1px solid ${c.border}` }}
							>
								<div className="p-8">
									<div className="flex flex-col md:flex-row items-start justify-between gap-6">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-4">
												<span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Query // {idx + 1}</span>
												<span className="text-[10px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-bold uppercase tracking-widest">{q.type}</span>
												<span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold uppercase tracking-widest">{q.subject}</span>
											</div>
											<p className="text-xl font-bold text-white leading-relaxed">{q.content}</p>
										</div>

										<div className="flex flex-col items-end gap-3 shrink-0">
											<span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-[0.2em] shadow-lg ${c.badge}`}>
												{status === "correct" ? "✓ Validated" : status === "incorrect" ? "✗ Error" : "⏳ Review"}
											</span>
											<span className="text-lg font-black" style={{ color: c.text }}>
												{pts} / {q.points} <span className="text-[10px] uppercase text-gray-500 ml-1">Credits</span>
											</span>
										</div>
									</div>

									{mcq && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
											{q.options.map((opt, optIdx) => {
												const isSelected = optIdx === selectedIdx;
												const isRight = optIdx === q.correctOption;
												let optClass = "border border-white/10 bg-white/5 text-gray-400";
												if (isRight) optClass = "border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.1)]";
												else if (isSelected && !isRight) optClass = "border border-rose-500/50 bg-rose-500/10 text-rose-300 font-bold";

												return (
													<div key={optIdx} className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm transition-all ${optClass}`}>
														<span className="w-8 h-8 rounded-full border border-current/20 flex items-center justify-center text-[10px] font-black shrink-0 bg-white/5">
															{String.fromCharCode(65 + optIdx)}
														</span>
														<span className="flex-1">{opt}</span>
														{isRight && <span className="text-emerald-400">✓</span>}
														{isSelected && !isRight && <span className="text-rose-400">✗</span>}
													</div>
												);
											})}
										</div>
									)}

									{!mcq && given && (
										<div className="mt-8 space-y-3">
											<p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Input Stream</p>
											<div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-inner">
												<pre className="text-sm font-mono text-indigo-200 whitespace-pre-wrap">{given}</pre>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* ── Footer ── */}
			<div className="flex justify-center pb-12 pt-4">
				<Link
					to="/"
					className="group relative px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 overflow-hidden"
				>
					<div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 translate-y-1 group-hover:translate-y-0 transition-transform" />
					<span className="text-sm font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-white">← Return to Nexus</span>
				</Link>
			</div>
		</div>
	);
};

export default TestResult;
