import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

const TestResults: React.FC = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<TestResult[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [tests, setTests] = useState<Test[]>([]);
	const [selectedStudent, setSelectedStudent] = useState<string>("all");
	const [selectedTest, setSelectedTest] = useState<string>("all");
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			console.log("Fetching test results data...");

			// MOCK DATA - Replace with actual API calls when ready
			const mockResults: TestResult[] = [
				{
					studentId: "s1",
					studentName: "Jane Smith",
					studentEmail: "jane.smith@example.com",
					testId: "t1",
					testTitle: "JavaScript Fundamentals",
					status: "Passed",
					percentageScore: 85.0,
					pointsScored: 85,
					totalPoints: 100,
					timeSpent: 3600,
					submittedAt: "2024-03-15T14:30:00Z",
					answers: [
						{
							questionId: "q1",
							questionType: "MCQ",
							score: 20,
							maxScore: 20,
						},
						{
							questionId: "q2",
							questionType: "Subjective",
							score: 15,
							maxScore: 20,
						},
					],
				},
			];

			const mockStudents: Student[] = [
				{
					id: "s1",
					name: "Jane Smith",
					email: "jane.smith@example.com",
				},
			];

			const mockTests: Test[] = [
				{
					id: "t1",
					title: "JavaScript Fundamentals",
					totalPoints: 100,
				},
			];

			try {
				// Try to fetch from the real API
				const timestamp = new Date().getTime();
				const [resultsRes, studentsRes, testsRes] = await Promise.all([
					axios.get(`/api/admin/test-results?t=${timestamp}`),
					axios.get(`/api/admin/students?t=${timestamp}`),
					axios.get(`/api/admin/tests?t=${timestamp}`),
				]);

				setResults(
					Array.isArray(resultsRes.data)
						? resultsRes.data
						: mockResults
				);
				setStudents(
					Array.isArray(studentsRes.data)
						? studentsRes.data
						: mockStudents
				);
				setTests(
					Array.isArray(testsRes.data) ? testsRes.data : mockTests
				);
			} catch (apiError) {
				console.warn("Using mock data instead of API:", apiError);
				setResults(mockResults);
				setStudents(mockStudents);
				setTests(mockTests);
			}

			setError(null);
		} catch (err) {
			console.error("Failed to fetch results:", err);
			setError("Failed to load test results. Please try again later.");
			setResults([]);
			setStudents([]);
			setTests([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		let intervalId: number | null = null;
		if (autoRefresh) {
			intervalId = window.setInterval(fetchData, 30000);
		}
		return () => {
			if (intervalId) window.clearInterval(intervalId);
		};
	}, [autoRefresh, fetchData]);

	const filteredResults = results.filter((result) => {
		const studentMatch =
			selectedStudent === "all" || result.studentId === selectedStudent;
		const testMatch =
			selectedTest === "all" || result.testId === selectedTest;
		return studentMatch && testMatch;
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
			"Test Title",
			"Status",
			"Score",
			"Time Spent",
			"Submitted At",
		];

		const csvData = filteredResults.map((result) => [
			result.studentName,
			result.studentEmail,
			result.testTitle,
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
		link.download = `test-results-${
			new Date().toISOString().split("T")[0]
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
				<h1 className="text-2xl font-bold">Test Results</h1>
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

			<div className="grid grid-cols-2 gap-4 mb-6">
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
						Filter by Test
					</label>
					<select
						value={selectedTest}
						onChange={(e) => setSelectedTest(e.target.value)}
						className="w-full p-2 border rounded"
					>
						<option value="all">All Tests</option>
						{tests.map((test) => (
							<option key={test.id} value={test.id}>
								{test.title}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full bg-white border">
					<thead>
						<tr className="bg-gray-100">
							<th className="px-4 py-2">Student</th>
							<th className="px-4 py-2">Test</th>
							<th className="px-4 py-2">Status</th>
							<th className="px-4 py-2">Score</th>
							<th className="px-4 py-2">Time Spent</th>
							<th className="px-4 py-2">Submitted At</th>
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
									{result.testTitle}
								</td>
								<td className="px-4 py-2">
									<span
										className={`px-2 py-1 rounded ${
											result.status === "Passed"
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
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default TestResults;
