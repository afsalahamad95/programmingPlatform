import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { 
	User, Terminal, Code2, BrainCircuit, Save, ShieldCheck, 
	Settings, Activity, Target, Trophy, Clock, Lock, Mail, Edit3, LogOut, Award, ExternalLink, Link as LinkIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";

const ROLES = [
	{ id: "frontend", name: "Frontend Developer", icon: <User className="w-5 h-5" /> },
	{ id: "backend", name: "Backend Developer", icon: <Terminal className="w-5 h-5" /> },
	{ id: "fullstack", name: "Full Stack Engineer", icon: <Code2 className="w-5 h-5" /> },
	{ id: "ai", name: "AI/ML Engineer", icon: <BrainCircuit className="w-5 h-5" /> },
];

const PREFERENCES_LIST = [
	"React", "Go", "Python", "Node.js", "TypeScript", 
	"SQL", "MongoDB", "Algorithms", "System Design", "AWS", "Docker"
];

const METRICS = [
	{ label: "Challenges Solved", value: "34", icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
	{ label: "Interviews", value: "12", icon: <Activity className="w-5 h-5 text-emerald-400" /> },
	{ label: "Avg Score", value: "92%", icon: <Target className="w-5 h-5 text-indigo-400" /> },
	{ label: "Time Spent", value: "48h", icon: <Clock className="w-5 h-5 text-purple-400" /> },
];

const Bot = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="14" x="3" y="7" rx="2" ry="2"/><path d="M12 7V3"/><path d="M9 3h6"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M10 17h4"/>
  </svg>
);

const CERTIFICATIONS = [
  { id: 1, title: "AI Interview Mastery", date: "Mar 2026", issuer: "Programming Platform", txHash: "0x8fB2...A49c", verifyLink: "#", network: "Polygon", icon: <Bot className="w-6 h-6 text-pink-400" /> },
  { id: 2, title: "Advanced React Patterns", date: "Jan 2026", issuer: "Programming Platform", txHash: "0x3aE1...9fBb", verifyLink: "#", network: "Ethereum", icon: <Code2 className="w-6 h-6 text-emerald-400" /> }
];

const Profile = () => {
	const { user, checkAuth, logout } = useAuth();
	const [activeTab, setActiveTab] = useState<"overview" | "preferences" | "settings" | "certifications">("overview");
	const [isUpdating, setIsUpdating] = useState(false);
	
	const [formData, setFormData] = useState({
		targetRole: user?.targetRole || "fullstack",
		preferences: user?.preferences || [],
		fullName: user?.fullName || "",
		email: user?.email || "",
		bio: "Passionate developer building scalable systems."
	});

	const handlePreferenceToggle = (pref: string) => {
		setFormData(prev => ({
			...prev,
			preferences: prev.preferences.includes(pref)
				? prev.preferences.filter(p => p !== pref)
				: [...prev.preferences, pref]
		}));
	};

	const handleSave = async () => {
		if (!user) return;
		
		setIsUpdating(true);
		try {
			await api.put(`/users/${user.id}`, {
				targetRole: formData.targetRole,
				preferences: formData.preferences,
				fullName: formData.fullName
			});
			checkAuth();
			toast.success("Profile updated successfully!");
		} catch (err) {
			console.error("Failed to update profile:", err);
			toast.error("Failed to update profile.");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleLogoutClick = () => {
		logout();
		toast.success("Logged out manually");
	};

	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-gray-200">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
				<div className="flex items-center gap-6">
					<div className="relative group">
						<div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-2xl transform transition-transform group-hover:scale-105">
							{user?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
						</div>
						<div className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
							<Edit3 className="w-8 h-8 text-white" />
						</div>
					</div>
					<div>
						<h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
							{user?.fullName || "Developer User"}
						</h1>
						<div className="flex items-center gap-3 mt-2">
							<span className="text-gray-400">{user?.email}</span>
							<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium tracking-wide">
								<ShieldCheck className="w-3.5 h-3.5" /> Verified
							</span>
							<span className="inline-flex items-center gap-1px px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-widest ml-1 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
								Top 10%
							</span>
						</div>
					</div>
				</div>
				<div className="flex gap-4">
					<button
						onClick={handleLogoutClick}
						className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-red-500/10"
					>
						<LogOut className="w-4 h-4" />
						Sign Out
					</button>
					<button
						onClick={handleSave}
						disabled={isUpdating}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50"
					>
						{isUpdating ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
						Save Profile
					</button>
				</div>
			</div>

			{/* Custom Tabs */}
			<div className="flex space-x-1 border-b border-white/10 mb-8 overflow-x-auto scroller-hide">
				{[
					{ id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
					{ id: "preferences", label: "Career & Skills", icon: <Target className="w-4 h-4" /> },
					{ id: "certifications", label: "Certifications & Badges", icon: <Award className="w-4 h-4" /> },
					{ id: "settings", label: "Account Settings", icon: <Settings className="w-4 h-4" /> }
				].map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id as any)}
						className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
							activeTab === tab.id
								? "border-indigo-500 text-indigo-400"
								: "border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20"
						}`}
					>
						{tab.icon} {tab.label}
					</button>
				))}
			</div>

			{/* Content Area */}
			<div className="space-y-8 animate-fade-in relative z-10">
				
				{/* Tab: Overview */}
				{activeTab === "overview" && (
					<div className="space-y-8 animate-slide-up">
						{/* Metrics Grid */}
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
							{METRICS.map((metric, idx) => (
								<div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors">
									<div className="p-3 bg-black/20 rounded-xl mb-4">
										{metric.icon}
									</div>
									<div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
									<div className="text-xs font-medium text-gray-500 uppercase tracking-widest">{metric.label}</div>
								</div>
							))}
						</div>

						{/* Recent Activity / Bio */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							<div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl">
								<h3 className="text-xl font-bold text-white mb-6">About Me</h3>
								<textarea
									value={formData.bio}
									onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
									className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
									placeholder="Tell us about your developer journey..."
								/>
							</div>
							<div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 p-6 sm:p-8 rounded-2xl">
								<h3 className="text-xl font-bold text-white mb-4">Focus Goal</h3>
								<div className="p-4 bg-black/20 rounded-xl border border-white/5 mb-4">
									<div className="text-sm text-indigo-300 mb-1">Current Track</div>
									<div className="font-bold text-lg text-white">
										{ROLES.find(r => r.id === formData.targetRole)?.name || "Not Set"}
									</div>
								</div>
								<p className="text-sm text-gray-400">Keep completing challenges to improve your ranking in this track.</p>
							</div>
						</div>
					</div>
				)}

				{/* Tab: Preferences */}
				{activeTab === "preferences" && (
					<div className="space-y-8 animate-slide-up">
						<section className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl">
							<h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
								<Terminal className="w-5 h-5 text-indigo-400" />
								Target Career Path
							</h3>
							<p className="text-sm text-gray-400 mb-6">Your selected path tailors your mock interviews and challenge recommendations.</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{ROLES.map(role => (
									<button
										key={role.id}
										onClick={() => setFormData({ ...formData, targetRole: role.id })}
										className={`text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
											formData.targetRole === role.id 
												? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
												: 'border-white/5 hover:border-white/20 hover:bg-white-[0.02]'
										}`}
									>
										<div className={`p-3 rounded-lg ${formData.targetRole === role.id ? 'text-indigo-400 bg-indigo-500/20' : 'text-gray-500 bg-black/30'}`}>
											{role.icon}
										</div>
										<span className={`font-semibold text-lg ${formData.targetRole === role.id ? 'text-white' : 'text-gray-300'}`}>
											{role.name}
										</span>
									</button>
								))}
							</div>
						</section>

						<section className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl">
							<h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
								<Code2 className="w-5 h-5 text-emerald-400" />
								Technical Skills & Stack
							</h3>
							<p className="text-sm text-gray-400 mb-6">Select the tools and languages you are most comfortable with.</p>
							<div className="flex flex-wrap gap-3">
								{PREFERENCES_LIST.map(pref => (
									<button
										key={pref}
										onClick={() => handlePreferenceToggle(pref)}
										className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
											formData.preferences.includes(pref)
												? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
												: 'bg-black/20 text-gray-400 border-white/10 hover:border-white/30 hover:text-gray-200'
										}`}
									>
										{pref}
									</button>
								))}
							</div>
						</section>
					</div>
				)}

				{/* Tab: Settings */}
				{activeTab === "settings" && (
					<div className="max-w-3xl space-y-8 animate-slide-up">
						<section className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl space-y-6">
							<h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Personal Information</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<User className="h-5 w-5 text-gray-500" />
										</div>
										<input
											type="text"
											value={formData.fullName}
											onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
											className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Mail className="h-5 w-5 text-gray-500" />
										</div>
										<input
											type="email"
											disabled
											value={formData.email}
											className="block w-full pl-10 pr-3 py-2.5 border border-white/5 rounded-xl bg-black/40 text-gray-500 cursor-not-allowed"
										/>
									</div>
									<p className="mt-1 text-xs text-gray-500">Email addresses cannot be changed currently.</p>
								</div>
							</div>
						</section>

						<section className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl space-y-6">
							<h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Security</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Lock className="h-5 w-5 text-gray-500" />
										</div>
										<input
											type="password"
											placeholder="••••••••"
											className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Lock className="h-5 w-5 text-gray-500" />
										</div>
										<input
											type="password"
											placeholder="Leave blank to keep current"
											className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
										/>
									</div>
								</div>
							</div>
						</section>
					</div>
				)}

				{/* Tab: Certifications */}
				{activeTab === "certifications" && (
					<div className="space-y-8 animate-slide-up">
						<div className="bg-indigo-900/20 border border-indigo-500/20 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
									<Award className="w-6 h-6 text-indigo-400" />
									Immutable Blockchain Credentials
								</h3>
								<p className="text-sm text-indigo-200">Your verified achievements are permanently recorded on public blockchains ensuring trustless validation by future employers.</p>
							</div>
							<div className="flex -space-x-3">
								<div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-black flex items-center justify-center">
									<img src="https://cryptologos.cc/logos/polygon-matic-logo.svg" className="w-5 h-5 opacity-80" alt="Polygon" />
								</div>
								<div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-black flex items-center justify-center">
									<img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" className="w-5 h-5 opacity-80" alt="Ethereum" />
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{CERTIFICATIONS.map(cert => (
								<div key={cert.id} className="relative group overflow-hidden bg-black/40 border border-white/10 p-1 rounded-2xl transition-all hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]">
									<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
									<div className="relative bg-white/5 backdrop-blur-md p-6 rounded-xl h-full flex flex-col justify-between">
										
										<div className="flex justify-between items-start mb-6">
											<div className="p-3 bg-black/50 border border-white/10 rounded-xl">
												{cert.icon}
											</div>
											<span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cert.network === 'Polygon' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
												{cert.network}
											</span>
										</div>
										
										<div>
											<h4 className="text-lg font-bold text-white mb-1">{cert.title}</h4>
											<p className="text-sm text-gray-400 mb-6 flex items-center gap-2">
												Issued by <span className="font-semibold text-gray-300">{cert.issuer}</span>
											</p>
											
											<div className="pt-4 border-t border-white/10 flex flex-col gap-3">
												<div className="flex justify-between items-center text-xs text-gray-500">
													<span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Date Earned</span>
													<strong className="text-gray-300 font-medium">{cert.date}</strong>
												</div>
												<div className="flex justify-between items-center text-xs text-gray-500">
													<span className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> TxHash</span>
													<a href={cert.verifyLink} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono">
														{cert.txHash} <ExternalLink className="w-3 h-3" />
													</a>
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Profile;
