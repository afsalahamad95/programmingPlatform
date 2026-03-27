import { useState } from "react";
import Editor from "@monaco-editor/react";
import axios, { AxiosError } from "axios";
import { Bot, Sparkles, Lightbulb } from "lucide-react";
import { CodingQuestion as CodingQuestionType } from "../../types";

interface CodingQuestionProps {
	question: CodingQuestionType;
	answer?: string;
	onChange: (value: string) => void;
}

export default function CodingQuestion({
	question,
	answer,
	onChange,
}: CodingQuestionProps) {
	const [testResults, setTestResults] = useState<
		{
			status: string;
			passed: boolean;
			input: string;
			expectedOutput: string;
			actualOutput: string;
			rawResponse?: unknown;
			requestPayload?: unknown;
			statusCheckResponse?: unknown;
		}[]
	>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState<number>(63); // Default: JavaScript
	const [mentorHint, setMentorHint] = useState<string | null>(null);
	const [isHintLoading, setIsHintLoading] = useState(false);

	const languages = [
		{ id: 63, name: "JavaScript" },
		{ id: 71, name: "Python (3.8.1)" },
	];

	const testCode = async () => {
		try {
			setIsLoading(true);
			setTestResults([]);

			const testResultPromises = question.testCases
				.filter((tc) => !tc.hidden)
				.map(async (testCase) => {
					// Get the language name based on the selected language ID
					const selectedLanguageName =
						languages
							.find((lang) => lang.id === selectedLanguage)
							?.name.toLowerCase()
							.split(" ")[0] || "javascript";

					const payload = {
						language: selectedLanguageName,
						code: answer || question.starterCode,
						input: testCase.input,
						config: {
							timeout_seconds: 2, // 2 seconds timeout
							memory_limit_mb: 128, // 128 MB memory limit
						},
						test_cases: [
							{
								input: testCase.input,
								expected_output: testCase.output.trim(),
								description:
									testCase.description || "No description",
							},
						],
					};

					// Log the complete payload for debugging
					console.log(
						"Request Payload:",
						JSON.stringify(payload, null, 2)
					);

					try {
						// Make the POST request to the backend at http://localhost:8080/execute
						const response = await axios.post(
							"http://localhost:8080/execute",
							payload,
							{
								headers: {
									"Content-Type": "application/json",
								},
							}
						);

						// Log the raw response from the backend
						console.log(
							"Backend Response:",
							JSON.stringify(response.data, null, 2)
						);

						const result = response.data;

						// Ensure 'validation' and 'test_cases' exist in the response before accessing them
						const validation = result.validation;
						const testCases = validation?.test_cases || []; // Fallback to an empty array if undefined

						// Determine if the test passed (if test_cases are present)
						const passed = testCases.every(
							(test: { passed: boolean }) => test.passed
						);

						// If there was no validation or test_cases, return an error status
						if (!validation || testCases.length === 0) {
							return {
								status: "No validation or test cases in the response",
								passed: false,
								input: testCase.input,
								expectedOutput: testCase.output.trim(),
								actualOutput: "",
								rawResponse: result,
								requestPayload: payload,
							};
						}

						// Capture the id for the next status check
						const id = result.id;

						// Make a second request to /status/{id}
						const statusResponse = await axios.get(
							`http://localhost:8080/status/${id}`
						);
						console.log(
							"Status Response:",
							JSON.stringify(statusResponse.data, null, 2)
						);

						const statusCheckResponse = statusResponse.data; // Capture the status response

						return {
							status: result.status,
							passed,
							input: testCase.input,
							expectedOutput: testCase.output.trim(),
							actualOutput: result.result.stdout.trim(),
							rawResponse: result,
							requestPayload: payload,
							statusCheckResponse, // Include the status check response in the result
						};
					} catch (submissionError) {
						console.error(
							"Error during submission:",
							submissionError
						);
						const errorData =
							submissionError instanceof AxiosError
								? submissionError.response?.data
								: "Unknown error occurred";
						return {
							status: "Submission Error",
							passed: false,
							input: testCase.input,
							expectedOutput: testCase.output.trim(),
							actualOutput: "",
							rawResponse: errorData,
							requestPayload: payload,
						};
					}
				});

			// Wait for all test results
			const results = await Promise.all(testResultPromises);
			setTestResults(results);
		} catch (error) {
			console.error("Error testing code:", error);
			setTestResults([
				{
					status: "Error occurred while testing the code",
					passed: false,
					input: "",
					expectedOutput: "",
					actualOutput: "",
					rawResponse: error,
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};
    
    const getMentorHint = async () => {
        try {
            setIsHintLoading(true);
            setMentorHint(null);
            
            // Call the LLM backend for a contextual hint
            const response = await axios.post("http://localhost:5175/llm/test-hint", {
                question_content: question.content,
                question_type: "coding",
                // Pass current code to help LLM give SPECIFIC feedback
                previous_answers: answer || question.starterCode
            });
            
            setMentorHint(response.data.hint);
        } catch (error) {
            console.error("Failed to get mentor hint:", error);
            setMentorHint("I'm having trouble analyzing your code right now. Try double-checking your logic around the main loop!");
        } finally {
            setIsHintLoading(false);
        }
    };

	return (
		<div className="space-y-4">
			<div className="prose max-w-none">
				<p className="text-lg">{question.content}</p>
			</div>
			<div className="space-y-4">
				{/* Language Selector */}
				<div>
					<label
						className="block text-sm font-medium text-gray-700"
						htmlFor="language"
					>
						Select Language
					</label>
					<select
						id="language"
						className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						value={selectedLanguage}
						onChange={(e) =>
							setSelectedLanguage(Number(e.target.value))
						}
					>
						{languages.map((language) => (
							<option key={language.id} value={language.id}>
								{language.name}
							</option>
						))}
					</select>
				</div>

				{/* Code Editor */}
				<div className="border rounded-lg overflow-hidden">
					<Editor
						height="400px"
						defaultLanguage="javascript"
						theme="vs-light"
						value={answer || question.starterCode}
						onChange={(value: string | undefined) => onChange(value || "")}
						options={{
							minimap: { enabled: false },
							fontSize: 14,
							lineNumbers: "on",
							scrollBeyondLastLine: false,
							automaticLayout: true,
						}}
					/>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3">
                    <button
                        onClick={testCode}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                        disabled={isLoading}
                    >
                        {isLoading ? "Running Tests..." : "Run Test Cases"}
                    </button>
                    
                    <button
                        onClick={getMentorHint}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl hover:bg-emerald-600/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        disabled={isHintLoading}
                    >
                        <Sparkles className={`w-4 h-4 ${isHintLoading ? 'animate-spin' : ''}`} />
                        {isHintLoading ? "Analyzing..." : "Ask AI Mentor"}
                    </button>
                </div>

                {/* AI Mentor Hint Panel */}
                {mentorHint && (
                    <div className="bg-gradient-to-br from-gray-900 to-black border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden animate-slide-up shadow-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Bot className="w-24 h-24 text-emerald-500" />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <Lightbulb className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                    AI Mentor Insight <Sparkles className="w-3 h-3" />
                                </h4>
                                <p className="text-gray-200 leading-relaxed text-sm italic">
                                    "{mentorHint}"
                                </p>
                                <button 
                                    onClick={() => setMentorHint(null)}
                                    className="mt-4 text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors"
                                >
                                    Dismiss Insight
                                </button>
                            </div>
                        </div>
                    </div>
                )}

				{/* Test Results */}
				{testResults.length > 0 && (
					<div className="space-y-4">
						<h3 className="text-sm font-medium text-gray-700">
							Test Results
						</h3>
						<div className="grid gap-4 md:grid-cols-2">
							{testResults.map((result, index) => (
								<div
									key={index}
									className={`p-4 rounded-lg space-y-2 ${
										result.passed
											? "bg-green-50 border-2 border-green-200"
											: "bg-red-50 border-2 border-red-200"
									}`}
								>
									<div>
										<span className="text-sm font-medium text-gray-700">
											Status:
										</span>
										<p
											className={`text-sm font-semibold ${
												result.passed
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{result.passed
												? "Passed ✓"
												: "Failed ✗"}
										</p>
									</div>
									<div>
										<span className="text-sm font-medium text-gray-700">
											Input:
										</span>
										<pre className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
											{result.input}
										</pre>
									</div>
									<div>
										<span className="text-sm font-medium text-gray-700">
											Expected Output:
										</span>
										<pre className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
											{result.expectedOutput}
										</pre>
									</div>
									<div>
										<span className="text-sm font-medium text-gray-700">
											Actual Output:
										</span>
										<pre className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
											{result.actualOutput || "No output"}
										</pre>
									</div>

									{/* Show Raw Response */}
									<div>
										<span className="text-sm font-medium text-gray-700">
											Raw Response:
										</span>
										<pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
											{JSON.stringify(
												result.rawResponse as any,
												null,
												2
											)}
										</pre>
									</div>

									{/* Show Status Check Response */}
									{!!result.statusCheckResponse && (
										<div>
											<span className="text-sm font-medium text-gray-700">
												Status Check Response:
											</span>
											<pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
												{JSON.stringify(
													result.statusCheckResponse as any,
													null,
													2
												)}
											</pre>
										</div>
									)}

									<details>
										<summary className="text-sm font-medium text-blue-700 cursor-pointer">
											Show Request Details
										</summary>
										<div className="mt-2 p-2 bg-gray-100 rounded">
											<h4 className="text-sm font-medium">
												Request Payload:
											</h4>
											<pre className="text-xs text-gray-600 overflow-x-auto">
												{JSON.stringify(
													result.requestPayload,
													null,
													2
												)}
											</pre>
										</div>
									</details>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
