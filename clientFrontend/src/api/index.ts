import axios from "axios";
import { Test, Question, User, Challenge } from "../types";

// Create axios instance with default config
export const api = axios.create({
	baseURL: "/api",
	timeout: 15000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
	withCredentials: true, // Important for handling cookies
});

// Add request interceptor for auth
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Active tests endpoints
export const getActiveTests = async (): Promise<Test[]> => {
	const response = await api.get("/tests/active");
	return response.data;
};

export const getScheduledTests = async (): Promise<Test[]> => {
	const response = await api.get("/tests/scheduled");
	return response.data;
};

// Connection status management
let isConnected = true;
const connectionListeners: ((status: boolean) => void)[] = [];

export const getConnectionStatus = (): boolean => isConnected;

export const onConnectionStatusChange = (
	listener: (status: boolean) => void
): (() => void) => {
	connectionListeners.push(listener);
	return () => {
		const index = connectionListeners.indexOf(listener);
		if (index > -1) {
			connectionListeners.splice(index, 1);
		}
	};
};

const updateConnectionStatus = (status: boolean) => {
	if (isConnected !== status) {
		isConnected = status;
		connectionListeners.forEach((listener) => listener(status));
	}
};

// Add response interceptor for error handling
api.interceptors.response.use(
	(response) => {
		updateConnectionStatus(true);
		return response;
	},
	(error) => {
		if (!error.response) {
			updateConnectionStatus(false);
			return Promise.reject(
				new Error("Network error — ensure the backend is running on port 8080")
			);
		}

		if (error.response.status === 401) {
			// Clear invalid/expired token and force re-login
			localStorage.removeItem("token");
			delete api.defaults.headers.common["Authorization"];
			if (!window.location.pathname.includes("/login")) {
				window.location.href = "/login";
			}
			return Promise.reject(new Error("Session expired. Please log in again."));
		}

		updateConnectionStatus(error.response.status < 500);
		return Promise.reject(error);
	}
);

// Auth token management
export const setAuthToken = (token: string | null) => {
	if (token) {
		api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
		localStorage.setItem("token", token);
	} else {
		delete api.defaults.headers.common["Authorization"];
		localStorage.removeItem("token");
	}
};

// Initialize auth token from localStorage
const token = localStorage.getItem("token");
if (token) {
	setAuthToken(token);
}

// Health check
export const checkHealth = () => api.get("/health");

// Test endpoints
export const getTests = async (): Promise<Test[]> => {
	const response = await api.get("/tests");
	return response.data;
};

export const getTest = async (id: string): Promise<Test> => {
	const response = await api.get(`/tests/${id}`);
	return response.data;
};

export const createTest = async (test: Partial<Test>): Promise<Test> => {
	const response = await api.post("/tests", test);
	return response.data;
};

export const updateTest = async (
	id: string,
	test: Partial<Test>
): Promise<Test> => {
	const response = await api.put(`/tests/${id}`, test);
	return response.data;
};

export const deleteTest = async (id: string): Promise<void> => {
	await api.delete(`/tests/${id}`);
};

// Question endpoints
export const getQuestions = async (): Promise<Question[]> => {
	const response = await api.get("/questions");
	return response.data;
};

export const getQuestion = async (id: string): Promise<Question> => {
	const response = await api.get(`/questions/${id}`);
	return response.data;
};

export const createQuestion = async (
	question: Partial<Question>
): Promise<Question> => {
	const response = await api.post("/questions", question);
	return response.data;
};

export const updateQuestion = async (
	id: string,
	question: Partial<Question>
): Promise<Question> => {
	const response = await api.put(`/questions/${id}`, question);
	return response.data;
};

export const deleteQuestion = async (id: string): Promise<void> => {
	await api.delete(`/questions/${id}`);
};

// User endpoints
export const getUsers = async (): Promise<User[]> => {
	const response = await api.get("/users");
	return response.data;
};

export const getUser = async (id: string): Promise<User> => {
	const response = await api.get(`/users/${id}`);
	return response.data;
};

export const createUser = async (user: Partial<User>): Promise<User> => {
	const response = await api.post("/users", user);
	return response.data;
};

export const updateUser = async (
	id: string,
	user: Partial<User>
): Promise<User> => {
	const response = await api.put(`/users/${id}`, user);
	return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
	await api.delete(`/users/${id}`);
};

// Challenge endpoints
export const getChallenges = async (filter?: any): Promise<Challenge[]> => {
	const response = await api.get("/challenges", { params: filter });
	return response.data;
};

export const getChallenge = async (id: string): Promise<Challenge> => {
	const response = await api.get(`/challenges/${id}`);
	return response.data;
};

export const createChallenge = async (
	challenge: Partial<Challenge>
): Promise<Challenge> => {
	const response = await api.post("/challenges", challenge);
	return response.data;
};

export const updateChallenge = async (
	id: string,
	challenge: Partial<Challenge>
): Promise<Challenge> => {
	const response = await api.put(`/challenges/${id}`, challenge);
	return response.data;
};

export const deleteChallenge = async (id: string): Promise<void> => {
	await api.delete(`/challenges/${id}`);
};

// Auth endpoints
export const login = async (
	email: string,
	password: string
): Promise<{ token: string; user: User }> => {
	const response = await api.post("/auth/login", { email, password });
	const { token, user } = response.data;
	setAuthToken(token);
	return { token, user };
};

export const logout = async (): Promise<void> => {
	await api.post("/auth/logout");
	setAuthToken(null);
};

export const getCurrentUser = async (): Promise<User> => {
	const response = await api.get("/auth/me");
	return response.data;
};

// Test submission endpoint
export const submitTest = async (
	testId: string,
	submission: any // Accepts a flat object with all fields
): Promise<{ score: number; feedback: string }> => {
	const response = await api.post(`/tests/${testId}/submit`, submission);
	return response.data;
};

// Challenge submission endpoint
export const submitChallengeAttempt = async (
	challengeId: string,
	submission: any
): Promise<any> => {
	const response = await api.post(
		`/challenges/${challengeId}/submit`,
		submission
	);
	return response.data;
};

export const getRecommendedTests = async (): Promise<any> => {
	const response = await api.get("/recommended-tests");
	return response.data;
};

// Challenge check endpoint
export const checkChallengeAttempt = async (
	challengeId: string,
	solution: string
): Promise<{ message: string; result: any }> => {
	const response = await api.post(`/challenges/${challengeId}/check`, {
		solution,
	});
	return response.data;
};

// Test attempt endpoints
export const getTestAttempt = async (
	attemptId: string
): Promise<{
	id: string;
	testId: string;
	userId: string;
	score: number;
	answers: Record<string, string>;
	feedback: string;
	submittedAt: string;
}> => {
	const response = await api.get(`/tests/attempts/${attemptId}`);
	return response.data;
};
// Student Analytics & Activity (Node.js userModule)
export const getStudentAnalytics = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}`);
	return response.data;
};

export const trackActivity = async (
	studentId: string,
	action: string,
	metadata: any = {}
): Promise<any> => {
	const response = await api.post(`/students/${studentId}/activity`, {
		action,
		metadata,
	});
	return response.data;
};

export const getStudentRecommendations = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/recommendations`);
	return response.data;
};

export const getStudentInsights = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/insights`);
	return response.data;
};

export const getStudentMilestones = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/milestones`);
	return response.data;
};

// Returns the authenticated user's own test results (no admin required)
export const getMyResults = async (): Promise<any[]> => {
	const response = await api.get("/protected/my-results");
	return response.data ?? [];
};

export const getStudentSkillAnalytics = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/analytics/skills`);
	return response.data;
};

export const getStudentActivityHeatmap = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/analytics/heatmap`);
	return response.data;
};

export const getStudentPerformanceTimeline = async (studentId: string): Promise<any> => {
	const response = await api.get(`/students/${studentId}/analytics/timeline`);
	return response.data;
};
