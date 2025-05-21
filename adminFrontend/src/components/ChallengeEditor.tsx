{
	/* Test case form fields - modify to include points available */
}
{
	testCases.map((testCase, index) => (
		<div key={index} className="border p-4 rounded mb-4">
			<div className="flex justify-between mb-2">
				<h3 className="text-md font-medium">Test Case {index + 1}</h3>
				<button
					type="button"
					onClick={() => removeTestCase(index)}
					className="text-red-500 hover:text-red-700"
				>
					Remove
				</button>
			</div>

			<div className="grid grid-cols-2 gap-4 mb-3">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Input
					</label>
					<textarea
						value={testCase.input}
						onChange={(e) =>
							updateTestCase(index, "input", e.target.value)
						}
						className="w-full p-2 border rounded h-24"
						placeholder="Input for this test case"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Expected Output
					</label>
					<textarea
						value={testCase.expectedOutput}
						onChange={(e) =>
							updateTestCase(
								index,
								"expectedOutput",
								e.target.value
							)
						}
						className="w-full p-2 border rounded h-24"
						placeholder="Expected output for this test case"
					/>
				</div>
			</div>

			<div className="mb-3">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<input
					type="text"
					value={testCase.description}
					onChange={(e) =>
						updateTestCase(index, "description", e.target.value)
					}
					className="w-full p-2 border rounded"
					placeholder="Description or hint for this test case"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="mb-3">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Points Available
					</label>
					<input
						type="number"
						min="0"
						step="0.1"
						value={testCase.pointsAvailable || 1}
						onChange={(e) =>
							updateTestCase(
								index,
								"pointsAvailable",
								parseFloat(e.target.value) || 1
							)
						}
						className="w-full p-2 border rounded"
						placeholder="Points available for this test case"
					/>
				</div>

				<div className="flex items-end mb-3">
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={testCase.hidden}
							onChange={(e) =>
								updateTestCase(
									index,
									"hidden",
									e.target.checked
								)
							}
							className="mr-2"
						/>
						<span className="text-sm font-medium text-gray-700">
							Hidden Test Case
						</span>
					</label>
				</div>
			</div>
		</div>
	));
}
