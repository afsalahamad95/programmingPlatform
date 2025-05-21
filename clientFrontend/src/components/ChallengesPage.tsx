import React, { useState } from "react";
import ChallengeList from "./ChallengeList";

const ChallengesPage: React.FC = () => {
	const [filter, setFilter] = useState<{
		difficulty?: string;
		category?: string;
	}>({});

	// Available difficulty levels and categories
	const difficulties = ["Easy", "Medium", "Hard"];
	const categories = [
		"Algorithms",
		"Data Structures",
		"String Manipulation",
		"Arrays",
		"Mathematics",
	];

	// Handle filter changes
	const handleDifficultyChange = (difficulty: string) => {
		setFilter((prev) => ({
			...prev,
			difficulty: prev.difficulty === difficulty ? undefined : difficulty,
		}));
	};

	const handleCategoryChange = (category: string) => {
		setFilter((prev) => ({
			...prev,
			category: prev.category === category ? undefined : category,
		}));
	};

	const clearFilters = () => {
		setFilter({});
	};

	return (
		<div className="max-w-6xl mx-auto p-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Coding Challenges
				</h1>
				<p className="text-gray-600">
					Test your programming skills with these timed coding
					challenges. Select a challenge to begin.
				</p>
			</div>

			{/* Filters */}
			<div className="bg-white shadow rounded-lg p-6 mb-6">
				<div className="flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0">
					<div>
						<h2 className="text-lg font-medium text-gray-900 mb-2">
							Filter by Difficulty
						</h2>
						<div className="flex flex-wrap gap-2">
							{difficulties.map((difficulty) => (
								<button
									key={difficulty}
									onClick={() =>
										handleDifficultyChange(difficulty)
									}
									className={`px-3 py-1 rounded-full text-sm font-medium ${
										filter.difficulty === difficulty
											? "bg-indigo-600 text-white"
											: "bg-gray-100 text-gray-800 hover:bg-gray-200"
									}`}
								>
									{difficulty}
								</button>
							))}
						</div>
					</div>

					<div>
						<h2 className="text-lg font-medium text-gray-900 mb-2">
							Filter by Category
						</h2>
						<div className="flex flex-wrap gap-2">
							{categories.map((category) => (
								<button
									key={category}
									onClick={() =>
										handleCategoryChange(category)
									}
									className={`px-3 py-1 rounded-full text-sm font-medium ${
										filter.category === category
											? "bg-indigo-600 text-white"
											: "bg-gray-100 text-gray-800 hover:bg-gray-200"
									}`}
								>
									{category}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Clear filters button */}
				{(filter.difficulty || filter.category) && (
					<div className="mt-4 flex justify-end">
						<button
							onClick={clearFilters}
							className="text-sm text-indigo-600 hover:text-indigo-800"
						>
							Clear Filters
						</button>
					</div>
				)}
			</div>

			{/* Challenge list */}
			<ChallengeList filter={filter} />
		</div>
	);
};

export default ChallengesPage;
