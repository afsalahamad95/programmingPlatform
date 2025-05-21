import React, { useState, useEffect } from "react";
import { getChallenges, deleteChallenge } from "../api";
import { CodingChallenge } from "../types";
import ChallengeForm from "./ChallengeForm";

const ChallengeManagement: React.FC = () => {
	const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
		null
	);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const fetchChallenges = async () => {
		try {
			setLoading(true);
			const data = await getChallenges();
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

	useEffect(() => {
		fetchChallenges();
	}, []);

	const handleCreateClick = () => {
		setEditingChallengeId(null);
		setShowForm(true);
	};

	const handleEditClick = (challengeId: string) => {
		setEditingChallengeId(challengeId);
		setShowForm(true);
	};

	const handleDeleteClick = (challengeId: string) => {
		setDeleteConfirmId(challengeId);
	};

	const handleDeleteConfirm = async () => {
		if (!deleteConfirmId) return;

		try {
			setLoading(true);
			await deleteChallenge(deleteConfirmId);
			setDeleteConfirmId(null);
			fetchChallenges();
		} catch (err) {
			console.error("Failed to delete challenge:", err);
			setError("Failed to delete challenge. Please try again.");
			setLoading(false);
		}
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingChallengeId(null);
		fetchChallenges();
	};

	const handleFormCancel = () => {
		setShowForm(false);
		setEditingChallengeId(null);
	};

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

	if (showForm) {
		return (
			<ChallengeForm
				challengeId={editingChallengeId || undefined}
				onSuccess={handleFormSuccess}
				onCancel={handleFormCancel}
			/>
		);
	}

	return (
		<div className="bg-white shadow rounded-lg p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Coding Challenges
					</h1>
					<p className="text-sm text-gray-500">
						Manage timed coding challenges for students
					</p>
				</div>
				<button
					onClick={handleCreateClick}
					className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Create New Challenge
				</button>
			</div>

			{error && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
					<p className="text-red-600">{error}</p>
				</div>
			)}

			{loading ? (
				<div className="flex justify-center p-8">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
				</div>
			) : !challenges || challenges.length === 0 ? (
				<div className="text-center p-8 bg-gray-50 rounded-md">
					<p className="text-gray-500">
						No challenges found. Create your first challenge to get
						started.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Title
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Difficulty
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Category
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Time Limit
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Language
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{challenges.map((challenge) => (
								<tr
									key={challenge.id}
									className="hover:bg-gray-50"
								>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="font-medium text-gray-900">
											{challenge.title}
										</div>
										<div className="text-sm text-gray-500 truncate max-w-xs">
											{challenge.description.substring(
												0,
												60
											)}
											...
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyColor(
												challenge.difficulty
											)}`}
										>
											{challenge.difficulty}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{challenge.category}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{challenge.timeLimit} minutes
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{challenge.language}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div className="flex space-x-2">
											<button
												onClick={() =>
													handleEditClick(
														challenge.id
													)
												}
												className="text-indigo-600 hover:text-indigo-900 font-medium"
											>
												Edit
											</button>
											<button
												onClick={() =>
													handleDeleteClick(
														challenge.id
													)
												}
												className="text-red-600 hover:text-red-900 font-medium"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{deleteConfirmId && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 max-w-md w-full">
						<h3 className="text-lg font-medium text-gray-900 mb-4">
							Confirm Deletion
						</h3>
						<p className="text-sm text-gray-500 mb-4">
							Are you sure you want to delete this challenge? This
							action cannot be undone.
						</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={() => setDeleteConfirmId(null)}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteConfirm}
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ChallengeManagement;
