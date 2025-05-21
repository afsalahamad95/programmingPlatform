import axios from "axios";

const API_URL = "http://localhost:3000/api";

// Create axios instance with default config
const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 5000, // 5 seconds timeout
});

// Add request interceptor for logging
api.interceptors.request.use(
	(config) => {
		console.log(
			`🚀 Making ${config.method?.toUpperCase()} request to ${config.url}`
		);
		return config;
	},
	(error) => {
		console.error("❌ Request error:", error);
		return Promise.reject(error);
	}
);

// Add response interceptor for logging
api.interceptors.response.use(
	(response) => {
		console.log(
			`✅ Response received from ${response.config.url}:`,
			response.status
		);
		return response;
	},
	(error) => {
		console.error(
			"❌ Response error:",
			error.response?.status,
			error.response?.data || error.message
		);
		return Promise.reject(error);
	}
);

// Health check
export const checkHealth = async () => {
	const response = await api.get("/health");
	return response.data;
};

// Questions API
export const createQuestion = async (data) => {
	const response = await api.post("/questions", data);
	return response.data;
};

export const getQuestions = async () => {
	const response = await api.get("/questions");
	return response.data;
};

export const getQuestion = async (id) => {
	const response = await api.get(`/questions/${id}`);
	return response.data;
};

export const updateQuestion = async (id, data) => {
	const response = await api.put(`/questions/${id}`, data);
	return response.data;
};

export const deleteQuestion = async (id) => {
	await api.delete(`/questions/${id}`);
};

// Tests API
export const createTest = async (data) => {
	const response = await api.post("/tests", data);
	return response.data;
};

export const getTests = async () => {
	const response = await api.get("/tests");
	return response.data;
};

export const getTest = async (id) => {
	const response = await api.get(`/tests/${id}`);
	return response.data;
};

export const updateTest = async (id, data) => {
	const response = await api.put(`/tests/${id}`, data);
	return response.data;
};

export const deleteTest = async (id) => {
	await api.delete(`/tests/${id}`);
};

export const submitTest = async (id, data) => {
	const response = await api.post(`/tests/${id}/submit`, data);
	return response.data;
};

// Users API
export const createUser = async (data) => {
	const response = await api.post("/users", data);
	return response.data;
};

export const getUsers = async () => {
	const response = await api.get("/users");
	return response.data;
};

export const getUser = async (id) => {
	const response = await api.get(`/users/${id}`);
	return response.data;
};

export const updateUser = async (id, data) => {
	const response = await api.put(`/users/${id}`, data);
	return response.data;
};

export const deleteUser = async (id) => {
	await api.delete(`/users/${id}`);
};

// Challenges API
export const createChallenge = async (data) => {
	const response = await api.post("/challenges", data);
	return response.data;
};

export const getChallenges = async (params) => {
	const response = await api.get("/challenges", { params });
	return response.data;
};

export const getChallenge = async (id) => {
	const response = await api.get(`/challenges/${id}`);
	return response.data;
};

export const updateChallenge = async (id, data) => {
	const response = await api.put(`/challenges/${id}`, data);
	return response.data;
};

export const deleteChallenge = async (id) => {
	await api.delete(`/challenges/${id}`);
};

export const submitChallengeAttempt = async (id, data) => {
	const response = await api.post(`/challenges/${id}/submit`, data);
	return response.data;
};

export const getChallengeAttempts = async (id) => {
	const response = await api.get(`/challenges/${id}/attempts`);
	return response.data;
};

export const getUserChallengeAttempts = async (userId) => {
	const response = await api.get(`/challenges/user/${userId}/attempts`);
	return response.data;
};
