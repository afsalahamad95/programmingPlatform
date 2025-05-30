import axios from "axios";

// Base URL for API
const API_URL = "/api";

// Set auth token for all requests if available
export const setAuthToken = (token: string | null) => {
	if (token) {
		axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
		localStorage.setItem("authToken", token);
	} else {
		delete axios.defaults.headers.common["Authorization"];
		localStorage.removeItem("authToken");
	}
};

// Initialize axios with token from localStorage
const token = localStorage.getItem("authToken");
if (token) {
	setAuthToken(token);
}

// Add request interceptor to ensure token is always set
axios.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("authToken");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Clear token and redirect to login on auth error
			setAuthToken(null);
			window.location.href = "/login";
		}
		return Promise.reject(error);
	}
);

// Authentication APIs
export const login = async (email: string, password: string) => {
	const response = await axios.post(`${API_URL}/auth/login`, {
		email,
		password,
	});
	return response.data;
};

export const register = async (userData: {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}) => {
	const response = await axios.post(`${API_URL}/auth/register`, userData);
	return response.data;
};

export const getCurrentUser = async () => {
	const response = await axios.get(`${API_URL}/protected/user`);
	return response.data;
};

export const logout = () => {
	localStorage.removeItem("authToken");
	localStorage.removeItem("userRole");
	setAuthToken(null);
};

// Check the backend health
export const checkHealth = async () => {
	const response = await axios.get(`${API_URL}/health`);
	return response.data;
};

// Questions APIs
export const getQuestions = async () => {
	const response = await axios.get(`${API_URL}/questions`);
	return response.data;
};

export const createQuestion = async (questionData: any) => {
	const response = await axios.post(`${API_URL}/questions`, questionData);
	return response.data;
};

export const updateQuestion = async (id: string, questionData: any) => {
	const response = await axios.put(
		`${API_URL}/questions/${id}`,
		questionData
	);
	return response.data;
};

export const deleteQuestion = async (id: string) => {
	const response = await axios.delete(`${API_URL}/questions/${id}`);
	return response.data;
};

// Tests APIs
export const getTests = async () => {
	const response = await axios.get(`${API_URL}/tests`);
	return response.data;
};

export const createTest = async (testData: any) => {
	const response = await axios.post(`${API_URL}/tests`, testData);
	return response.data;
};

export const submitTest = async (testId: string, answers: any) => {
	const response = await axios.post(`${API_URL}/tests/${testId}/submit`, {
		answers,
	});
	return response.data;
};

// Student Results APIs
export const getStudentResults = async () => {
	const response = await axios.get(`${API_URL}/admin/student-results`);
	return response.data;
};

export const getStudentResultsByStudent = async (studentId: string) => {
	const response = await axios.get(
		`${API_URL}/admin/student-results/${studentId}`
	);
	return response.data;
};

export const getStudentResultsByChallenge = async (challengeId: string) => {
	const response = await axios.get(
		`${API_URL}/admin/student-results/challenge/${challengeId}`
	);
	return response.data;
};

// Coding Challenges APIs
export const getChallenges = async () => {
	const response = await axios.get(`${API_URL}/challenges`);
	return response.data;
};

export const getChallenge = async (id: string) => {
	const response = await axios.get(`${API_URL}/challenges/${id}`);
	return response.data;
};

export const createChallenge = async (challengeData: any) => {
	const response = await axios.post(`${API_URL}/challenges`, challengeData);
	return response.data;
};

export const updateChallenge = async (id: string, challengeData: any) => {
	const response = await axios.put(
		`${API_URL}/challenges/${id}`,
		challengeData
	);
	return response.data;
};

export const deleteChallenge = async (id: string) => {
	const response = await axios.delete(`${API_URL}/challenges/${id}`);
	return response.data;
};

// Test Results APIs
export const getTestResults = async () => {
	const response = await axios.get(`${API_URL}/admin-protected/test-results`);
	return response.data;
};

export const getTestResultsByStudent = async (studentId: string) => {
	const response = await axios.get(
		`${API_URL}/admin-protected/test-results/student/${studentId}`
	);
	return response.data;
};

export const getTestResultsByTest = async (testId: string) => {
	const response = await axios.get(
		`${API_URL}/admin-protected/test-results/test/${testId}`
	);
	return response.data;
};

// Admin-specific API endpoints
export const adminApi = {
	getStudentResults: async () => {
		const response = await axios.get(
			`${API_URL}/admin-protected/student-results`
		);
		return response.data;
	},
	getStudentResultsByStudent: async (studentId: string) => {
		const response = await axios.get(
			`${API_URL}/admin-protected/student-results/${studentId}`
		);
		return response.data;
	},
	getStudentResultsByChallenge: async (challengeId: string) => {
		const response = await axios.get(
			`${API_URL}/admin-protected/student-results/challenge/${challengeId}`
		);
		return response.data;
	},
	getTestResults: async () => {
		const response = await axios.get(
			`${API_URL}/admin-protected/test-results`
		);
		return response.data;
	},
	getTestResultsByStudent: async (studentId: string) => {
		const response = await axios.get(
			`${API_URL}/admin-protected/test-results/student/${studentId}`
		);
		return response.data;
	},
	getTestResultsByTest: async (testId: string) => {
		const response = await axios.get(
			`${API_URL}/admin-protected/test-results/test/${testId}`
		);
		return response.data;
	},
};

// Check if user has admin role
export const isAdmin = () => {
	const role = localStorage.getItem("userRole");
	return role === "admin";
};
