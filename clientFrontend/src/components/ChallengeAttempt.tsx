import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChallenge, submitChallengeAttempt } from "../api";
import { Challenge, ValidationResult } from "../types";
import CodeEditor from "./CodeEditor";
import ChallengeTimer from "./ChallengeTimer";

// Helper function to format output
const formatCodeOutput = (output: string | null | undefined): string => {
	if (output === null || output === undefined) return "(No output generated)";
	if (output.trim() === "") return "(Empty output)";
	return output;
};

// Helper function to normalize output for comparison (should match backend logic)
const normalizeOutput = (output: string): string => {
	// Trim spaces and remove trailing newlines
	output = output.trim();

	// Remove carriage returns (Windows line endings)
	output = output.replace(/\r/g, "");

	// Replace multiple whitespace with single space
	output = output.replace(/\s+/g, " ");

	return output;
};

const ChallengeAttempt: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [challenge, setChallenge] = useState<Challenge | null>(null);
	const [code, setCode] = useState<string>("");
	const [timeSpent, setTimeSpent] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(true);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [validationResult, setValidationResult] =
		useState<ValidationResult | null>(null);
	const [showingResult, setShowingResult] = useState<boolean>(false);
	const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);
	const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
	const [hasPassedCheck, setHasPassedCheck] = useState<boolean>(false);

	// Proctoring States
	const [warnings, setWarnings] = useState(0);
	const [proctoringActive, setProctoringActive] = useState(false);
	const [violationMessage, setViolationMessage] = useState<string | null>(null);
	const [hasStarted, setHasStarted] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const lastViolationRef = useRef<number>(0);
	const codeRef = useRef(code);
	
	useEffect(() => {
		codeRef.current = code;
	}, [code]);

	// Fetch challenge data
	useEffect(() => {
		const fetchChallenge = async () => {
			try {
				if (!id) return;

				setLoading(true);
				const data = await getChallenge(id);
				setChallenge(data);
				setCode(data.starterCode || "");
				setError(null);

				// Check if the challenge is still active based on timing
				const now = new Date();
				if (data.endTime && new Date(data.endTime) < now) {
					setIsTimeExpired(true);
					setError(
						"This challenge has ended and is no longer available for submission."
					);
					// Remove timer from localStorage
					const timerKey = `challenge_timer_${id}`;
					localStorage.removeItem(timerKey);
				}
			} catch (err) {
				console.error("Failed to fetch challenge:", err);
				setError("Failed to load challenge. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchChallenge();
	}, [id]);

	// Handle code changes
	const handleCodeChange = (value: string) => {
		setCode(value);
		if (hasPassedCheck) {
			setHasPassedCheck(false);
			setShowingResult(false);
		}
	};

	// Handle time updates
	const handleTimeUpdate = (time: number) => {
		setTimeSpent(time);
	};


	const handleStartChallenge = async () => {
		try {
			// 1. Request Webcam
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			setProctoringActive(true);

			// 2. Request Fullscreen
			const elem = document.documentElement;
			if (elem.requestFullscreen && !document.fullscreenElement) {
				await elem.requestFullscreen().catch(e => console.log("Fullscreen request denied", e));
			}

			setHasStarted(true);
		} catch (err) {
			console.error("Proctoring failed to start:", err);
			alert("Proctoring Error: Please ensure you grant webcam permissions. Access is required to start.");
		}
	};

	// Proctoring Event Listeners
	useEffect(() => {
		if (loading || !challenge || isSubmitted || !hasStarted) return;

		// 3. Tab switching & window blur tracking
		const handleVisibilityChange = () => {
			if (document.hidden && !isSubmitted) {
				handleViolation();
			}
		};

		const handleBlur = () => {
			if (!isSubmitted) {
				handleViolation();
			}
		};
		
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("blur", handleBlur);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("blur", handleBlur);
		};
	}, [loading, challenge, isSubmitted, hasStarted]);

	useEffect(() => {
		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(e => console.log(e));
			}
		};
	}, []);

	const violationSubmit = async () => {
		if (!challenge || !id) return;
		setSubmitting(true);
		try {
			const submissionData = {
				userId: "65fd6e2f6b7f00000000000a", 
				code: codeRef.current,
				language: challenge.language,
				timeSpent,
			};
			const result = await submitChallengeAttempt(id, submissionData);
			if (result && result.result) {
				setValidationResult(result.result);
				setShowingResult(true);
				setIsSubmitted(true);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
		}
	};

	const handleViolation = () => {
		const now = Date.now();
		if (now - lastViolationRef.current < 2000) return; // Debounce 2s to prevent dual blur/visibility triggers
		lastViolationRef.current = now;

		setWarnings(prev => {
			const current = prev + 1;
			if (current >= 3) {
				setViolationMessage("SECURITY VIOLATION: You have exceeded the maximum number of warnings. Your challenge is being automatically submitted.");
				violationSubmit();
			} else {
				setViolationMessage(`PROCTORING WARNING (${current}/3): Please stay on this page. Leaving the tab or window will cause the challenge to auto-submit.`);
			}
			return current;
		});
	};

	// Handle challenge submission
	const handleSubmit = useCallback(async () => {
		try {
			if (!challenge || !id) return;

			setSubmitting(true);
			setError(null);

			// Prepare submission data
			const submissionData = {
				userId: "65fd6e2f6b7f00000000000a", // Using a properly formatted ObjectID string
				code,
				language: challenge.language,
				timeSpent,
			};

			console.log(
				"Submitting challenge with data:",
				JSON.stringify(submissionData)
			);

			// Submit the challenge attempt
			try {
				const result = await submitChallengeAttempt(id, submissionData);
				console.log("Submission successful, full response:", result);

				// Ensure the result structure is as expected
				if (result && result.result) {
					console.log("Setting validation result:", result.result);

					// Log detailed information about test cases
					if (
						result.result.testCases &&
						result.result.testCases.length > 0
					) {
						console.group("Test Case Details:");
						result.result.testCases.forEach(
							(tc: { passed: boolean; input: string; expectedOutput?: string; actualOutput?: string }, idx: number) => {
								console.group(`Test Case ${idx + 1}:`);
								console.log("Passed:", tc.passed);
								console.log("Input:", tc.input);
								console.log(
									"Expected Output:",
									tc.expectedOutput
								);
								console.log("Actual Output:", tc.actualOutput);

								// Debug normalized outputs
								const normalizedExpected = normalizeOutput(
									tc.expectedOutput || ""
								);
								const normalizedActual = normalizeOutput(
									tc.actualOutput || ""
								);
								console.log(
									"Normalized Expected:",
									JSON.stringify(normalizedExpected)
								);
								console.log(
									"Normalized Actual:",
									JSON.stringify(normalizedActual)
								);
								console.log(
									"Match?",
									normalizedExpected === normalizedActual
								);

								console.groupEnd();
							}
						);
						console.groupEnd();
					}

					setValidationResult(result.result);
					setShowingResult(true);
					setIsSubmitted(true);

					// Clear the timer data from localStorage since we've submitted
					if (id) {
						const timerKey = `challenge_timer_${id}`;
						localStorage.removeItem(timerKey);
					}

					// Auto-open debug info if any test case failed
					if (!result.result.passed) {
						setShowDebugInfo(true);
					}
				} else {
					console.error("Invalid result structure:", result);
					throw new Error("Invalid response format from server");
				}
			} catch (submitError: any) {
				console.error("Submission API error:", submitError);
				console.error("Response data:", submitError.response?.data);
				console.error("Status code:", submitError.response?.status);
				throw submitError;
			}
		} catch (err) {
			console.error("Failed to submit challenge:", err);
			setError(
				`Failed to submit your solution: ${
					err instanceof Error ? err.message : "Unknown error"
				}`
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		challenge,
		code,
		id,
		timeSpent,
		setSubmitting,
		setError,
		setValidationResult,
		setShowingResult,
		setShowDebugInfo,
	]);

	// Handle time expiry
	const handleTimeExpired = useCallback(() => {
		setIsTimeExpired(true);

		// Clear the timer data from localStorage
		if (id) {
			const timerKey = `challenge_timer_${id}`;
			localStorage.removeItem(timerKey);
		}

		// Auto-submit when time expires
		handleSubmit();

		// Show a message to the user
		alert("Time's up! Your solution has been automatically submitted.");
	}, [id, handleSubmit]);

	// Cleanup timer when user navigates away without submitting
	const cleanupTimer = useCallback(() => {
		if (id && !isSubmitted && !isTimeExpired) {
			// We'll keep the timer data in localStorage when navigating away
			// so users can come back and continue where they left off
		}
	}, [id, showingResult, isTimeExpired]);

	// Cleanup when component unmounts
	useEffect(() => {
		return () => {
			cleanupTimer();
		};
	}, [cleanupTimer]);

	// Render the debug view for a test case
	const renderDebugView = (result: any) => {
		if (!showDebugInfo) return null;

		const normalizedExpected = normalizeOutput(result.expectedOutput || "");
		const normalizedActual = normalizeOutput(result.actualOutput || "");

		return (
			<div className="mt-3 p-3 bg-gray-100 rounded-md">
				<h4 className="font-medium text-gray-700 mb-2">
					Debug Information
				</h4>
				<div className="text-xs font-mono">
					<div className="grid grid-cols-2 gap-2 mb-2">
						<div>
							<p className="font-semibold">
								Normalized Expected:
							</p>
							<pre className="bg-white p-2 rounded border overflow-auto">
								{JSON.stringify(normalizedExpected)}
							</pre>
						</div>
						<div>
							<p className="font-semibold">Normalized Actual:</p>
							<pre className="bg-white p-2 rounded border overflow-auto">
								{JSON.stringify(normalizedActual)}
							</pre>
						</div>
					</div>

					<div>
						<p className="font-semibold">Character Comparison:</p>
						<div className="bg-white p-2 rounded border overflow-auto">
							{normalizedExpected.split("").map((char, i) => {
								const actualChar = normalizedActual[i] || "";
								const matched = char === actualChar;
								return (
									<span
										key={i}
										className={
											matched
												? "text-green-600"
												: "text-red-600 font-bold"
										}
									>
										{char === " " ? "␣" : char}
									</span>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Loading state
	if (loading) {
		return <div className="text-center p-8">Loading challenge...</div>;
	}

	// Error state
	if (error) {
		return (
			<div className="max-w-4xl mx-auto p-4">
				<div
					className={`${
						isTimeExpired
							? "bg-yellow-100 text-yellow-700"
							: "bg-red-100 text-red-700"
					} p-4 rounded-md mb-4`}
				>
					{error}
				</div>
				<button
					onClick={() => navigate("/challenges")}
					className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Back to Challenges
				</button>
			</div>
		);
	}

	// Challenge not found
	if (!challenge) {
		return (
			<div className="max-w-4xl mx-auto p-4">
				<div className="bg-yellow-100 text-yellow-700 p-4 rounded-md mb-4">
					Challenge not found.
				</div>
				<button
					onClick={() => navigate("/challenges")}
					className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Back to Challenges
				</button>
			</div>
		);
	}

	if (!hasStarted) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center pt-24">
				<div className="max-w-2xl w-full">
					<h2 className="text-4xl font-bold mb-4 text-gray-900">{challenge.title}</h2>
					<p className="text-lg text-gray-600 mb-10">{challenge.description}</p>
					
					<div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-indigo-600 mb-8 mx-auto">
						<h3 className="text-2xl font-semibold mb-6 text-indigo-900 flex items-center justify-center gap-2">
							<svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							Before You Begin
						</h3>
						
						<ul className="text-left space-y-4 mb-8 text-gray-700 bg-gray-50 p-6 rounded-xl">
							<li className="flex items-start">
								<svg className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
								<span><strong>Webcam Required:</strong> You must grant webcam access for AI proctoring tracking.</span>
							</li>
							<li className="flex items-start">
								<svg className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
								<span><strong>Fullscreen Mode:</strong> The assessment will automatically open in fullscreen.</span>
							</li>
							<li className="flex items-start">
								<svg className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
								<span><strong>No Tab Switching:</strong> Switching tabs or minimizing the window is prohibited. Doing so 3 times will result in immediate termination and auto-submission.</span>
							</li>
						</ul>
						
						<button 
							onClick={handleStartChallenge}
							className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 text-lg"
						>
							Grant Permissions & Start
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto p-4 relative pt-12 pb-24">
			{/* Proctoring HUD */}
			{proctoringActive && !isSubmitted && (
				<div className="fixed bottom-4 right-4 z-50 glass-card p-2 flex flex-col items-center gap-2 border-emerald-500/30">
					<div className="text-[10px] text-emerald-400 font-medium uppercase tracking-widest flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						Proctoring Active
					</div>
					<video 
						ref={videoRef} 
						autoPlay 
						muted 
						playsInline
						className="w-48 h-32 object-cover rounded shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-black"
					/>
					{warnings > 0 && (
						<div className="text-xs text-red-400 font-bold">
							Warnings: {warnings}/3
						</div>
					)}
				</div>
			)}

			{/* Challenge header */}
			<div className="bg-white shadow rounded-lg mb-6 p-6">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold text-gray-900">
						{challenge.title}
					</h1>
					<div className="flex space-x-2 items-center">
						<span
							className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
								challenge.difficulty === "easy"
									? "bg-green-100 text-green-800"
									: challenge.difficulty === "medium"
									? "bg-yellow-100 text-yellow-800"
									: "bg-red-100 text-red-800"
							}`}
						>
							{challenge.difficulty}
						</span>
						<span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
							{challenge.category}
						</span>
					</div>
				</div>

				{/* Timer */}
				<div className="mb-4">
					<ChallengeTimer
						timeLimit={challenge.timeLimit || 0}
						onTimeExpired={handleTimeExpired}
						onTimeUpdate={handleTimeUpdate}
						challengeId={id || "unknown"}
					/>
				</div>

				{/* Challenge description */}
				<div className="prose max-w-none mb-6">
					<h2 className="text-lg font-semibold mb-2">
						Problem Description
					</h2>
					<div className="bg-gray-50 p-4 rounded-md">
						<p className="whitespace-pre-line">
							{challenge.description}
						</p>
					</div>
				</div>

				{/* Test cases */}
				<div className="mb-6">
					<h2 className="text-lg font-semibold mb-2">
						Example Test Cases
					</h2>
					<div className="space-y-3">
						{challenge.testCases?.filter((tc) => !tc.hidden)
							.map((testCase, index) => (
								<div
									key={index}
									className="bg-gray-50 p-4 rounded-md"
								>
									<h3 className="font-medium text-gray-700 mb-1">
										Example {index + 1}:
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-sm font-medium text-gray-500">
												Input:
											</p>
											<pre className="mt-1 text-sm text-gray-800 bg-gray-100 p-2 rounded">
												{testCase.input}
											</pre>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-500">
												Expected Output:
											</p>
											<pre className="mt-1 text-sm text-gray-800 bg-gray-100 p-2 rounded">
												{formatCodeOutput(testCase.output || "")}
											</pre>
										</div>
									</div>
									{testCase.description && (
										<p className="mt-2 text-sm text-gray-600">
											{testCase.description}
										</p>
									)}
								</div>
							))}
					</div>
				</div>
			</div>

			{/* Code editor section */}
			<div className="bg-white shadow rounded-lg p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">
					Your Solution ({challenge.language})
					{isTimeExpired && (
						<span className="ml-2 text-red-600 text-sm">
							(Time Expired)
						</span>
					)}
				</h2>
				<CodeEditor
					code={code || ""}
					language={challenge.language || "javascript"}
					onChange={handleCodeChange}
					readOnly={isTimeExpired || isSubmitted || submitting}
				/>
				<div className="mt-4 flex justify-end">
					{submitting ? (
						<div className="flex items-center space-x-2 text-indigo-700">
							<svg
								className="animate-spin h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>
								Executing your code... (this may take a few
								seconds)
							</span>
						</div>
					) : (
						<div className="flex space-x-4 items-center">
							{isTimeExpired && !isSubmitted && (
								<div className="text-red-600">
									The time for this challenge has expired.
								</div>
							)}
							<button
								onClick={handleSubmit}
								disabled={
									submitting || isTimeExpired || isSubmitted
								}
								className={`px-6 py-2 rounded-md text-white font-medium ${
									submitting || isTimeExpired || isSubmitted
										? "bg-gray-400 cursor-not-allowed"
										: "bg-indigo-600 hover:bg-indigo-700"
								}`}
							>
								{submitting
									? "Submitting..."
									: "Submit Solution"}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Results section */}
			{showingResult && validationResult && (
				<div className="bg-white shadow rounded-lg p-6 mb-6">
					<h2 className="text-lg font-semibold mb-4">Results</h2>
					<div
						className={`p-4 mb-4 rounded-md ${
							validationResult.passed
								? "bg-green-100 text-green-800"
								: "bg-red-100 text-red-800"
						}`}
					>
						<div className="flex justify-between items-center">
							<div>
								<p className="font-semibold">
									{validationResult.passed
										? "All tests passed!"
										: "Some tests failed."}
								</p>
								<p>
									{validationResult.passedTests} /{" "}
									{validationResult.totalTests} tests passed
								</p>
							</div>

							{/* Overall Score Display */}
							{validationResult.percentageScore !== undefined && (
								<div className="text-right">
									<p className="font-semibold">
										Overall Score
									</p>
									<p className="text-xl font-bold">
										{validationResult.percentageScore.toFixed(
											1
										)}
										%
									</p>
									<p className="text-sm">
										{validationResult.scoredPoints?.toFixed(
											1
										)}{" "}
										/{" "}
										{validationResult.totalPoints?.toFixed(
											1
										)}{" "}
										points
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="space-y-4">
						{validationResult.testCases &&
						validationResult.testCases.length > 0 ? (
							validationResult.testCases.map((result, index) => (
								<div
									key={index}
									className={`border rounded-md p-4 ${
										result.passed
											? "border-green-200"
											: "border-red-200"
									}`}
								>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center">
											<span
												className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 ${
													result.passed
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{result.passed ? "✓" : "✗"}
											</span>
											<h3 className="font-medium">
												Test Case {index + 1}{" "}
												{result.hidden
													? "(Hidden)"
													: ""}
											</h3>
										</div>

										{/* Points Display */}
										{result.pointsAvailable !==
											undefined && (
											<div className="text-sm font-medium">
												Score:{" "}
												{result.pointsScored?.toFixed(
													1
												)}{" "}
												/{" "}
												{result.pointsAvailable.toFixed(
													1
												)}{" "}
												points
												{result.similarityScore !==
													undefined &&
													!result.passed && (
														<span className="ml-2 text-gray-500">
															(Similarity:{" "}
															{(
																result.similarityScore *
																100
															).toFixed(0)}
															%)
														</span>
													)}
											</div>
										)}
									</div>

									{!result.hidden && (
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
											<div>
												<p className="text-sm font-medium text-gray-500">
													Input:
												</p>
												<pre className="mt-1 text-sm bg-gray-50 p-2 rounded-md overflow-auto max-h-48">
													{result.input}
												</pre>
											</div>
											<div>
												<p className="text-sm font-medium text-gray-500">
													Expected:
												</p>
												<pre className="mt-1 text-sm bg-gray-50 p-2 rounded-md overflow-auto max-h-48">
													{result.expectedOutput}
												</pre>
											</div>
											<div>
												<p className="text-sm font-medium text-gray-500">
													Your Output:
												</p>
												<pre
													className={`mt-1 text-sm p-2 rounded-md overflow-auto max-h-48 ${
														result.passed
															? "bg-green-50"
															: "bg-red-50"
													}`}
												>
													{formatCodeOutput(
														result.actualOutput
													)}
												</pre>
											</div>
										</div>
									)}

									{/* Display stderr if it exists */}
									{result.stderr && (
										<div className="mt-3">
											<p className="text-sm font-medium text-red-500">
												Error Output:
											</p>
											<pre className="mt-1 text-sm bg-red-50 p-2 rounded-md overflow-auto max-h-48 text-red-700 border border-red-200">
												{result.stderr}
											</pre>
										</div>
									)}

									{result.description && (
										<p className="mt-2 text-sm text-gray-600">
											{result.description}
										</p>
									)}

									{!result.passed &&
										renderDebugView(result)}
								</div>
							))
						) : (
							<div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded-md">
								No test results available. There might be an
								issue with the test execution.
							</div>
						)}
					</div>

					<div className="mt-6 flex justify-between">
						<div>
							<button
								onClick={() => setShowDebugInfo(!showDebugInfo)}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								{showDebugInfo
									? "Hide Debug Info"
									: "Show Debug Info"}
							</button>
						</div>
						<div className="flex space-x-4">
							<button
								onClick={() => navigate("/challenges")}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								Back to Challenges
							</button>
							<button
								onClick={() => {
									setShowingResult(false);
									setIsSubmitted(false);
									setHasPassedCheck(false);
									setValidationResult(null);
									if (!isTimeExpired) {
										// Reset the timer
										if (id) {
											const timerKey = `challenge_timer_${id}`;
											const newTimerData = {
												startTime: Date.now(),
												timeLimitInSeconds:
												(challenge?.timeLimit || 0) * 60,
										};
										localStorage.setItem(
											timerKey,
											JSON.stringify(newTimerData)
										);
									}
									setCode(challenge?.starterCode || "");
									}
								}}
								className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
								disabled={isTimeExpired}
							>
								{isTimeExpired ? "Time Expired" : "Try Again"}
							</button>
						</div>
					</div>
				</div>
			)}

			{violationMessage && (
				<div className="fixed inset-0 bg-red-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
					<div className="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-md w-full text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
						<div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
							<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Proctoring Alert</h3>
						<p className="text-red-200 mb-6">{violationMessage}</p>
						<button 
							onClick={() => setViolationMessage(null)}
							className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium w-full transition-colors"
						>
							I Understand
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ChallengeAttempt;
