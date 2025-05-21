import React, { useState, useCallback, useEffect } from "react";
import {
	Plus,
	ListChecks,
	AlignLeft,
	Code,
	ClipboardList,
	UserCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import {
	Routes,
	Route,
	Link,
	useLocation,
	useNavigate,
	Navigate,
} from "react-router-dom";
import QuestionForm from "./components/QuestionForm";
import TestScheduler from "./components/TestScheduler";
import QuestionBank from "./components/QuestionBank";
import TestList from "./components/TestList";
import TestAttempt from "./components/TestAttempt";
import UserProfile, { UserData } from "./components/UserProfile";
import StudentResults from "./components/StudentResults";
import { Question, QuestionType, Test } from "./types";
import * as api from "./api";
import ChallengeManagement from "./components/ChallengeManagement";
import Login from "./components/Login";
import OAuthCallback from "./components/OAuthCallback";

// Custom properties for our implementation of QuestionBank
interface CustomQuestionBankProps {
	onAddQuestion: () => void;
	onEditQuestion: (id: string) => void;
}

// Custom properties for our implementation of QuestionForm
interface CustomQuestionFormProps {
	questionId: string;
	isNew: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

// Define a typed section selector hook
function useSectionSelector(
	initialSection: "questions" | "tests" | "challenges"
) {
	const [section, setSection] = useState<
		"questions" | "tests" | "challenges"
	>(initialSection);

	const selectQuestions = useCallback(() => setSection("questions"), []);
	const selectTests = useCallback(() => setSection("tests"), []);
	const selectChallenges = useCallback(() => setSection("challenges"), []);

	return {
		section,
		selectQuestions,
		selectTests,
		selectChallenges,
		isQuestions: section === "questions",
		isTests: section === "tests",
		isChallenges: section === "challenges",
	};
}

function App() {
	const queryClient = useQueryClient();
	const [selectedType, setSelectedType] = React.useState<QuestionType | null>(
		null
	);
	const [showScheduler, setShowScheduler] = React.useState(false);
	const [showTests, setShowTests] = React.useState(false);
	const [showProfile, setShowProfile] = React.useState(false);
	const [selectedTest, setSelectedTest] = React.useState<Test | null>(null);
	const location = useLocation();
	const navigate = useNavigate();

	// Use the custom hook instead of raw useState
	const {
		section: activeSection,
		selectQuestions,
		selectTests,
		selectChallenges,
		isQuestions,
		isTests,
		isChallenges,
	} = useSectionSelector("questions");

	const [showQuestionFormState, setShowQuestionFormState] = useState(false);
	const [selectedQuestionId, setSelectedQuestionId] = useState("");
	const [isNewQuestion, setIsNewQuestion] = useState(true);

	// Log activeSection on every render
	console.log("App component rendered, activeSection:", activeSection);

	// Add effect to log section changes
	React.useEffect(() => {
		console.log("activeSection changed to:", activeSection);
	}, [activeSection]);

	// Check backend health on mount
	React.useEffect(() => {
		const checkBackendHealth = async () => {
			try {
				const health = await api.checkHealth();
				toast.success("Connected to backend successfully");
				console.log("Backend health check passed:", health);
			} catch (error) {
				toast.error("Failed to connect to backend");
				console.error("Backend health check failed:", error);
			}
		};
		checkBackendHealth();
	}, []);

	// Queries with error handling and loading states
	const {
		data: questions = [],
		isLoading: isLoadingQuestions,
		error: questionsError,
	} = useQuery<Question[]>("questions", api.getQuestions, {
		onError: (error: any) => {
			toast.error("Failed to fetch questions");
			console.error("Failed to fetch questions:", error);
		},
	});

	const {
		data: tests = [],
		isLoading: isLoadingTests,
		error: testsError,
	} = useQuery<Test[]>("tests", api.getTests, {
		onError: (error: any) => {
			toast.error("Failed to fetch tests");
			console.error("Failed to fetch tests:", error);
		},
	});

	// Mutations with success/error handling
	const createQuestionMutation = useMutation(api.createQuestion, {
		onSuccess: () => {
			queryClient.invalidateQueries("questions");
			setSelectedType(null);
			toast.success("Question created successfully");
		},
		onError: (error: any) => {
			toast.error("Failed to create question");
			console.error("Failed to create question:", error);
		},
	});

	const createTestMutation = useMutation(api.createTest, {
		onSuccess: () => {
			queryClient.invalidateQueries("tests");
			setShowScheduler(false);
			toast.success("Test scheduled successfully");
		},
		onError: (error: any) => {
			toast.error("Failed to schedule test");
			console.error("Failed to create test:", error);
		},
	});

	const submitTestMutation = useMutation(
		(data: { testId: string; answers: Record<string, any> }) =>
			api.submitTest(data.testId, data.answers),
		{
			onSuccess: () => {
				queryClient.invalidateQueries("tests");
				setSelectedTest(null);
				toast.success("Test submitted successfully");
			},
			onError: (error: any) => {
				toast.error("Failed to submit test");
				console.error("Failed to submit test:", error);
			},
		}
	);

	const handleQuestionSubmit = (data: any) => {
		createQuestionMutation.mutate(data);
	};

	const handleTestSchedule = (data: any) => {
		createTestMutation.mutate(data);
	};

	const handleTestSubmit = (answers: Record<string, any>) => {
		if (selectedTest) {
			submitTestMutation.mutate({
				testId: selectedTest.id,
				answers,
			});
		}
	};

	const handleBack = () => {
		setSelectedType(null);
		setShowScheduler(false);
		setShowTests(false);
		setShowProfile(false);
		setSelectedTest(null);
		console.log(
			"handleBack called, preserving activeSection:",
			activeSection
		);
	};

	const showQuestionForm = (id: string, isNew: boolean) => {
		setSelectedQuestionId(id);
		setIsNewQuestion(isNew);
		setShowQuestionFormState(true);
	};

	const handleQuestionFormSuccess = () => {
		queryClient.invalidateQueries("questions");
		setSelectedType(null);
		toast.success("Question saved successfully");
		setShowQuestionFormState(false);
	};

	// Authentication state
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [userRole, setUserRole] = useState<string | null>(null);

	// Check if user is already authenticated
	useEffect(() => {
		const token = localStorage.getItem("authToken");
		const role = localStorage.getItem("userRole");

		if (token) {
			setAuthToken(token);
			setUserRole(role);
			setIsAuthenticated(true);
		}
	}, []);

	// Handle successful login
	const handleLoginSuccess = (token: string) => {
		setAuthToken(token);
		setIsAuthenticated(true);
	};

	// Handle logout
	const handleLogout = () => {
		api.logout();
		setAuthToken(null);
		setUserRole(null);
		setIsAuthenticated(false);
		navigate("/login");
	};

	if (selectedTest) {
		return (
			<TestAttempt
				test={selectedTest}
				onSubmit={handleTestSubmit}
				onExit={handleBack}
			/>
		);
	}

	if (isLoadingQuestions || isLoadingTests) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (questionsError || testsError) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-red-600 mb-2">
						Error Loading Data
					</h2>
					<p className="text-gray-600">
						Please check your connection and try again
					</p>
					<button
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-100">
			{isAuthenticated ? (
				<>
					<header className="bg-white shadow">
						<div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
							<div className="flex justify-between items-center">
								<h1 className="text-2xl font-bold text-gray-900">
									Admin Panel
								</h1>
								<div className="flex space-x-4 items-center">
									<button
										className={`px-4 py-2 rounded-md ${
											isQuestions &&
											location.pathname === "/"
												? "bg-indigo-600 text-white"
												: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
										}`}
										onClick={() => {
											selectQuestions();
											navigate("/");
										}}
									>
										Question Bank
									</button>
									<button
										className={`px-4 py-2 rounded-md ${
											isTests
												? "bg-indigo-600 text-white"
												: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
										}`}
										onClick={() => {
											selectTests();
											navigate("/");
										}}
									>
										Schedule Tests
									</button>
									<button
										className={`px-4 py-2 rounded-md ${
											isChallenges &&
											location.pathname === "/"
												? "bg-indigo-600 text-white"
												: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
										}`}
										onClick={() => {
											selectChallenges();
											navigate("/");
										}}
									>
										Coding Challenges
									</button>
									<button
										className={`px-4 py-2 rounded-md ${
											location.pathname ===
											"/student-results"
												? "bg-indigo-600 text-white"
												: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
										}`}
										onClick={() =>
											navigate("/student-results")
										}
									>
										Student Results
									</button>
									<button
										onClick={handleLogout}
										className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
									>
										Logout
									</button>
								</div>
							</div>
						</div>
					</header>

					<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
						<Routes>
							<Route
								path="/login"
								element={<Navigate to="/" replace />}
							/>
							<Route
								path="/"
								element={
									<>
										{isQuestions && (
											<QuestionBank
												questions={questions}
												onSelect={(question) => {
													// Handle question selection
													showQuestionForm(
														question.id,
														false
													);
												}}
											/>
										)}

										{isTests && (
											<TestScheduler
												onSchedule={handleTestSchedule}
												onBack={selectQuestions}
												questions={questions}
											/>
										)}

										{isChallenges && (
											<ChallengeManagement />
										)}
									</>
								}
							/>
							<Route
								path="/student-results"
								element={<StudentResults />}
							/>
						</Routes>

						{showQuestionFormState && (
							<div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
								<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
									<QuestionForm
										type={selectedType || "mcq"}
										onSubmit={handleQuestionSubmit}
										onBack={() =>
											setShowQuestionFormState(false)
										}
									/>
								</div>
							</div>
						)}
					</main>
				</>
			) : (
				<Routes>
					<Route
						path="/login"
						element={<Login onLoginSuccess={handleLoginSuccess} />}
					/>
					<Route path="/oauth-callback" element={<OAuthCallback />} />
					<Route
						path="*"
						element={<Navigate to="/login" replace />}
					/>
				</Routes>
			)}
		</div>
	);
}

export default App;
