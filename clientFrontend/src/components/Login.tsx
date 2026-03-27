import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock, LogIn, Github, Chrome } from "lucide-react";

const Login = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await login(email, password);
			navigate("/");
		} catch (err) {
			setError("Invalid email or password");
		}
	};

	return (
		<div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
			{/* Dynamic Background Orbs */}
			<div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
			<div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
			<div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

			<div className="glass-card max-w-md w-full space-y-8 p-10 relative z-10 border border-white/10 backdrop-blur-2xl shadow-2xl">
				<div className="text-center">
					<div className="mx-auto h-16 w-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-6">
						<LogIn className="w-8 h-8 text-white -rotate-3" />
					</div>
					<h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
						Welcome Back
					</h2>
					<p className="mt-2 text-sm text-gray-400 font-medium">
						Elevate your coding journey today
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div className="relative group">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="glass-input block w-full pl-11 pr-3 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 transition-all"
								placeholder="Email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="relative group">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="glass-input block w-full pl-11 pr-3 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 transition-all"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					{error && (
						<div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-shake">
							{error}
						</div>
					)}

					<button
						type="submit"
						className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/25"
					>
						Sign In
					</button>

					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-white/10"></div>
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="px-2 bg-transparent text-gray-500 backdrop-blur-sm">Or continue with</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<button type="button" className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium">
							<Chrome className="w-4 h-4" /> Google
						</button>
						<button type="button" className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium">
							<Github className="w-4 h-4" /> GitHub
						</button>
					</div>

					<div className="text-center mt-6">
						<p className="text-sm text-gray-500 font-medium">
							New here?{" "}
							<Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
								Create an account
							</Link>
						</p>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
