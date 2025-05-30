import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";

interface LoginProps {
	onLoginSuccess: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const response = await api.login(email, password);
			console.log(response);
			if (response.token) {
				if (response.user?.role !== "admin") {
					setError("Access denied. Admin privileges required.");
					return;
				}

				api.setAuthToken(response.token);
				localStorage.setItem("userRole", response.role);
				onLoginSuccess(response.token);
				navigate("/");
			} else {
				setError("Invalid response from server");
			}
		} catch (err: any) {
			setError(
				err.response?.data?.error ||
					err.message ||
					"Failed to login. Please check your credentials."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOAuthLogin = (provider: string) => {
		// Redirect to the OAuth provider's authorization URL
		window.location.href = `/api/auth/oauth/${provider}`;
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
				<h1 className="text-2xl font-bold text-center mb-6">
					Admin Login
				</h1>

				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
						{error}
					</div>
				)}

				<form onSubmit={handleEmailLogin} className="space-y-4">
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700"
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="your@email.com"
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="••••••••"
						/>
					</div>

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
						>
							{isLoading ? "Logging in..." : "Login with Email"}
						</button>
					</div>
				</form>

				<div className="mt-6">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white text-gray-500">
								Or continue with
							</span>
						</div>
					</div>

					<div className="mt-6 grid grid-cols-2 gap-3">
						<button
							onClick={() => handleOAuthLogin("google")}
							className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
						>
							<svg
								className="w-5 h-5 mr-2"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
							</svg>
							Google
						</button>

						<button
							onClick={() => handleOAuthLogin("github")}
							className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
						>
							<svg
								className="w-5 h-5 mr-2"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							GitHub
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
