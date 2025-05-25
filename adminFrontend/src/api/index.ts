import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:3000/api";

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 10000,
});

// Error handling interceptor
api.interceptors.response.use(
	(response) => response,
	(error: AxiosError<{ error?: string }>) => {
		const message =
			error.response?.data?.error || error.message || "An error occurred";
		toast.error(message);
		return Promise.reject(error);
	}
);

// Health check
export const checkHealth = async () => {
	try {
		const response = await api.get("/health");
		return response.data;
	} catch (error) {
		console.error("Health check failed:", error);
		throw error;
	}
};

// Questions API
export const createQuestion = async (data: any) => {
	try {
		const response = await api.post("/questions", data);
		toast.success("Question created successfully");
		return response.data;
	} catch (error) {
		console.error("Failed to create question:", error);
		throw error;
	}
};

export const getQuestions = async () => {
	try {
		const response = await api.get("/questions");
		return response.data;
	} catch (error) {
		console.error("Failed to fetch questions:", error);
		throw error;
	}
};

// Tests API
export const createTest = async (data: any) => {
	try {
		const response = await api.post("/tests", {
			...data,
			questions: data.questions.map((q: any) => q.id),
			allowedStudents: data.allowedStudents.map((s: any) => s.id),
		});
		toast.success("Test scheduled successfully");
		return response.data;
	} catch (error) {
		console.error("Failed to create test:", error);
		throw error;
	}
};

export const getTests = async () => {
	try {
		const response = await api.get("/tests");
		return response.data;
	} catch (error) {
		console.error("Failed to fetch tests:", error);
		throw error;
	}
};

export const submitTest = async (id: string, answers: any) => {
	try {
		const response = await api.post(`/tests/${id}/submit`, { answers });
		toast.success("Test submitted successfully");
		return response.data;
	} catch (error) {
		console.error("Failed to submit test:", error);
		throw error;
	}
};

// Challenges API
export const createChallenge = async (data: any) => {
	try {
		const response = await api.post("/challenges", data);
		toast.success("Challenge created successfully");
		return response.data;
	} catch (error) {
		console.error("Failed to create challenge:", error);
		throw error;
	}
};

export const getChallenges = async (params?: {
	difficulty?: string;
	category?: string;
}) => {
	try {
		const response = await api.get("/challenges", { params });
		return response.data;
	} catch (error) {
		console.error("Failed to fetch challenges:", error);
		toast.error("Failed to load challenges. Using empty data.");
		return [];
	}
};

export const getChallenge = async (id: string) => {
	try {
		const response = await api.get(`/challenges/${id}`);
		return response.data;
	} catch (error) {
		console.error(`Failed to fetch challenge with id ${id}:`, error);
		toast.error("Failed to load challenge details");
		// Return a default empty challenge object
		return null;
	}
};

export const updateChallenge = async (id: string, data: any) => {
	try {
		const response = await api.put(`/challenges/${id}`, data);
		toast.success("Challenge updated successfully");
		return response.data;
	} catch (error) {
		console.error(`Failed to update challenge with id ${id}:`, error);
		throw error;
	}
};

export const deleteChallenge = async (id: string) => {
	try {
		await api.delete(`/challenges/${id}`);
		toast.success("Challenge deleted successfully");
	} catch (error) {
		console.error(`Failed to delete challenge with id ${id}:`, error);
		throw error;
	}
};
