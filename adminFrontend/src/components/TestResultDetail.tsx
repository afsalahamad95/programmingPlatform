import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { adminApi } from "../api";
import { Test, MCQQuestion, Question, Student } from "../types";
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
} from "recharts";

// ─── Custom Markdown Renderer (Minimal) ──────────────────────────────────────
const SimpleMarkdown = ({ content }: { content: string }) => {
	const html = content
		.replace(/### (.*)/g, '<h3 class="text-xl font-bold text-indigo-300 mt-6 mb-2">$1</h3>')
		.replace(/## (.*)/g, '<h2 class="text-2xl font-bold text-purple-300 mt-8 mb-4 border-b border-purple-500/30 pb-2">$1</h2>')
		.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
		.replace(/- (.*)/g, '<li class="ml-4 text-gray-300">$1</li>')
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
	answers: Record<string, string>;
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

const TestResultDetail: React.FC = () => {
	const { attemptId } = useParams<{ attemptId: string }>();

	const { data: attempt, isLoading: loadingAttempt, error: attemptError } = useQuery<AttemptData>(
		["adminTestAttempt", attemptId],
		() => adminApi.getTestAttempt(attemptId!),
		{ enabled: !!attemptId }
	);

	const { data: test, isLoading: loadingTest, error: testError } = useQuery<Test>(
		["adminTest", attempt?.testId],
		() => adminApi.getTest(attempt!.testId),
		{ enabled: !!attempt?.testId }
	);

	const { data: student } = useQuery<Student>(
		["student", attempt?.userId],
		() => adminApi.getStudentResultsByStudent(attempt!.userId).then(res => res[0]),
		{ enabled: !!attempt?.userId }
	);

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
					weakTopics.push(q.content);
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

		const radarData = [
			{ subject: "Accuracy", value: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0 },
			{ subject: "Completion", value: Math.round(completionRate) },
			{ subject: "Score %", value: Math.round(pct) },
			{ subject: "Subjects", value: Object.keys(subjects).length * 10 },
		];

		const horizontalBarData = Object.entries(subjects).map(([name, data]) => ({
			name,
			accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
		}));

		return {
			questionRows, totalPossible, totalEarned, pct, grade, gradeColor,
			correct, incorrect, pending, donutData, radarData,
			horizontalBarData, completionRate, subjects, weakTopics
		};
	}, [attempt, test]);

	const [roadmap, setRoadmap] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	const handleGenerateRoadmap = async () => {
		if (!analytics || !test) return;
		setGenerating(true);
		try {
			const res = await adminApi.generateRoadmapFromResult({
				test_title: test.title,
				student_name: student?.fullName || "Student",
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

	if (loadingAttempt || loadingTest) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-6">
				<div className="relative w-24 h-24">
					<div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
					<div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 animate-spin" />
				</div>
				<p className="text-indigo-300 text-lg font-medium tracking-widest uppercase animate-pulse">Compiling Evidence…</p>
			</div>
		);
	}

	if (attemptError || testError || !attempt || !test || !analytics) {
		return (
			<div className="min-h-screen flex items-center justify-center p-8">
				<div className="max-w-md w-full glass-card p-10 text-center">
					<div className="text-5xl mb-4">⚠️</div>
					<h2 className="text-2xl font-bold text-white mb-2">Detailed View Locked</h2>
					<p className="text-gray-400 mb-6">Could not retrieve attempt data for verification.</p>
					<Link to="/student-results" className="glass-button-primary px-6 py-3 rounded-full font-medium">Return to Nexus</Link>
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
				<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
				<div className="pointer-events-none absolute -top-48 -right-48 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
				
				<div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
					<div className="flex-1 text-center lg:text-left">
						<div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
							<span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
							<span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400 font-mono">Archive Record // ID: {attempt.id.slice(0,8)}</span>
						</div>
						<h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4 tracking-tight">
							{test.title}
						</h1>
						<div className="flex flex-wrap items-center gap-4 mb-6">
							<span className="text-2xl text-gray-400 font-medium">Student:</span>
							<span className="text-2xl text-white font-black">{student?.fullName || attempt.userId}</span>
						</div>
						
						<div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 mt-8 text-sm text-gray-500">
							<span className="flex items-center gap-2">
								<span className="text-indigo-400">📅</span> {new Date(attempt.submittedAt).toLocaleDateString()}
							</span>
							<span className="flex items-center gap-2">
								<span className="text-indigo-400">🕒</span> {new Date(attempt.submittedAt).toLocaleTimeString()}
							</span>
						</div>
					</div>

					{/* Score ring */}
					<div className="flex-shrink-0 relative group">
						<div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
							<svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
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
					{ label: "Rankings", value: "Reviewing", icon: "🏆", color: "from-amber-400 to-orange-500" },
					{ label: "Total Questions", value: test.questions.length, icon: "📋", color: "from-purple-400 to-indigo-600" },
				].map((stat) => (
					<div key={stat.label} className="glass group rounded-2xl p-6 relative overflow-hidden transition-all hover:-translate-y-1">
						<span className="text-2xl mb-4 block">{stat.icon}</span>
						<span className="text-2xl font-black text-white block truncate">{stat.value}</span>
						<span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{stat.label}</span>
					</div>
				))}
			</div>

			{/* ── Charts ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="glass rounded-3xl p-8">
						<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">Response Breakdown</h3>
						<div className="h-48">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
										{donutData.map((_: any, i: number) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
									</Pie>
									<Tooltip content={<DarkTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div className="glass rounded-3xl p-8">
						<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">Competency Map</h3>
						<div className="h-48">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart data={radarData}>
									<PolarGrid stroke="rgba(255,255,255,0.05)" />
									<PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
									<Radar name="Level" dataKey="value" stroke="#818cf8" fill="#818cf8" fillOpacity={0.2} />
								</RadarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
				<div className="glass rounded-3xl p-8">
					<h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2">Topic Proficiency</h3>
					<div className="h-64 overflow-y-auto custom-scrollbar">
						<ResponsiveContainer width="100%" height={Math.max(256, horizontalBarData.length * 50)}>
							<BarChart data={horizontalBarData} layout="vertical" margin={{ left: 20 }}>
								<XAxis type="number" hide domain={[0, 100]} />
								<YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={80} />
								<Tooltip content={<DarkTooltip />} />
								<Bar dataKey="accuracy" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={20} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* ── AI Roadmap Panel ── */}
			<div className="relative group">
				<div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25" />
				<div className="relative glass rounded-[2.5rem] overflow-hidden">
					<div className="p-8 md:p-12">
						<div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
							<div>
								<h2 className="text-3xl font-black text-white mb-2 flex items-center gap-4">🤖 Admin AI Consultant</h2>
								<p className="text-gray-400 max-w-xl">Generate a personalised study roadmap for this student based on their performance metrics.</p>
							</div>
							{!roadmap && (
								<button
									onClick={handleGenerateRoadmap}
									disabled={generating}
									className="relative flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-black rounded-2xl transition-all"
								>
									{generating ? "⚙️ Architecting..." : "Generate Roadmap"}
								</button>
							)}
						</div>
						{roadmap && (
							<div className="bg-black/30 rounded-3xl p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
								<SimpleMarkdown content={roadmap} />
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Question Review ── */}
			<div className="space-y-8">
				<h2 className="text-3xl font-black text-white flex items-center gap-4">Archive Examination</h2>
				<div className="grid grid-cols-1 gap-6">
					{questionRows.map(({ q, given, selectedIdx, pts, status }: any, idx: number) => {
						const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
						const mcq = isMCQ(q);
						return (
							<div
								key={q.id}
								className="rounded-3xl overflow-hidden glass transition-all duration-300"
								style={{ background: c.bg, border: `1px solid ${c.border}` }}
							>
								<div className="p-8">
									<div className="flex flex-col md:flex-row items-start justify-between gap-6">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-4">
												<span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Entry // {idx + 1}</span>
												<span className="text-[10px] px-3 py-1 rounded-full bg-white/5 text-gray-400 font-bold uppercase">{q.type}</span>
												<span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 font-bold uppercase">{q.subject}</span>
											</div>
											<p className="text-xl font-bold text-white">{q.content}</p>
										</div>
										<div className="flex flex-col items-end shrink-0 gap-2">
											<span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase ${c.badge}`}>{status}</span>
											<span className="text-lg font-black" style={{ color: c.text }}>{pts} / {q.points} Credits</span>
										</div>
									</div>
									{mcq && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-sm">
											{q.options.map((opt, optIdx) => {
												const isSelected = optIdx === selectedIdx;
												const isRight = optIdx === q.correctOption;
												let optClass = "border border-white/10 bg-white/5 text-gray-400";
												if (isRight) optClass = "border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-bold";
												else if (isSelected && !isRight) optClass = "border border-rose-500/50 bg-rose-500/10 text-rose-300 font-bold";
												return <div key={optIdx} className={`px-6 py-4 rounded-2xl ${optClass}`}>{opt}</div>;
											})}
										</div>
									)}
									{!mcq && given && (
										<div className="mt-8 bg-black/40 rounded-2xl p-6 shadow-inner">
											<pre className="text-sm font-mono text-indigo-100 whitespace-pre-wrap">{given}</pre>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="flex justify-center pb-12 pt-4">
				<Link to="/student-results" className="px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm font-black uppercase tracking-widest">← Back to Overview</Link>
			</div>
		</div>
	);
};

export default TestResultDetail;
