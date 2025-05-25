import React from "react";
import { PlusCircle, MinusCircle, Eye, EyeOff } from "lucide-react";

interface TestCase {
	input: string;
	output: string;
	hidden: boolean;
}

interface TestCaseProps {
	testCases: TestCase[];
	onChange: (testCases: TestCase[]) => void;
}

export default function TestCase({ testCases, onChange }: TestCaseProps) {
	const addTestCase = () => {
		onChange([...testCases, { input: "", output: "", hidden: false }]);
	};

	const removeTestCase = (index: number) => {
		onChange(testCases.filter((_, i) => i !== index));
	};

	const updateTestCase = (
		index: number,
		field: keyof TestCase,
		value: string | boolean
	) => {
		const newTestCases = [...testCases];
		newTestCases[index] = { ...newTestCases[index], [field]: value };
		onChange(newTestCases);
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<label className="block text-sm font-medium text-gray-700">
					Test Cases
				</label>
				<button
					type="button"
					onClick={addTestCase}
					className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
				>
					<PlusCircle className="w-4 h-4 mr-1" />
					Add Test Case
				</button>
			</div>

			{testCases.map((testCase, index) => (
				<div key={index} className="p-4 border rounded-md bg-gray-50">
					<div className="flex justify-between items-center mb-3">
						<span className="text-sm font-medium text-gray-700">
							Test Case #{index + 1}
						</span>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() =>
									updateTestCase(
										index,
										"hidden",
										!testCase.hidden
									)
								}
								className="p-1 text-gray-500 hover:text-gray-700"
								title={
									testCase.hidden
										? "Make visible"
										: "Make hidden"
								}
							>
								{testCase.hidden ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</button>
							<button
								type="button"
								onClick={() => removeTestCase(index)}
								className="p-1 text-red-500 hover:text-red-700"
							>
								<MinusCircle className="w-4 h-4" />
							</button>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Input
							</label>
							<textarea
								value={testCase.input}
								onChange={(e) =>
									updateTestCase(
										index,
										"input",
										e.target.value
									)
								}
								rows={3}
								className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Enter input data"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Expected Output
							</label>
							<textarea
								value={testCase.output}
								onChange={(e) =>
									updateTestCase(
										index,
										"output",
										e.target.value
									)
								}
								rows={3}
								className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Enter expected output"
								required
							/>
						</div>
					</div>
				</div>
			))}

			{testCases.length === 0 && (
				<p className="text-sm text-gray-500 text-center py-4">
					No test cases added yet. Click the button above to add one.
				</p>
			)}
		</div>
	);
}
