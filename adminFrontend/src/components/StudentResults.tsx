import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Student {
	id: string;
	name: string;
	email: string;
}

interface Challenge {
	id: string;
	title: string;
}

interface StudentResult {
	studentId: string;
	studentName: string;
	studentEmail: string;
	challengeId: string;
	challengeTitle: string;
	status: "Submitted" | "Passed" | "Failed";
	percentageScore: number;
	pointsScored: number;
	totalPoints: number;
	timeSpent: number; // in seconds
	submittedAt: string;
}

const StudentResults: React.FC = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<StudentResult[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [selectedStudent, setSelectedStudent] = useState<string>("all");
	const [selectedChallenge, setSelectedChallenge] = useState<string>("all");

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch all required data in parallel
				const [resultsRes, studentsRes, challengesRes] =
					await Promise.all([
						axios.get("/api/admin/student-results"),
						axios.get("/api/admin/students"),
						axios.get("/api/admin/challenges"),
					]);

				setResults(resultsRes.data);
				setStudents(studentsRes.data);
				setChallenges(challengesRes.data);
				setError(null);
			} catch (err) {
				console.error("Failed to fetch results:", err);
				setError(
					"Failed to load student results. Please try again later."
				);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Filter results based on selected student and challenge
	const filteredResults = results.filter((result) => {
		const studentMatch =
			selectedStudent === "all" || result.studentId === selectedStudent;
		const challengeMatch =
			selectedChallenge === "all" ||
			result.challengeId === selectedChallenge;
		return studentMatch && challengeMatch;
	});

	// Get unique student IDs from results for summary
	const uniqueStudentIds = [
		...new Set(filteredResults.map((r) => r.studentId)),
	];

	// Calculate average scores per student
	const studentAverages = uniqueStudentIds.map((studentId) => {
		const studentResults = filteredResults.filter(
			(r) => r.studentId === studentId
		);
		const totalScore = studentResults.reduce(
			(sum, r) => sum + r.percentageScore,
			0
		);
		const averageScore = totalScore / studentResults.length;
		const student = studentResults[0]; // Get the first result to access student info

		return {
			studentId,
			studentName: student.studentName,
			studentEmail: student.studentEmail,
			averageScore,
			challengesAttempted: studentResults.length,
			challengesPassed: studentResults.filter(
				(r) => r.status === "Passed"
			).length,
		};
	});

	// Export results to CSV
	const exportToCSV = () => {
		// Prepare headers
		const headers = [
			"Student ID",
			"Student Name",
			"Student Email",
			"Challenge",
			"Status",
			"Score (%)",
			"Points",
			"Total Points",
			"Time Spent (min)",
			"Submitted At",
		].join(",");

		// Convert results to CSV rows
		const rows = filteredResults.map((r) =>
			[
				r.studentId,
				`"${r.studentName}"`, // Quote names to handle commas
				r.studentEmail,
				`"${r.challengeTitle}"`,
				r.status,
				r.percentageScore.toFixed(1),
				r.pointsScored.toFixed(1),
				r.totalPoints.toFixed(1),
				(r.timeSpent / 60).toFixed(1),
				new Date(r.submittedAt).toLocaleString(),
			].join(",")
		);

		// Combine headers and rows
		const csv = [headers, ...rows].join("\n");

		// Create and trigger download
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`student-results-${new Date().toISOString().split("T")[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Export summary to CSV
	const exportSummaryToCSV = () => {
		// Prepare headers
		const headers = [
			"Student ID",
			"Student Name",
			"Student Email",
			"Average Score (%)",
			"Challenges Attempted",
			"Challenges Passed",
			"Pass Rate (%)",
		].join(",");

		// Convert summary to CSV rows
		const rows = studentAverages.map((s) =>
			[
				s.studentId,
				`"${s.studentName}"`, // Quote names to handle commas
				s.studentEmail,
				s.averageScore.toFixed(1),
				s.challengesAttempted,
				s.challengesPassed,
				((s.challengesPassed / s.challengesAttempted) * 100).toFixed(1),
			].join(",")
		);

		// Combine headers and rows
		const csv = [headers, ...rows].join("\n");

		// Create and trigger download
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`student-summary-${new Date().toISOString().split("T")[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading) {
		return (
			<div className="text-center p-8">Loading student results...</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl mx-auto p-4">
				<div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
					{error}
				</div>
				<button
					onClick={() => navigate("/admin/dashboard")}
					className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Back to Dashboard
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto p-4">
			<h1 className="text-2xl font-bold mb-6">Student Results</h1>

			{/* Filters */}
			<div className="bg-white shadow rounded-lg p-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Filter by Student
						</label>
						<select
							value={selectedStudent}
							onChange={(e) => setSelectedStudent(e.target.value)}
							className="w-full p-2 border rounded"
						>
							<option value="all">All Students</option>
							{students.map((student) => (
								<option key={student.id} value={student.id}>
									{student.name} ({student.email})
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Filter by Challenge
						</label>
						<select
							value={selectedChallenge}
							onChange={(e) =>
								setSelectedChallenge(e.target.value)
							}
							className="w-full p-2 border rounded"
						>
							<option value="all">All Challenges</option>
							{challenges.map((challenge) => (
								<option key={challenge.id} value={challenge.id}>
									{challenge.title}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Export Buttons */}
			<div className="flex space-x-4 mb-4">
				<button
					onClick={exportToCSV}
					className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					disabled={filteredResults.length === 0}
				>
					Export Detailed Results to CSV
				</button>
				<button
					onClick={exportSummaryToCSV}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					disabled={filteredResults.length === 0}
				>
					Export Student Summary to CSV
				</button>
			</div>

			{/* Student Summary Section */}
			{studentAverages.length > 0 && (
				<div className="bg-white shadow rounded-lg p-4 mb-6">
					<h2 className="text-xl font-semibold mb-4">
						Student Performance Summary
					</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Student
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Email
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Avg. Score
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Challenges Attempted
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Pass Rate
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{studentAverages.map((student) => (
									<tr key={student.studentId}>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="font-medium text-gray-900">
												{student.studentName}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{student.studentEmail}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div
												className={`text-sm font-medium ${
													student.averageScore >= 80
														? "text-green-700"
														: student.averageScore >=
														  60
														? "text-yellow-700"
														: "text-red-700"
												}`}
											>
												{student.averageScore.toFixed(
													1
												)}
												%
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{student.challengesPassed} /{" "}
											{student.challengesAttempted}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div
												className={`text-sm font-medium ${
													student.challengesPassed /
														student.challengesAttempted >=
													0.8
														? "text-green-700"
														: student.challengesPassed /
																student.challengesAttempted >=
														  0.6
														? "text-yellow-700"
														: "text-red-700"
												}`}
											>
												{(
													(student.challengesPassed /
														student.challengesAttempted) *
													100
												).toFixed(1)}
												%
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Detailed Results Table */}
			<div className="bg-white shadow rounded-lg p-4">
				<h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
				{filteredResults.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Student
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Challenge
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Score
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Points
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Time Spent
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Submitted
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredResults.map((result, index) => (
									<tr key={index}>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="font-medium text-gray-900">
												{result.studentName}
											</div>
											<div className="text-sm text-gray-500">
												{result.studentEmail}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{result.challengeTitle}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
													result.status === "Passed"
														? "bg-green-100 text-green-800"
														: result.status ===
														  "Failed"
														? "bg-red-100 text-red-800"
														: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{result.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div
												className={`text-sm font-medium ${
													result.percentageScore >= 80
														? "text-green-700"
														: result.percentageScore >=
														  60
														? "text-yellow-700"
														: "text-red-700"
												}`}
											>
												{result.percentageScore.toFixed(
													1
												)}
												%
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{result.pointsScored.toFixed(1)} /{" "}
											{result.totalPoints.toFixed(1)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{Math.floor(result.timeSpent / 60)}:
											{(result.timeSpent % 60)
												.toString()
												.padStart(2, "0")}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(
												result.submittedAt
											).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center p-4 bg-gray-50 text-gray-700 rounded-md">
						No results found for the selected filters.
					</div>
				)}
			</div>
		</div>
	);
};

export default StudentResults;
