import React, { useState, useEffect } from "react";
import { createChallenge, updateChallenge, getChallenge } from "../api";
import { CodingChallenge } from "../types";

type ChallengeFormProps = {
	challengeId?: string; // Optional ID for editing existing challenges
	onSuccess: () => void;
	onCancel: () => void;
};

const ChallengeForm: React.FC<ChallengeFormProps> = ({
	challengeId,
	onSuccess,
	onCancel,
}) => {
	const isEditMode = !!challengeId;

	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [testCases, setTestCases] = useState([
		{ input: "", expectedOutput: "", description: "", hidden: false },
	]);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		difficulty: "Medium" as "Easy" | "Medium" | "Hard",
		category: "Algorithms",
		timeLimit: 30,
		starterCode: "// Write your code here\n",
		language: "javascript",
		timeoutSec: 5,
		memoryLimitMB: 128,
	});

	useEffect(() => {
		// Load challenge data if in edit mode
		if (isEditMode && challengeId) {
			const fetchChallenge = async () => {
				try {
					setLoading(true);
					const challenge = await getChallenge(challengeId);

					if (!challenge) {
						setFormError(
							"Failed to load challenge data. Creating a new challenge instead."
						);
						setLoading(false);
						return;
					}

					setFormData({
						title: challenge.title,
						description: challenge.description,
						difficulty: challenge.difficulty,
						category: challenge.category,
						timeLimit: challenge.timeLimit,
						starterCode: challenge.starterCode,
						language: challenge.language,
						timeoutSec: challenge.timeoutSec,
						memoryLimitMB: challenge.memoryLimitMB,
					});
					setTestCases(challenge.testCases || []);
				} catch (error) {
					setFormError("Failed to load challenge data");
					console.error("Error loading challenge:", error);
				} finally {
					setLoading(false);
				}
			};

			fetchChallenge();
		}
	}, [challengeId, isEditMode]);

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]:
				name === "timeLimit" ||
				name === "timeoutSec" ||
				name === "memoryLimitMB"
					? parseInt(value)
					: value,
		});
	};

	const handleTestCaseChange = (
		index: number,
		field: string,
		value: string | boolean
	) => {
		const updatedTestCases = [...testCases];
		updatedTestCases[index] = {
			...updatedTestCases[index],
			[field]: value,
		};
		setTestCases(updatedTestCases);
	};

	const addTestCase = () => {
		setTestCases([
			...testCases,
			{ input: "", expectedOutput: "", description: "", hidden: false },
		]);
	};

	const removeTestCase = (index: number) => {
		if (testCases.length > 1) {
			setTestCases(testCases.filter((_, i) => i !== index));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (testCases.length === 0) {
			setFormError("At least one test case is required");
			return;
		}

		if (!formData.title.trim()) {
			setFormError("Title is required");
			return;
		}

		if (!formData.description.trim()) {
			setFormError("Description is required");
			return;
		}

		const hasEmptyTestCase = testCases.some(
			(tc) => !tc.input.trim() || !tc.expectedOutput.trim()
		);
		if (hasEmptyTestCase) {
			setFormError("All test cases must have input and expected output");
			return;
		}

		try {
			setLoading(true);
			setFormError(null);

			const challengeData: Partial<CodingChallenge> = {
				...formData,
				testCases,
			};

			if (isEditMode && challengeId) {
				await updateChallenge(challengeId, challengeData);
			} else {
				await createChallenge(challengeData);
			}

			onSuccess();
		} catch (error) {
			console.error("Error saving challenge:", error);
			setFormError("Failed to save challenge. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (loading && isEditMode) {
		return (
			<div className="flex justify-center p-8">
				Loading challenge data...
			</div>
		);
	}

	return (
		<div className="bg-white shadow rounded-lg p-6">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-gray-900">
					{isEditMode
						? "Edit Coding Challenge"
						: "Create New Coding Challenge"}
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					{isEditMode
						? "Update the challenge details below"
						: "Fill in the details to create a new timed coding challenge"}
				</p>
			</div>

			{formError && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
					<p className="text-red-600">{formError}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Basic Information */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label
							htmlFor="title"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Title <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="title"
							name="title"
							value={formData.title}
							onChange={handleInputChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="language"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Programming Language{" "}
							<span className="text-red-500">*</span>
						</label>
						<select
							id="language"
							name="language"
							value={formData.language}
							onChange={handleInputChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							required
						>
							<option value="javascript">JavaScript</option>
							<option value="python">Python</option>
							<option value="java">Java</option>
							<option value="cpp">C++</option>
							<option value="go">Go</option>
							<option value="ruby">Ruby</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="difficulty"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Difficulty Level{" "}
							<span className="text-red-500">*</span>
						</label>
						<select
							id="difficulty"
							name="difficulty"
							value={formData.difficulty}
							onChange={handleInputChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							required
						>
							<option value="Easy">Easy</option>
							<option value="Medium">Medium</option>
							<option value="Hard">Hard</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="category"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Category <span className="text-red-500">*</span>
						</label>
						<select
							id="category"
							name="category"
							value={formData.category}
							onChange={handleInputChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							required
						>
							<option value="Algorithms">Algorithms</option>
							<option value="Data Structures">
								Data Structures
							</option>
							<option value="String Manipulation">
								String Manipulation
							</option>
							<option value="Arrays">Arrays</option>
							<option value="Mathematics">Mathematics</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="timeLimit"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Time Limit (minutes){" "}
							<span className="text-red-500">*</span>
						</label>
						<input
							type="number"
							id="timeLimit"
							name="timeLimit"
							value={formData.timeLimit}
							onChange={handleInputChange}
							min="1"
							max="120"
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							required
						/>
					</div>
				</div>

				{/* Description */}
				<div>
					<label
						htmlFor="description"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Problem Description{" "}
						<span className="text-red-500">*</span>
					</label>
					<textarea
						id="description"
						name="description"
						value={formData.description}
						onChange={handleInputChange}
						rows={5}
						className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						required
					></textarea>
				</div>

				{/* Starter Code */}
				<div>
					<label
						htmlFor="starterCode"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Starter Code <span className="text-red-500">*</span>
					</label>
					<textarea
						id="starterCode"
						name="starterCode"
						value={formData.starterCode}
						onChange={handleInputChange}
						rows={8}
						className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
						required
					></textarea>
				</div>

				{/* Technical Limits */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label
							htmlFor="timeoutSec"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Execution Timeout (seconds)
						</label>
						<input
							type="number"
							id="timeoutSec"
							name="timeoutSec"
							value={formData.timeoutSec}
							onChange={handleInputChange}
							min="1"
							max="30"
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div>
						<label
							htmlFor="memoryLimitMB"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Memory Limit (MB)
						</label>
						<input
							type="number"
							id="memoryLimitMB"
							name="memoryLimitMB"
							value={formData.memoryLimitMB}
							onChange={handleInputChange}
							min="16"
							max="512"
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
				</div>

				{/* Test Cases */}
				<div>
					<div className="flex justify-between items-center mb-3">
						<h3 className="text-lg font-medium text-gray-900">
							Test Cases
						</h3>
						<button
							type="button"
							onClick={addTestCase}
							className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
						>
							Add Test Case
						</button>
					</div>

					<div className="space-y-4">
						{testCases.map((testCase, index) => (
							<div
								key={index}
								className="border border-gray-200 rounded-md p-4"
							>
								<div className="flex justify-between mb-3">
									<h4 className="font-medium">
										Test Case #{index + 1}
									</h4>
									{testCases.length > 1 && (
										<button
											type="button"
											onClick={() =>
												removeTestCase(index)
											}
											className="text-red-600 hover:text-red-800 text-sm"
										>
											Remove
										</button>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Input{" "}
											<span className="text-red-500">
												*
											</span>
										</label>
										<textarea
											value={testCase.input}
											onChange={(e) =>
												handleTestCaseChange(
													index,
													"input",
													e.target.value
												)
											}
											rows={3}
											className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
											required
										></textarea>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Expected Output{" "}
											<span className="text-red-500">
												*
											</span>
										</label>
										<textarea
											value={testCase.expectedOutput}
											onChange={(e) =>
												handleTestCaseChange(
													index,
													"expectedOutput",
													e.target.value
												)
											}
											rows={3}
											className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
											required
										></textarea>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Description
										</label>
										<input
											type="text"
											value={testCase.description}
											onChange={(e) =>
												handleTestCaseChange(
													index,
													"description",
													e.target.value
												)
											}
											className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											id={`hidden-${index}`}
											checked={testCase.hidden}
											onChange={(e) =>
												handleTestCaseChange(
													index,
													"hidden",
													e.target.checked
												)
											}
											className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
										/>
										<label
											htmlFor={`hidden-${index}`}
											className="ml-2 block text-sm text-gray-700"
										>
											Hidden test case (not shown to
											users)
										</label>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex justify-end space-x-3 pt-4">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						disabled={loading}
					>
						Cancel
					</button>
					<button
						type="submit"
						className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
						disabled={loading}
					>
						{loading
							? "Saving..."
							: isEditMode
							? "Update Challenge"
							: "Create Challenge"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default ChallengeForm;
