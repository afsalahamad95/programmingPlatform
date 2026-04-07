import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import {
	User, Terminal, Code2, BrainCircuit, Save, ShieldCheck,
	Settings, Activity, Target, Trophy, Clock, Lock, Mail,
	Edit3, LogOut, Award, ExternalLink, Link as LinkIcon,
	Flame, Zap, TrendingUp, CheckCircle, XCircle, BookOpen,
	Plus, Trash2, BarChart2, Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getMyResults, getStudentAnalytics, getStudentInsights, getStudentMilestones, getStudentSkillAnalytics, getStudentPerformanceTimeline } from "../api";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
	{ id: "frontend", name: "Frontend Developer", icon: <User className="w-5 h-5" />, color: "text-blue-400" },
	{ id: "backend", name: "Backend Developer", icon: <Terminal className="w-5 h-5" />, color: "text-emerald-400" },
	{ id: "fullstack", name: "Full Stack Engineer", icon: <Code2 className="w-5 h-5" />, color: "text-indigo-400" },
	{ id: "ai", name: "AI/ML Engineer", icon: <BrainCircuit className="w-5 h-5" />, color: "text-purple-400" },
];

const PREFERENCES_LIST = [
	"React", "Go", "Python", "Node.js", "TypeScript",
	"SQL", "MongoDB", "Algorithms", "System Design", "AWS",
	"Docker", "Kubernetes", "GraphQL", "Redis", "PostgreSQL",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const gradeColor = (pct: number) =>
	pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-yellow-400" : "text-rose-400";

const statusBadge = (status: string) => {
	if (status === "Passed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
	if (status === "Failed") return "bg-rose-500/10 text-rose-400 border-rose-500/30";
	return "bg-amber-500/10 text-amber-400 border-amber-500/30";
};

const levelColor = (level: string) => {
	if (level === "Expert") return "text-yellow-400";
	if (level === "Proficient") return "text-emerald-400";
	if (level === "Developing") return "text-blue-400";
	return "text-gray-500";
};

// ─── Component ────────────────────────────────────────────────────────────────

const Profile = () => {
	const { user, checkAuth, logout } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<"overview" | "skills" | "history" | "preferences" | "settings">("overview");
	const [isUpdating, setIsUpdating] = useState(false);
	const [newGoal, setNewGoal] = useState("");
	const [pwForm, setPwForm] = useState({ current: "", next: "" });

	const [formData, setFormData] = useState({
		targetRole: user?.targetRole || "fullstack",
		preferences: user?.preferences || [],
		learningGoals: user?.learningGoals || [],
		fullName: user?.fullName || "",
		email: user?.email || "",
		bio: "",
	});

	// ── Data queries ────────────────────────────────────────────────────────
	const studentId = user?.id || user?.userId || "";

	const { data: studentData } = useQuery(
		["studentData", studentId],
		() => getStudentAnalytics(studentId),
		{ enabled: !!studentId }
	);
	const { data: insights } = useQuery(
		["insights", studentId],
		() => getStudentInsights(studentId),
		{ enabled: !!studentId }
	);
	const { data: milestones } = useQuery(
		["milestones", studentId],
		() => getStudentMilestones(studentId),
		{ enabled: !!studentId }
	);
	const { data: skillData } = useQuery(
		["skillAnalytics", studentId],
		() => getStudentSkillAnalytics(studentId),
		{ enabled: !!studentId }
	);
	const { data: timeline } = useQuery(
		["performanceTimeline", studentId],
		() => getStudentPerformanceTimeline(studentId),
		{ enabled: !!studentId }
	);
	const { data: myResults = [] } = useQuery(
		["myResults"],
		getMyResults,
		{ enabled: !!user }
	);

	// ── Computed values ──────────────────────────────────────────────────────
	const points = studentData?.basicInfo?.points ?? studentData?.points ?? 0;
	const streak = studentData?.analytics?.dailyStreak ?? insights?.streak ?? 0;
	const totalTests = timeline?.totalTests ?? myResults.length ?? 0;
	const avgScore = timeline?.overallAvgScore ?? 0;
	const timeSpent = studentData?.analytics?.totalTimeSpent ?? 0;
	const skillMap: { skill: string; score: number; level: string }[] = skillData?.skillRadar ?? [];

	// ── Handlers ─────────────────────────────────────────────────────────────
	const handlePreferenceToggle = (pref: string) => {
		setFormData(prev => ({
			...prev,
			preferences: prev.preferences.includes(pref)
				? prev.preferences.filter(p => p !== pref)
				: [...prev.preferences, pref],
		}));
	};

	const handleAddGoal = () => {
		const trimmed = newGoal.trim();
		if (!trimmed || formData.learningGoals.includes(trimmed)) return;
		setFormData(prev => ({ ...prev, learningGoals: [...prev.learningGoals, trimmed] }));
		setNewGoal("");
	};

	const handleRemoveGoal = (goal: string) => {
		setFormData(prev => ({ ...prev, learningGoals: prev.learningGoals.filter(g => g !== goal) }));
	};

	const handleSave = async () => {
		if (!user) return;
		setIsUpdating(true);
		try {
			await api.put(`/users/${user.id || user.userId}`, {
				targetRole: formData.targetRole,
				preferences: formData.preferences,
				learningGoals: formData.learningGoals,
				fullName: formData.fullName,
			});
			checkAuth();
			toast.success("Profile saved!");
		} catch (err) {
			toast.error("Failed to save profile.");
		} finally {
			setIsUpdating(false);
		}
	};

	const TABS = [
		{ id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
		{ id: "skills", label: "Skills", icon: <BarChart2 className="w-4 h-4" /> },
		{ id: "history", label: "Test History", icon: <BookOpen className="w-4 h-4" /> },
		{ id: "preferences", label: "Career & Prefs", icon: <Target className="w-4 h-4" /> },
		{ id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
	] as const;

	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-gray-200 space-y-8">

			{/* ── Profile Header ── */}
			<div className="glass-card p-6 sm:p-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex items-center gap-5">
						<div className="relative group flex-shrink-0">
							<div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
								{user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
							</div>
							<div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
								<Edit3 className="w-6 h-6 text-white" />
							</div>
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-extrabold text-white">{user?.fullName || "Developer"}</h1>
							<div className="flex flex-wrap items-center gap-2 mt-1.5">
								<span className="text-sm text-gray-400">{user?.email}</span>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
									<ShieldCheck className="w-3 h-3" /> Verified
								</span>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-widest">
									<Star className="w-3 h-3" /> {ROLES.find(r => r.id === (user?.targetRole || formData.targetRole))?.name ?? "Developer"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						{/* Live stats pills */}
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm font-bold">
							<Flame className="w-4 h-4" /> {streak}d streak
						</div>
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm font-bold">
							<Zap className="w-4 h-4" /> {points.toLocaleString()} pts
						</div>
						<button
							onClick={() => logout().then(() => navigate("/login"))}
							className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-semibold transition-all"
						>
							<LogOut className="w-4 h-4" /> Sign Out
						</button>
						<button
							onClick={handleSave}
							disabled={isUpdating}
							className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
						>
							{isUpdating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
							Save
						</button>
					</div>
				</div>
			</div>

			{/* ── Tab Bar ── */}
			<div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/5 overflow-x-auto">
				{TABS.map(({ id, label, icon }) => (
					<button
						key={id}
						onClick={() => setActiveTab(id as any)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
							activeTab === id
								? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
								: "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
						}`}
					>
						{icon}{label}
					</button>
				))}
			</div>

			{/* ══════════════ OVERVIEW TAB ══════════════ */}
			{activeTab === "overview" && (
				<div className="space-y-6">
					{/* Stats Grid */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{[
							{ icon: <Trophy className="w-5 h-5 text-yellow-400" />, label: "Tests Completed", value: totalTests, bg: "bg-yellow-500/10 border-yellow-500/20" },
							{ icon: <TrendingUp className="w-5 h-5 text-indigo-400" />, label: "Avg Score", value: `${avgScore}%`, bg: "bg-indigo-500/10 border-indigo-500/20" },
							{ icon: <Flame className="w-5 h-5 text-orange-400" />, label: "Daily Streak", value: `${streak}d`, bg: "bg-orange-500/10 border-orange-500/20" },
							{ icon: <Clock className="w-5 h-5 text-purple-400" />, label: "Time Spent", value: formatTime(timeSpent), bg: "bg-purple-500/10 border-purple-500/20" },
						].map(({ icon, label, value, bg }) => (
							<div key={label} className={`glass-card p-5 border ${bg} flex flex-col items-center text-center`}>
								<div className="p-2.5 rounded-xl bg-black/20 mb-3">{icon}</div>
								<div className="text-2xl font-bold text-white">{value}</div>
								<div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{label}</div>
							</div>
						))}
					</div>

					{/* AI Coaching Insight */}
					{insights?.insight && (
						<div className={`glass-card p-5 border ${insights.insightType === 'positive' ? 'border-emerald-500/30 bg-emerald-500/5' : insights.insightType === 'constructive' ? 'border-amber-500/30 bg-amber-500/5' : 'border-indigo-500/30 bg-indigo-500/5'}`}>
							<div className="flex items-start gap-3">
								<BrainCircuit className={`w-5 h-5 mt-0.5 flex-shrink-0 ${insights.insightType === 'positive' ? 'text-emerald-400' : insights.insightType === 'constructive' ? 'text-amber-400' : 'text-indigo-400'}`} />
								<div>
									<p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">AI Coach</p>
									<p className="text-gray-200 text-sm leading-relaxed">{insights.insight}</p>
								</div>
							</div>
						</div>
					)}

					{/* Milestone Progress */}
					{milestones?.allMilestones && (
						<div className="glass-card p-6">
							<h3 className="font-semibold text-white flex items-center gap-2 mb-5">
								<Target className="w-4 h-4 text-purple-400" /> Milestone Progress
								<span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{milestones.probabilityOfSuccess}% likely</span>
							</h3>
							<div className="space-y-3">
								{milestones.allMilestones.map((m: any) => (
									<div key={m.name}>
										<div className="flex justify-between text-xs mb-1">
											<span className={`font-medium ${m.achieved ? 'text-emerald-400' : 'text-gray-300'}`}>{m.name}</span>
											<span className="text-gray-500 font-mono">{m.progress}%</span>
										</div>
										<div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
											<div
												className={`h-2 rounded-full transition-all duration-700 ${m.achieved ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
												style={{ width: `${m.progress}%` }}
											/>
										</div>
									</div>
								))}
							</div>
							<p className="text-xs text-gray-500 font-mono mt-3">
								Next: <span className="text-gray-300">{milestones.milestoneName}</span> — {milestones.daysRemaining} days at current pace
							</p>
						</div>
					)}

					{/* Bio + Focus Goal */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2 glass-card p-6">
							<h3 className="font-semibold text-white mb-4">About Me</h3>
							<textarea
								value={formData.bio}
								onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
								className="w-full h-28 bg-black/20 border border-white/10 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none text-sm"
								placeholder="Tell us about your developer journey…"
							/>
						</div>
						<div className="glass-card p-6 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/20">
							<h3 className="font-semibold text-white mb-3">Current Track</h3>
							<div className="p-4 bg-black/20 rounded-xl border border-white/5 mb-3">
								<p className="text-xs text-gray-500 mb-1">Target Role</p>
								<p className="font-bold text-white">{ROLES.find(r => r.id === formData.targetRole)?.name || "Not Set"}</p>
							</div>
							{formData.learningGoals.length > 0 && (
								<div className="space-y-1.5 mt-3">
									<p className="text-xs text-gray-500 mb-1">Active Goals</p>
									{formData.learningGoals.slice(0, 3).map(g => (
										<div key={g} className="flex items-center gap-2 text-sm text-gray-300">
											<CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{g}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ══════════════ SKILLS TAB ══════════════ */}
			{activeTab === "skills" && (
				<div className="space-y-6">
					{skillMap.length > 0 ? (
						<>
							<div className="glass-card p-6">
								<h3 className="font-semibold text-white mb-5 flex items-center gap-2">
									<BarChart2 className="w-4 h-4 text-indigo-400" /> Skill Progression
								</h3>
								<div className="space-y-4">
									{skillMap.map(s => (
										<div key={s.skill} className="flex items-center gap-3">
											<span className="text-sm text-gray-300 w-32 truncate">{s.skill}</span>
											<div className="flex-1 bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
												<div
													className={`h-2.5 rounded-full bg-gradient-to-r ${s.score >= 80 ? 'from-yellow-500 to-amber-400' : s.score >= 60 ? 'from-emerald-500 to-green-400' : s.score >= 40 ? 'from-blue-500 to-indigo-400' : 'from-gray-500 to-gray-400'} transition-all duration-700`}
													style={{ width: `${Math.max(s.score, 2)}%` }}
												/>
											</div>
											<span className={`text-xs font-mono w-14 text-right ${levelColor(s.level)}`}>{s.level}</span>
											<span className="text-xs font-mono text-gray-500 w-10 text-right">{s.score}%</span>
										</div>
									))}
								</div>
							</div>

							{/* Top/Weak */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="glass-card p-5">
									<h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Strongest</h4>
									{(skillData?.topSkills ?? []).slice(0, 5).map((s: any) => (
										<div key={s.skill} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
											<span className="text-gray-300">{s.skill}</span>
											<span className="font-mono font-bold text-emerald-400">{s.score}%</span>
										</div>
									))}
								</div>
								<div className="glass-card p-5">
									<h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Focus Areas</h4>
									{(skillData?.weakSkills ?? []).slice(0, 5).map((s: any) => (
										<div key={s.skill} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
											<span className="text-gray-300">{s.skill}</span>
											<span className="font-mono font-bold text-rose-400">{s.score}%</span>
										</div>
									))}
								</div>
							</div>
						</>
					) : (
						<div className="glass-card p-12 text-center border-dashed border-indigo-500/20">
							<BarChart2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
							<p className="text-gray-500 text-sm">No skill data yet — complete tests to populate your graph.</p>
						</div>
					)}

					{/* Tech stack chips */}
					{(skillData?.programmingLanguages?.length || skillData?.frameworks?.length || skillData?.tools?.length) && (
						<div className="glass-card p-6">
							<h3 className="font-semibold text-white mb-4">Tech Stack</h3>
							<div className="space-y-3">
								{[
									{ label: "Languages", items: skillData?.programmingLanguages ?? [] },
									{ label: "Frameworks", items: skillData?.frameworks ?? [] },
									{ label: "Tools", items: skillData?.tools ?? [] },
								].filter(g => g.items.length > 0).map(({ label, items }) => (
									<div key={label}>
										<p className="text-xs text-gray-500 mb-1.5">{label}</p>
										<div className="flex flex-wrap gap-2">
											{items.map((item: string) => (
												<span key={item} className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">{item}</span>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ══════════════ HISTORY TAB ══════════════ */}
			{activeTab === "history" && (
				<div className="space-y-4">
					{/* Summary row */}
					<div className="grid grid-cols-3 gap-4">
						{[
							{ label: "Total Tests", value: totalTests, color: "text-white" },
							{ label: "Avg Score", value: `${avgScore}%`, color: avgScore >= 70 ? "text-emerald-400" : "text-rose-400" },
							{ label: "Points", value: points.toLocaleString(), color: "text-yellow-400" },
						].map(({ label, value, color }) => (
							<div key={label} className="glass-card p-4 text-center">
								<div className={`text-2xl font-bold ${color}`}>{value}</div>
								<div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{label}</div>
							</div>
						))}
					</div>

					{/* Results table */}
					<div className="glass-card rounded-xl border border-white/5 overflow-hidden">
						<div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
							<BookOpen className="w-4 h-4 text-indigo-400" />
							<h3 className="font-semibold text-white">Recent Submissions</h3>
						</div>
						{myResults.length === 0 ? (
							<div className="p-12 text-center">
								<BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
								<p className="text-gray-500 text-sm">No test submissions yet.</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full text-left border-collapse">
									<thead>
										<tr className="bg-white/[0.02] border-b border-white/10 text-indigo-300 uppercase tracking-wider text-[11px] font-bold">
											<th className="px-5 py-3.5">Test</th>
											<th className="px-5 py-3.5">Status</th>
											<th className="px-5 py-3.5">Score</th>
											<th className="px-5 py-3.5">Time</th>
											<th className="px-5 py-3.5">Date</th>
											<th className="px-5 py-3.5 text-right">Details</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-white/5">
										{myResults.map((result: any, i: number) => (
											<tr key={i} className="hover:bg-white/[0.025] transition-colors group">
												<td className="px-5 py-3.5 font-medium text-white text-sm group-hover:text-indigo-300 transition-colors">{result.testTitle || "—"}</td>
												<td className="px-5 py-3.5">
													<span className={`px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border ${statusBadge(result.status)}`}>
														{result.status === "Passed" ? <CheckCircle className="w-3 h-3" /> : result.status === "Failed" ? <XCircle className="w-3 h-3" /> : null}
														{result.status}
													</span>
												</td>
												<td className="px-5 py-3.5">
													<div className="flex items-center gap-2">
														<span className={`font-mono font-bold text-sm ${gradeColor(result.percentageScore)}`}>{result.percentageScore}%</span>
														<div className="w-16 bg-gray-700/50 rounded-full h-1.5 hidden sm:block">
															<div
																className={`h-1.5 rounded-full ${result.percentageScore >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
																style={{ width: `${result.percentageScore}%` }}
															/>
														</div>
													</div>
												</td>
												<td className="px-5 py-3.5 text-gray-400 text-sm font-mono">{formatTime(result.timeSpent || 0)}</td>
												<td className="px-5 py-3.5 text-gray-400 text-sm">
													{new Date(result.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
												</td>
												<td className="px-5 py-3.5 text-right">
													<button
														onClick={() => navigate(`/results/${result.id}`)}
														className="text-xs px-3 py-1 border border-indigo-500/40 rounded text-indigo-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all font-bold uppercase tracking-widest"
													>
														View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ══════════════ PREFERENCES TAB ══════════════ */}
			{activeTab === "preferences" && (
				<div className="space-y-6">
					{/* Target Role */}
					<div className="glass-card p-6">
						<h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
							<Terminal className="w-5 h-5 text-indigo-400" /> Target Career Path
						</h3>
						<p className="text-sm text-gray-400 mb-5">Your selected path tailors mock interviews and challenge recommendations.</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{ROLES.map(role => (
								<button
									key={role.id}
									onClick={() => setFormData({ ...formData, targetRole: role.id })}
									className={`text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
										formData.targetRole === role.id
											? 'border-indigo-500 bg-indigo-500/10'
											: 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
									}`}
								>
									<div className={`p-2.5 rounded-lg ${formData.targetRole === role.id ? `${role.color} bg-white/5` : 'text-gray-500 bg-black/30'}`}>
										{role.icon}
									</div>
									<span className={`font-semibold ${formData.targetRole === role.id ? 'text-white' : 'text-gray-300'}`}>{role.name}</span>
								</button>
							))}
						</div>
					</div>

					{/* Technical Skills */}
					<div className="glass-card p-6">
						<h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
							<Code2 className="w-5 h-5 text-emerald-400" /> Technical Skills
						</h3>
						<p className="text-sm text-gray-400 mb-5">Select the tools and languages you are most comfortable with.</p>
						<div className="flex flex-wrap gap-2.5">
							{PREFERENCES_LIST.map(pref => (
								<button
									key={pref}
									onClick={() => handlePreferenceToggle(pref)}
									className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
										formData.preferences.includes(pref)
											? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
											: 'bg-black/20 text-gray-400 border-white/10 hover:border-white/30 hover:text-gray-200'
									}`}
								>
									{pref}
								</button>
							))}
						</div>
					</div>

					{/* Learning Goals */}
					<div className="glass-card p-6">
						<h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
							<Target className="w-5 h-5 text-purple-400" /> Learning Goals
						</h3>
						<p className="text-sm text-gray-400 mb-5">Goals displayed on your dashboard and shared with the AI coach.</p>

						<div className="flex gap-2 mb-4">
							<input
								type="text"
								value={newGoal}
								onChange={e => setNewGoal(e.target.value)}
								onKeyDown={e => e.key === "Enter" && handleAddGoal()}
								placeholder="Add a goal… (press Enter)"
								className="flex-1 px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
							<button
								onClick={handleAddGoal}
								className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
							>
								<Plus className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-2">
							{formData.learningGoals.length === 0 && (
								<p className="text-sm text-gray-600 italic">No goals set yet.</p>
							)}
							{formData.learningGoals.map(goal => (
								<div key={goal} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
									<div className="flex items-center gap-3">
										<CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
										<span className="text-sm text-gray-300">{goal}</span>
									</div>
									<button
										onClick={() => handleRemoveGoal(goal)}
										className="text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* ══════════════ SETTINGS TAB ══════════════ */}
			{activeTab === "settings" && (
				<div className="max-w-2xl space-y-6">
					{/* Personal Info */}
					<div className="glass-card p-6 space-y-5">
						<h3 className="text-lg font-semibold text-white border-b border-white/10 pb-4">Personal Information</h3>
						<div>
							<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Full Name</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<input
									type="text"
									value={formData.fullName}
									onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
									className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<input
									type="email"
									disabled
									value={formData.email}
									className="block w-full pl-10 pr-3 py-2.5 border border-white/5 rounded-xl bg-black/40 text-gray-500 cursor-not-allowed text-sm"
								/>
							</div>
							<p className="mt-1 text-xs text-gray-600">Email cannot be changed.</p>
						</div>
					</div>

					{/* Security */}
					<div className="glass-card p-6 space-y-5">
						<h3 className="text-lg font-semibold text-white border-b border-white/10 pb-4">Security</h3>
						<div>
							<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Current Password</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<input
									type="password"
									value={pwForm.current}
									onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
									placeholder="••••••••"
									className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">New Password</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<input
									type="password"
									value={pwForm.next}
									onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
									placeholder="Leave blank to keep current"
									className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
						</div>
						<button
							onClick={() => toast.success("Password change coming soon!")}
							className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-all"
						>
							Update Password
						</button>
					</div>

					{/* Certifications */}
					<div className="glass-card p-6">
						<div className="flex items-center justify-between mb-5">
							<h3 className="text-lg font-semibold text-white flex items-center gap-2">
								<Award className="w-5 h-5 text-indigo-400" /> Certifications
							</h3>
							<span className="text-xs text-gray-500 border border-white/10 px-2 py-0.5 rounded-full">
								{(studentData as any)?.certifications?.length ?? 0} earned
							</span>
						</div>

						{((studentData as any)?.certifications?.length ?? 0) === 0 ? (
							<div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
								<Award className="w-8 h-8 text-gray-700 mx-auto mb-2" />
								<p className="text-sm text-gray-600">No certifications yet.</p>
								<p className="text-xs text-gray-700 mt-1">Complete challenges to earn verified credentials.</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{((studentData as any)?.certifications ?? []).map((cert: any, i: number) => (
									<div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
										<div className="font-semibold text-white text-sm mb-1">{cert.name}</div>
										<div className="text-xs text-gray-400 mb-2">{cert.provider} · {new Date(cert.issueDate).toLocaleDateString()}</div>
										{cert.credentialUrl && (
											<a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
												Verify <ExternalLink className="w-3 h-3" />
											</a>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default Profile;
