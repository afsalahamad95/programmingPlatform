import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "react-query";
import { getRecommendedTests, getStudentAnalytics, api } from "../api";
import { 
  Sparkles, 
  BrainCircuit, 
  Target, 
  ChevronRight, 
  Clock, 
  TrendingUp,
  Award,
  Zap,
  BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TestList from "./TestList";

const Dashboard = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	// Fetch personalized recommendations from Go backend (primary)
	const { data: recommendations } = useQuery(
		["recommendations", user?.userId],
		() => getRecommendedTests(),
		{ enabled: !!user }
	);

	// Fetch deep analytics from Node.js userModule
	const { data: studentData } = useQuery(
		["studentAnalytics", user?.userId],
		() => getStudentAnalytics(user?.id || ""),
		{ enabled: !!user?.id }
	);

	// Fetch futuristic AI coaching insights
	const { data: aiInsights } = useQuery(
		["aiInsights", user?.userId],
		() => api.get(`/students/${user?.id}/insights`).then(res => res.data),
		{ enabled: !!user?.id, refetchInterval: 60000 }
	);

	// Fetch predictive milestones
	const { data: milestones } = useQuery(
		["milestones", user?.userId],
		() => api.get(`/students/${user?.id}/milestones`).then(res => res.data),
		{ enabled: !!user?.id }
	);

	const stats = [
		{ label: "Tests Completed", value: studentData?.analytics?.totalTests ?? milestones?.totalTests ?? "0", icon: <Award className="w-5 h-5 text-yellow-400" />, color: "bg-yellow-400/10" },
		{ label: "Points Earned", value: (studentData?.basicInfo?.points ?? studentData?.points ?? 0).toLocaleString(), icon: <Zap className="w-5 h-5 text-blue-400" />, color: "bg-blue-400/10" },
		{ label: "Daily Streak", value: `${studentData?.analytics?.dailyStreak ?? aiInsights?.streak ?? 0} Days`, icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, color: "bg-emerald-400/10" },
	];

	return (
		<div className="max-w-7xl mx-auto space-y-10 animate-fade-in">
			{/* Welcome Header */}
			<div className="relative overflow-hidden rounded-3xl p-8 sm:p-12">
				<div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-transparent backdrop-blur-3xl -z-10"></div>
				<div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>
				
				<div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
					<div className="text-center md:text-left space-y-4">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
							<Sparkles className="w-3 h-3" /> Personalized Dashboard
						</div>
						<h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
							Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">{user?.fullName?.split(' ')[0] || "Developer"}</span>!
						</h1>
						<p className="text-gray-400 text-lg max-w-2xl font-medium">
							Your path to becoming a <span className="text-white font-bold">{user?.targetRole || "Senior Engineer"}</span> is 45% complete. Keep the momentum going!
						</p>
						<div className="flex flex-wrap gap-4 pt-4">
							<button 
								onClick={() => navigate('/mock-interview')}
								className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-xl shadow-white/5"
							>
								Resume Role Interview <ChevronRight className="w-4 h-4" />
							</button>
							<button 
								onClick={() => navigate('/roadmap')}
								className="px-6 py-3 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all"
							>
								View AI Roadmap
							</button>
						</div>
					</div>
					
					<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4 w-full md:w-auto">
						{stats.map((stat, i) => (
							<div key={i} className="glass-card !p-4 flex items-center gap-4 border border-white/5 hover:border-white/20 transition-all">
								<div className={`p-3 rounded-xl ${stat.color}`}>
									{stat.icon}
								</div>
								<div>
									<div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
									<div className="text-xl font-black text-white">{stat.value}</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* AI Insight Hub */}
			<div className="glass-card relative overflow-hidden group border-indigo-500/30">
				<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
				<div className="relative p-8 flex items-start gap-6">
					<div className="flex-shrink-0 relative">
						<div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
							<Sparkles className="w-8 h-8 animate-pulse" />
						</div>
						<div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1e293b] animate-bounce"></div>
					</div>
					<div className="flex-grow space-y-2">
						<h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
							Neural Insight Engine
							<span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 normal-case tracking-normal">Active</span>
						</h3>
						<p className="text-2xl text-white font-black leading-tight">
							"{aiInsights?.insight || "Calibrating your learning path... analyzing recent session data."}"
						</p>
						<div className="flex items-center gap-4 pt-2">
							<div className="flex items-center gap-2 text-xs text-gray-400">
								<div className="w-2 h-2 rounded-full bg-indigo-500"></div>
								Priority Focus: <span className="text-indigo-300 font-bold uppercase">{aiInsights?.prioritySkill || "General Mastery"}</span>
							</div>
						</div>
					</div>
					<button
						onClick={() => document.getElementById('available-tests')?.scrollIntoView({ behavior: 'smooth' })}
						className="flex-shrink-0 bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all group-hover:border-indigo-500/50"
					>
						<ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white" />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
				{/* Main Content Area */}
				<div className="lg:col-span-2 space-y-10">
						{/* Featured AI Recommendation */}
						<section className="space-y-6">
							<div className="flex items-center justify-between">
								<h2 className="text-2xl font-black text-white flex items-center gap-3">
									<BrainCircuit className="w-6 h-6 text-indigo-400" /> AI For You
								</h2>
								<div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
									<Clock className="w-3 h-3" /> UPDATED JUST NOW
								</div>
							</div>
							
							{recommendations ? (
								<div 
									onClick={() => navigate(`/tests/${recommendations.id}`)}
									className="group glass-card border-indigo-500/30 hover:border-indigo-500/60 p-1 transition-all cursor-pointer relative overflow-hidden"
								>
									<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
									<div className="p-8 flex flex-col md:flex-row gap-10">
										<div className="w-full md:w-48 aspect-square rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-800 flex items-center justify-center relative overflow-hidden shadow-2xl shrink-0">
											<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
											<BrainCircuit className="w-24 h-24 text-white group-hover:scale-110 transition-transform duration-500" />
											<div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/40 text-[10px] font-bold text-white uppercase tracking-tighter">AI Match</div>
										</div>
										<div className="flex-grow space-y-6">
											<div className="space-y-2">
												<div className="flex items-center gap-2">
													<span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Ready to launch</span>
													<span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">• Highly Relevant</span>
												</div>
												<h3 className="text-3xl font-black text-white group-hover:text-indigo-300 transition-colors">{recommendations.title}</h3>
												<p className="text-gray-400 text-lg leading-relaxed font-medium">{recommendations.description}</p>
											</div>
											<div className="flex items-center gap-8">
												<div className="flex items-center gap-2">
													<Clock className="w-4 h-4 text-indigo-400" />
													<span className="text-sm font-bold text-gray-300">{recommendations.duration}m Duration</span>
												</div>
												<div className="flex items-center gap-2">
													<Target className="w-4 h-4 text-emerald-400" />
													<span className="text-sm font-bold text-gray-300">{recommendations.questions?.length || 0} Expert Questions</span>
												</div>
											</div>
										</div>
										<div className="md:self-center">
											<div className="w-16 h-16 rounded-2xl bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] group-hover:shadow-indigo-500/50">
												<ChevronRight className="w-10 h-10" />
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="glass-card p-20 text-center border-dashed border-indigo-500/20">
									<div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6 shadow-[0_0_15px_rgba(99,102,241,0.4)]"></div>
									<p className="text-indigo-300 font-bold font-mono text-sm tracking-[0.3em]">SYNCHRONIZING WITH YOUR AI PROFILE...</p>
								</div>
							)}
						</section>

					{/* Test List Section */}
					<section id="available-tests" className="space-y-6 scroll-mt-8">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-black text-white flex items-center gap-3">
								<BookOpen className="w-6 h-6 text-indigo-400" /> Available Tests
							</h2>
						</div>
						<TestList />
					</section>
				</div>

				{/* Sidebar Section */}
				<div className="space-y-10">
					{/* Skill Progression */}
					<section className="glass-card p-6 space-y-6">
						<h3 className="text-lg font-bold text-white">Skill Progression</h3>
						<div className="space-y-4">
							{studentData?.analytics?.skillProgression ? (
								Object.entries(studentData.analytics.skillProgression).map(([skill, score]: [string, any]) => (
									<div key={skill} className="space-y-2">
										<div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
											<span>{skill}</span>
											<span className="text-indigo-400">{score}%</span>
										</div>
										<div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
											<div 
												className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
												style={{ width: `${score}%` }}
											></div>
										</div>
									</div>
								))
							) : (
								['Logic', 'Algorithms', 'Architecture'].map((skill, i) => (
									<div key={skill} className="space-y-2">
										<div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
											<span>{skill}</span>
											<span className="text-indigo-400">{30 + (i * 15)}%</span>
										</div>
										<div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
											<div 
												className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
												style={{ width: `${30 + (i * 15)}%` }}
											></div>
										</div>
									</div>
								))
							)}
						</div>
					</section>

					{/* AI Predictive Milestone */}
					<section className="glass-card overflow-hidden border-emerald-500/30">
						<div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 p-6 border-b border-white/10 relative overflow-hidden">
							<div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full -mr-12 -mt-12"></div>
							<h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
								<TrendingUp className="w-5 h-5 text-emerald-400" />
								AI Projection
							</h3>
							<p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Predictive Milestone</p>
						</div>
						<div className="p-8 space-y-8 text-center relative group">
							<div className="space-y-1">
								<div className="text-5xl font-black text-white font-mono tracking-tighter">
									{milestones?.daysRemaining || "--"}
									<span className="text-sm text-gray-500 font-bold ml-2 underline decoration-emerald-500/30 decoration-4">DAYS</span>
								</div>
								<div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">To {milestones?.milestoneName || "Senior Engineer"} goal</div>
							</div>

							<div className="space-y-3">
								<div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
									<span>Goal Probability</span>
									<span className="text-emerald-400">{milestones?.probabilityOfSuccess || 0}% Accuracy</span>
								</div>
								<div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
									<div 
										className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
										style={{ width: `${milestones?.probabilityOfSuccess || 75}%` }}
									></div>
								</div>
							</div>

							<div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-left">
								<p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Recommended Focus</p>
								<div className="flex items-center gap-2 text-sm text-white font-bold">
									<Zap className="w-4 h-4 text-emerald-400" />
									Master {milestones?.nextBigSkill || "Advanced Systems"}
								</div>
							</div>

							<button 
								onClick={() => navigate('/roadmap')}
								className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-all"
							>
								View Probabilistic Roadmap
							</button>
						</div>
					</section>

					{/* Career Goals */}
					<section className="glass-card p-6 space-y-4 border-indigo-500/20">
						<h3 className="text-lg font-bold text-white flex items-center justify-between">
							AI-Aligned Goals
							<Target className="w-4 h-4 text-indigo-400" />
						</h3>
						<div className="space-y-2">
							{user?.learningGoals?.map((goal: string) => (
								<div key={goal} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
									<div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
										<Target className="w-4 h-4" />
									</div>
									<span className="text-sm font-medium text-gray-300">{goal}</span>
								</div>
							)) || (
								<p className="text-sm text-gray-500 italic">No goals set yet. Update your profile!</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
