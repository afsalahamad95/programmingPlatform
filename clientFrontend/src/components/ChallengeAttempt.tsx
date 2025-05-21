import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChallenge, submitChallengeAttempt } from "../api";
import { CodingChallenge, ValidationResult } from "../types";
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
	const [challenge, setChallenge] = useState<CodingChallenge | null>(null);
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
	};

	// Handle time updates
	const handleTimeUpdate = (time: number) => {
		setTimeSpent(time);
	};

	// Handle time expiry
	const handleTimeExpired = useCallback(() => {
		setIsTimeExpired(true);
		// Auto-submit when time expires
		handleSubmit();
	}, []);

	// Handle challenge submission
	const handleSubmit = async () => {
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
							(tc: any, idx: number) => {
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
	};

	// Render the debug view for a test case
	const renderDebugView = (result: any, index: number) => {
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
				<div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
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

	return (
		<div className="max-w-6xl mx-auto p-4">
			{/* Challenge header */}
			<div className="bg-white shadow rounded-lg mb-6 p-6">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold text-gray-900">
						{challenge.title}
					</h1>
					<div className="flex space-x-2 items-center">
						<span
							className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
								challenge.difficulty === "Easy"
									? "bg-green-100 text-green-800"
									: challenge.difficulty === "Medium"
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
						timeLimit={challenge.timeLimit}
						onTimeExpired={handleTimeExpired}
						onTimeUpdate={handleTimeUpdate}
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
						{challenge.testCases
							.filter((tc) => !tc.hidden)
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
												{testCase.expectedOutput}
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
				</h2>
				<CodeEditor
					code={code}
					language={challenge.language}
					onChange={handleCodeChange}
					readOnly={isTimeExpired || showingResult || submitting}
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
						<button
							onClick={handleSubmit}
							disabled={submitting || isTimeExpired}
							className={`px-6 py-2 rounded-md text-white font-medium ${
								submitting || isTimeExpired
									? "bg-gray-400 cursor-not-allowed"
									: "bg-indigo-600 hover:bg-indigo-700"
							}`}
						>
							{submitting ? "Submitting..." : "Submit Solution"}
						</button>
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
									<div className="flex items-center mb-2">
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
											{result.hidden ? "(Hidden)" : ""}
										</h3>
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
										renderDebugView(result, index)}
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
									setValidationResult(null);
									if (!isTimeExpired) {
										setCode(challenge.starterCode);
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
		</div>
	);
};

export default ChallengeAttempt;
