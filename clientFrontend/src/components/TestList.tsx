import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, InboxIcon } from "lucide-react";
import { Test } from "../types";
import { useQuery } from "react-query";
import { getTests } from "../api";

export default function TestList() {
	const navigate = useNavigate();
	const { data, isLoading, error } = useQuery("tests", getTests);
	const tests = Array.isArray(data)
		? data
		: Array.isArray(data?.tests)
		? data.tests
		: [];
	console.log("tests data:", data);

	const getTestStatus = (test: Test) => {
		const now = new Date();
		if (now < test.startTime) return "scheduled";
		if (now >= test.startTime && now <= test.endTime) return "in-progress";
		return "completed";
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString("en-US", {
			dateStyle: "medium",
			timeStyle: "short",
		});
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto" />
					<p className="mt-2 text-sm text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center text-red-600">
					<p className="text-lg font-semibold">Error loading tests</p>
					<p className="text-sm mt-1">Please try again later</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow">
			<div className="p-6 border-b border-gray-200">
				<div className="flex items-center gap-3">
					<Calendar className="w-6 h-6 text-indigo-600" />
					<h2 className="text-xl font-semibold text-gray-800">
						Scheduled Tests
					</h2>
				</div>
			</div>

			{!tests || tests.length === 0 ? (
				<div className="p-12 text-center">
					<InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-medium text-gray-900">
						No tests scheduled
					</h3>
					<p className="mt-1 text-sm text-gray-500">
						Get started by scheduling a new test.
					</p>
				</div>
			) : (
				<div className="divide-y divide-gray-200">
					{tests.map((test: Test) => {
						const status = getTestStatus(test);
						const statusColors = {
							scheduled: "bg-yellow-100 text-yellow-800",
							"in-progress": "bg-green-100 text-green-800",
							completed: "bg-gray-100 text-gray-800",
						};

						return (
							<div
								key={test.id}
								className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
								onClick={() => navigate(`/tests/${test.id}`)}
							>
								<div className="flex justify-between items-start mb-4">
									<div>
										<h3 className="text-lg font-medium text-gray-900">
											{test.title}
										</h3>
										<p className="text-sm text-gray-500 mt-1">
											{test.description}
										</p>
									</div>
									<span
										className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
									>
										{status.charAt(0).toUpperCase() +
											status.slice(1)}
									</span>
								</div>

								<div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4" />
										<span>
											Start: {formatDate(test.startTime)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4" />
										<span>
											Duration: {test.duration} mins
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4" />
										{/* Handle null or undefined safely */}
										<span>
											{test.questions?.length ?? 0}{" "}
											Questions
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
