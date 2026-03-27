import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { User, Code2, BrainCircuit, Terminal, Sparkles, ChevronRight, ChevronLeft, Target, Rocket } from "lucide-react";

const ROLES = [
	{ id: "frontend", name: "Frontend Developer", icon: <User className="w-5 h-5" /> },
	{ id: "backend", name: "Backend Developer", icon: <Terminal className="w-5 h-5" /> },
	{ id: "fullstack", name: "Full Stack Engineer", icon: <Code2 className="w-5 h-5" /> },
	{ id: "ai", name: "AI/ML Engineer", icon: <BrainCircuit className="w-5 h-5" /> },
];

const PREFERENCES_LIST = ["React", "Go", "Python", "Node.js", "TypeScript", "SQL", "MongoDB", "Algorithms", "Docker", "AWS"];

const GOALS = [
	{ id: "job", name: "Get a Job", icon: <Target className="w-4 h-4" /> },
	{ id: "skill", name: "Upskill", icon: <Rocket className="w-4 h-4" /> },
	{ id: "project", name: "Build Projects", icon: <Code2 className="w-4 h-4" /> },
];

const Register = () => {
	const navigate = useNavigate();
	const { register } = useAuth();
	
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		targetRole: "",
		preferences: [] as string[],
		learningGoals: [] as string[],
		experience: "Beginner",
	});
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handlePreferenceToggle = (pref: string) => {
		setFormData(prev => ({
			...prev,
			preferences: prev.preferences.includes(pref)
				? prev.preferences.filter(p => p !== pref)
				: [...prev.preferences, pref]
		}));
	};

	const handleGoalToggle = (goal: string) => {
		setFormData(prev => ({
			...prev,
			learningGoals: prev.learningGoals.includes(goal)
				? prev.learningGoals.filter(g => g !== goal)
				: [...prev.learningGoals, goal]
		}));
	};

	const nextStep = () => {
		if (step === 1) {
			if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
				setError("Please fill in all identity fields");
				return;
			}
		}
		if (step === 2) {
			if (!formData.targetRole || formData.preferences.length === 0) {
				setError("Please select your role and at least one tech");
				return;
			}
		}
		setError("");
		setStep(prev => prev + 1);
	};

	const prevStep = () => setStep(prev => prev - 1);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (step < 3) {
			nextStep();
			return;
		}

		try {
			setIsSubmitting(true);
			await register(formData);
			navigate("/");
		} catch (err: any) {
			setError(err.response?.data?.error || "Registration failed. Try a different email.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
			{/* Animated Background */}
			<div className="absolute inset-0 z-0">
				<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
				<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
			</div>

			<div className="glass-card max-w-2xl w-full space-y-8 p-10 relative z-10 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
				<div className="relative z-20">
					<div className="text-center mb-8">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4 uppercase tracking-wider">
							<Sparkles className="w-3 h-3" /> Step {step} of 3
						</div>
						<h2 className="text-4xl font-black text-white tracking-tight">
							{step === 1 ? "Start Your Journey" : step === 2 ? "Your Career Path" : "Final Personalization"}
						</h2>
						<p className="mt-2 text-gray-400 font-medium text-sm">
							{step === 1 ? "Secure your spot in the future of coding" : step === 2 ? "Tell us what you want to build" : "Let AI tailor the experience for you"}
						</p>
					</div>

					{/* Progress bar */}
					<div className="h-1.5 w-full bg-white/5 rounded-full mb-10 overflow-hidden">
						<div 
							className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
							style={{ width: `${(step / 3) * 100}%` }}
						></div>
					</div>

					<form className="space-y-8" onSubmit={handleSubmit}>
						{step === 1 && (
							<div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-xs font-bold text-gray-500 uppercase ml-1">First Name</label>
										<input
											required
											className="glass-input w-full px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
											placeholder="Jane"
											value={formData.firstName}
											onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
										/>
									</div>
									<div className="space-y-1">
										<label className="text-xs font-bold text-gray-500 uppercase ml-1">Last Name</label>
										<input
											required
											className="glass-input w-full px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
											placeholder="Doe"
											value={formData.lastName}
											onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
										/>
									</div>
								</div>
								<div className="space-y-1">
									<label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
									<input
										type="email"
										required
										className="glass-input w-full px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
										placeholder="jane@example.com"
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									/>
								</div>
								<div className="space-y-1">
									<label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
									<input
										type="password"
										required
										className="glass-input w-full px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
										placeholder="••••••••"
										value={formData.password}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									/>
								</div>
							</div>
						)}

						{step === 2 && (
							<div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
								<div>
									<h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
										<Rocket className="w-4 h-4 text-indigo-400" /> Choose Your Target Role
									</h3>
									<div className="grid grid-cols-2 gap-3">
										{ROLES.map(role => (
											<button
												type="button"
												key={role.id}
												onClick={() => setFormData({ ...formData, targetRole: role.id })}
												className={`p-4 rounded-xl border text-left transition-all ${
													formData.targetRole === role.id 
														? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20' 
														: 'border-white/5 bg-white/5 hover:bg-white/10'
												}`}
											>
												<div className={`mb-2 ${formData.targetRole === role.id ? 'text-indigo-400' : 'text-gray-400'}`}>
													{role.icon}
												</div>
												<div className={`text-sm font-bold ${formData.targetRole === role.id ? 'text-white' : 'text-gray-300'}`}>
													{role.name}
												</div>
											</button>
										))}
									</div>
								</div>

								<div>
									<h3 className="text-sm font-bold text-white mb-4">Tech Stack Interests</h3>
									<div className="flex flex-wrap gap-2">
										{PREFERENCES_LIST.map(pref => (
											<button
												type="button"
												key={pref}
												onClick={() => handlePreferenceToggle(pref)}
												className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
													formData.preferences.includes(pref)
														? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
														: 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
												}`}
											>
												{pref}
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{step === 3 && (
							<div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
								<div>
									<h3 className="text-sm font-bold text-white mb-4">Your Primary Goals</h3>
									<div className="grid grid-cols-1 gap-3">
										{GOALS.map(goal => (
											<button
												type="button"
												key={goal.id}
												onClick={() => handleGoalToggle(goal.name)}
												className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
													formData.learningGoals.includes(goal.name)
														? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' 
														: 'border-white/5 bg-white/5 hover:bg-white/10'
												}`}
											>
												<div className={`p-2 rounded-lg bg-black/20 ${formData.learningGoals.includes(goal.name) ? 'text-emerald-400' : 'text-gray-500'}`}>
													{goal.icon}
												</div>
												<span className={`font-bold ${formData.learningGoals.includes(goal.name) ? 'text-white' : 'text-gray-400'}`}>
													{goal.name}
												</span>
											</button>
										))}
									</div>
								</div>

								<div>
									<h3 className="text-sm font-bold text-white mb-4">Experience Level</h3>
									<select 
										className="glass-input w-full py-3 px-4 text-white"
										value={formData.experience}
										onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
									>
										<option value="Beginner" className="bg-gray-900">Beginner (Zero to 1 year)</option>
										<option value="Intermediate" className="bg-gray-900">Intermediate (1-3 years)</option>
										<option value="Advanced" className="bg-gray-900">Advanced (3+ years)</option>
									</select>
								</div>
							</div>
						)}

						{error && (
							<div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/20 animate-shake">
								{error}
							</div>
						)}

						<div className="flex gap-4 pt-4 border-t border-white/5">
							{step > 1 && (
								<button
									type="button"
									onClick={prevStep}
									className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 border border-white/10 text-sm font-bold rounded-xl text-white bg-white/5 hover:bg-white/10 transition-all"
								>
									<ChevronLeft className="w-4 h-4" /> Back
								</button>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-6 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 transition-all"
							>
								{isSubmitting ? "Processing..." : (step < 3 ? "Next Step" : "Launch My Career")}
								{step < 3 && <ChevronRight className="w-4 h-4" />}
							</button>
						</div>
						
						<div className="text-center space-y-4">
							<p className="text-sm text-gray-400">
								Already have an account?{" "}
								<Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
									Sign in
								</Link>
							</p>
							<p className="text-xs text-gray-500 font-medium">
								By joining, you agree to our <span className="text-indigo-400/50">Terms of Service</span>
							</p>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default Register;
