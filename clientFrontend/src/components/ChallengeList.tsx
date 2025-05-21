import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChallenges } from "../api";
import { CodingChallenge } from "../types";

type ChallengeListProps = {
	filter?: {
		difficulty?: string;
		category?: string;
	};
};

const ChallengeList: React.FC<ChallengeListProps> = ({ filter }) => {
	const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchChallenges = async () => {
			try {
				setLoading(true);
				const data = await getChallenges(filter);
				setChallenges(data);
				setError(null);
			} catch (err) {
				console.error("Failed to fetch challenges:", err);
				setError("Failed to load challenges. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchChallenges();
	}, [filter]);

	if (loading) {
		return <div className="text-center p-4">Loading challenges...</div>;
	}

	if (error) {
		return <div className="text-red-500 p-4">{error}</div>;
	}

	if (challenges.length === 0) {
		return <div className="text-center p-4">No challenges found.</div>;
	}

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case "Easy":
				return "bg-green-100 text-green-800";
			case "Medium":
				return "bg-yellow-100 text-yellow-800";
			case "Hard":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="bg-white shadow overflow-hidden sm:rounded-md">
			<ul className="divide-y divide-gray-200">
				{challenges.map((challenge) => (
					<li key={challenge.id}>
						<Link
							to={`/challenges/${challenge.id}`}
							className="block hover:bg-gray-50"
						>
							<div className="px-4 py-4 sm:px-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center">
										<p className="text-sm font-medium text-indigo-600 truncate">
											{challenge.title}
										</p>
										<div className="ml-2 flex-shrink-0 flex">
											<p
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyColor(
													challenge.difficulty
												)}`}
											>
												{challenge.difficulty}
											</p>
										</div>
									</div>
									<div className="ml-2 flex-shrink-0 flex">
										<p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
											{challenge.category}
										</p>
									</div>
								</div>
								<div className="mt-2 sm:flex sm:justify-between">
									<div className="sm:flex">
										<p className="flex items-center text-sm text-gray-500">
											<span className="truncate">
												{challenge.description.substring(
													0,
													100
												)}
												...
											</span>
										</p>
									</div>
									<div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
										<p>
											Time Limit: {challenge.timeLimit}{" "}
											minutes
										</p>
									</div>
								</div>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
};

export default ChallengeList;
