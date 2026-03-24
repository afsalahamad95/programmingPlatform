import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChallenges } from "../api";
import { Challenge } from "../types";

type ChallengeListProps = {
	filter?: {
		difficulty?: string;
		category?: string;
	};
};

const ChallengeList: React.FC<ChallengeListProps> = ({ filter }) => {
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchChallenges = async () => {
			try {
				setLoading(true);
				const data = await getChallenges(filter);
				setChallenges(data || []);
				setError(null);
			} catch (err) {
				console.error("Failed to fetch challenges:", err);
				setError("Failed to load challenges. Please try again later.");
				setChallenges([]);
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

	if (!challenges || challenges.length === 0) {
		return <div className="text-center p-4">No challenges found.</div>;
	}

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case "Easy":
				return "bg-green-900/40 text-green-300 border border-green-500/30";
			case "Medium":
				return "bg-yellow-900/40 text-yellow-300 border border-yellow-500/30";
			case "Hard":
				return "bg-red-900/40 text-red-300 border border-red-500/30";
			default:
				return "bg-gray-800/40 text-gray-300 border border-gray-500/30";
		}
	};

	return (
		<div className="glass-card overflow-hidden">
			<ul className="divide-y divide-white/10">
				{challenges.map((challenge) => (
					<li key={challenge.id}>
						<Link
							to={`/challenges/${challenge.id}`}
							className="block hover:bg-white/10 transition-colors"
						>
							<div className="px-4 py-4 sm:px-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center">
										<p className="text-sm font-medium text-purple-300 truncate">
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
										<p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
											{challenge.category}
										</p>
									</div>
								</div>
								<div className="mt-2 sm:flex sm:justify-between">
									<div className="sm:flex">
										<p className="flex items-center text-sm text-gray-300">
											<span className="truncate">
												{challenge.description.substring(
													0,
													100
												)}
												...
											</span>
										</p>
									</div>
									<div className="mt-2 flex items-center text-sm text-gray-400 sm:mt-0">
										<p>
											Time Limit: {challenge.timeLimit || 0}{" "}
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
