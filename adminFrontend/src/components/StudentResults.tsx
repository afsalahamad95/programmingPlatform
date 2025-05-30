import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";

interface Student {
	id: string;
	name: string;
	email: string;
}

interface Test {
	id: string;
	title: string;
	totalPoints: number;
}

interface Challenge {
	id: string;
	title: string;
	totalPoints: number;
}

interface TestResult {
	studentId: string;
	studentName: string;
	studentEmail: string;
	testId: string;
	testTitle: string;
	status: "Submitted" | "Passed" | "Failed";
	percentageScore: number;
	pointsScored: number;
	totalPoints: number;
	timeSpent: number; // in seconds
	submittedAt: string;
	answers: {
		questionId: string;
		questionType: "MCQ" | "Subjective" | "Coding";
		score: number;
		maxScore: number;
	}[];
}

interface ChallengeResult {
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
	testCases: {
		passed: number;
		total: number;
	};
}

type ResultType = "test" | "challenge";

const StudentResults: React.FC = () => {
	const [resultType, setResultType] = useState<ResultType>("test");
	const [testResults, setTestResults] = useState<TestResult[]>([]);
	const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [tests, setTests] = useState<Test[]>([]);
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [selectedStudent, setSelectedStudent] = useState<string>("all");
	const [selectedItem, setSelectedItem] = useState<string>("all");
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch all data in parallel
			const [
				testResultsData,
				challengeResultsData,
				studentsData,
				testsData,
				challengesData,
			] = await Promise.all([
				adminApi.getTestResults(),
				adminApi.getStudentResults(),
				adminApi.getStudentResults(), // We'll extract unique students from results
				adminApi.getTestResults(), // We'll extract unique tests from results
				adminApi.getStudentResults(), // We'll extract unique challenges from results
			]);

			setTestResults(testResultsData);
			setChallengeResults(challengeResultsData);

			// Extract unique students from results
			const uniqueStudents = new Map<string, Student>();
			[...testResultsData, ...challengeResultsData].forEach((result: TestResult | ChallengeResult) => {
				if (!uniqueStudents.has(result.studentId)) {
					uniqueStudents.set(result.studentId, {
						id: result.studentId,
						name: result.studentName,
						email: result.studentEmail,
					});
				}
			});
			setStudents(Array.from(uniqueStudents.values()));

			// Extract unique tests from results
			const uniqueTests = new Map<string, Test>();
			testResultsData.forEach((result: TestResult) => {
				if (!uniqueTests.has(result.testId)) {
					uniqueTests.set(result.testId, {
						id: result.testId,
						title: result.testTitle,
						totalPoints: result.totalPoints,
					});
				}
			});
			setTests(Array.from(uniqueTests.values()));

			// Extract unique challenges from results
			const uniqueChallenges = new Map<string, Challenge>();
			challengeResultsData.forEach((result: ChallengeResult) => {
				if (!uniqueChallenges.has(result.challengeId)) {
					uniqueChallenges.set(result.challengeId, {
						id: result.challengeId,
						title: result.challengeTitle,
						totalPoints: result.totalPoints,
					});
				}
			});
			setChallenges(Array.from(uniqueChallenges.values()));
		} catch (err) {
			console.error("Error fetching data:", err);
			setError("Failed to load data. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		let intervalId: number | null = null;
		if (autoRefresh) {
			intervalId = window.setInterval(fetchData, 30000);
		}
		return () => {
			if (intervalId) window.clearInterval(intervalId);
		};
	}, [autoRefresh]);

	const filteredResults =
		resultType === "test"
			? testResults.filter((result) => {
				const studentMatch =
					selectedStudent === "all" ||
					result.studentId === selectedStudent;
				const itemMatch =
					selectedItem === "all" ||
					result.testId === selectedItem;
				return studentMatch && itemMatch;
			})
			: challengeResults.filter((result) => {
				const studentMatch =
					selectedStudent === "all" ||
					result.studentId === selectedStudent;
				const itemMatch =
					selectedItem === "all" ||
					result.challengeId === selectedItem;
				return studentMatch && itemMatch;
			});

	const formatTime = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	};

	const exportToCSV = () => {
		const headers = [
			"Student Name",
			"Student Email",
			resultType === "test" ? "Test Title" : "Challenge Title",
			"Status",
			"Score",
			"Time Spent",
			"Submitted At",
		];

		const csvData = filteredResults.map((result) => [
			result.studentName,
			result.studentEmail,
			resultType === "test"
				? (result as TestResult).testTitle
				: (result as ChallengeResult).challengeTitle,
			result.status,
			`${result.pointsScored}/${result.totalPoints} (${result.percentageScore}%)`,
			formatTime(result.timeSpent),
			new Date(result.submittedAt).toLocaleString(),
		]);

		const csvContent = [
			headers.join(","),
			...csvData.map((row) => row.join(",")),
		].join("\n");

		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${resultType}-results-${new Date().toISOString().split("T")[0]
			}.csv`;
		link.click();
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">
				Loading...
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500 text-center p-4">{error}</div>;
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Student Results</h1>
				<div className="space-x-4">
					<button
						onClick={exportToCSV}
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Export to CSV
					</button>
					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
							className="form-checkbox"
						/>
						<span>Auto-refresh</span>
					</label>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div>
					<label className="block text-sm font-medium mb-2">
						Result Type
					</label>
					<select
						value={resultType}
						onChange={(e) => {
							setResultType(e.target.value as ResultType);
							setSelectedItem("all");
						}}
						className="w-full p-2 border rounded"
					>
						<option value="test">Tests</option>
						<option value="challenge">Challenges</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">
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
								{student.name}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">
						Filter by {resultType === "test" ? "Test" : "Challenge"}
					</label>
					<select
						value={selectedItem}
						onChange={(e) => setSelectedItem(e.target.value)}
						className="w-full p-2 border rounded"
					>
						<option value="all">
							All {resultType === "test" ? "Tests" : "Challenges"}
						</option>
						{(resultType === "test" ? tests : challenges).map(
							(item) => (
								<option key={item.id} value={item.id}>
									{item.title}
								</option>
							)
						)}
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full bg-white border">
					<thead>
						<tr className="bg-gray-100">
							<th className="px-4 py-2">Student</th>
							<th className="px-4 py-2">
								{resultType === "test" ? "Test" : "Challenge"}
							</th>
							<th className="px-4 py-2">Status</th>
							<th className="px-4 py-2">Score</th>
							<th className="px-4 py-2">Time Spent</th>
							<th className="px-4 py-2">Submitted At</th>
							{resultType === "challenge" && (
								<th className="px-4 py-2">Test Cases</th>
							)}
						</tr>
					</thead>
					<tbody>
						{filteredResults.map((result, index) => (
							<tr key={index} className="border-t">
								<td className="px-4 py-2">
									<div>{result.studentName}</div>
									<div className="text-sm text-gray-500">
										{result.studentEmail}
									</div>
								</td>
								<td className="px-4 py-2">
									{resultType === "test"
										? (result as TestResult).testTitle
										: (result as ChallengeResult)
											.challengeTitle}
								</td>
								<td className="px-4 py-2">
									<span
										className={`px-2 py-1 rounded ${result.status === "Passed"
											? "bg-green-100 text-green-800"
											: result.status === "Failed"
												? "bg-red-100 text-red-800"
												: "bg-yellow-100 text-yellow-800"
											}`}
									>
										{result.status}
									</span>
								</td>
								<td className="px-4 py-2">
									{result.pointsScored}/{result.totalPoints}
									<div className="text-sm text-gray-500">
										({result.percentageScore}%)
									</div>
								</td>
								<td className="px-4 py-2">
									{formatTime(result.timeSpent)}
								</td>
								<td className="px-4 py-2">
									{new Date(
										result.submittedAt
									).toLocaleString()}
								</td>
								{resultType === "challenge" && (
									<td className="px-4 py-2">
										{(result as ChallengeResult).testCases?.passed || 0}/
										{(result as ChallengeResult).testCases?.total || 0}
									</td>
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default StudentResults;
