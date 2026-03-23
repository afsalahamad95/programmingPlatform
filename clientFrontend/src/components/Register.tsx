import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { User, Code2, BrainCircuit, Terminal } from "lucide-react";

const ROLES = [
	{ id: "frontend", name: "Frontend Developer", icon: <User className="w-5 h-5" /> },
	{ id: "backend", name: "Backend Developer", icon: <Terminal className="w-5 h-5" /> },
	{ id: "fullstack", name: "Full Stack Engineer", icon: <Code2 className="w-5 h-5" /> },
	{ id: "ai", name: "AI/ML Engineer", icon: <BrainCircuit className="w-5 h-5" /> },
];

const PREFERENCES_LIST = ["React", "Go", "Python", "Node.js", "TypeScript", "SQL", "MongoDB", "Algorithms"];

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (step === 1) {
			if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
				setError("Please fill in all fields");
				return;
			}
			setError("");
			setStep(2);
			return;
		}

		if (step === 2) {
			if (!formData.targetRole) {
				setError("Please select a target role");
				return;
			}
			if (formData.preferences.length === 0) {
				setError("Please select at least one technology");
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
		}
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="glass-card max-w-xl w-full space-y-8 p-8 relative overflow-hidden">
				{/* Decorative elements */}
				<div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
				<div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

				<div className="relative z-10">
					<div className="text-center">
						<h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
							Create Account
						</h2>
						<p className="mt-2 text-sm text-gray-400">
							{step === 1 ? "Start your journey" : "Personalize your experience"}
						</p>
					</div>

					{/* Progress Indicator */}
					<div className="mt-6 flex justify-center items-center space-x-4">
						<div className={`h-2 rounded-full w-16 transition-colors duration-300 ${step >= 1 ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
						<div className={`h-2 rounded-full w-16 transition-colors duration-300 ${step >= 2 ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
					</div>

					<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
						{step === 1 && (
							<div className="space-y-4 animate-fade-in">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-xs text-gray-400 mb-1">First Name</label>
										<input
											required
											className="glass-input w-full px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
											placeholder="Jane"
											value={formData.firstName}
											onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-400 mb-1">Last Name</label>
										<input
											required
											className="glass-input w-full px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
											placeholder="Doe"
											value={formData.lastName}
											onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
										/>
									</div>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-1">Email Address</label>
									<input
										type="email"
										required
										className="glass-input w-full px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
										placeholder="jane@example.com"
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-1">Password</label>
									<input
										type="password"
										required
										className="glass-input w-full px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
										placeholder="••••••••"
										value={formData.password}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									/>
								</div>
							</div>
						)}

						{step === 2 && (
							<div className="space-y-6 animate-fade-in">
								<div>
									<h3 className="text-sm font-medium text-gray-300 mb-3">Target Career Role</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{ROLES.map(role => (
											<div
												key={role.id}
												onClick={() => setFormData({ ...formData, targetRole: role.id })}
												className={`cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all ${
													formData.targetRole === role.id 
														? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
														: 'border-white/10 hover:border-white/30 bg-white/5'
												}`}
											>
												<div className={`p-2 rounded-md ${formData.targetRole === role.id ? 'text-indigo-400' : 'text-gray-400'}`}>
													{role.icon}
												</div>
												<span className={`text-sm font-medium ${formData.targetRole === role.id ? 'text-white' : 'text-gray-300'}`}>
													{role.name}
												</span>
											</div>
										))}
									</div>
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-300 mb-3">Technologies & Interests</h3>
									<div className="flex flex-wrap gap-2">
										{PREFERENCES_LIST.map(pref => (
											<button
												type="button"
												key={pref}
												onClick={() => handlePreferenceToggle(pref)}
												className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
													formData.preferences.includes(pref)
														? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
														: 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
												}`}
											>
												{pref}
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{error && (
							<div className="text-red-400 text-sm p-3 bg-red-500/10 rounded border border-red-500/20">
								{error}
							</div>
						)}

						<div className="flex gap-4 pt-4">
							{step === 2 && (
								<button
									type="button"
									onClick={() => setStep(1)}
									className="group relative w-1/3 flex justify-center py-2.5 px-4 border border-white/20 text-sm font-medium rounded-md text-white bg-transparent hover:bg-white/5 transition-colors"
								>
									Back
								</button>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className={`group relative flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white glass-button-primary ${step === 2 ? 'w-2/3' : 'w-full'}`}
							>
								{isSubmitting ? "Creating Account..." : (step === 1 ? "Next Step" : "Complete Registration")}
							</button>
						</div>
						
						<div className="text-center mt-4">
							<p className="text-sm text-gray-400">
								Already have an account?{" "}
								<Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
									Sign in
								</Link>
							</p>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default Register;
