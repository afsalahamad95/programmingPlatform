import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setAuthToken } from "../api";

const OAuthCallback: React.FC = () => {
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const handleCallback = async () => {
			// Parse the token from the URL query params
			const params = new URLSearchParams(location.search);
			const token = params.get("token");

			if (!token) {
				setError("No authentication token received");
				return;
			}

			try {
				// Store the token and set up auth
				localStorage.setItem("authToken", token);
				setAuthToken(token);

				// Redirect to the dashboard
				navigate("/");
			} catch (err) {
				console.error("OAuth callback error:", err);
				setError("Failed to process authentication");
			}
		};

		handleCallback();
	}, [location.search, navigate]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-100">
				<div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
					<div className="text-center">
						<h2 className="text-2xl font-bold text-red-600 mb-4">
							Authentication Error
						</h2>
						<p className="text-gray-700 mb-4">{error}</p>
						<button
							onClick={() => navigate("/login")}
							className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
						>
							Return to Login
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-gray-800 mb-4">
						Authenticating...
					</h2>
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
				</div>
			</div>
		</div>
	);
};

export default OAuthCallback;
