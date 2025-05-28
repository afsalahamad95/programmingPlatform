import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 seconds timeout
});

// Add request interceptor for logging and auth
api.interceptors.request.use(
  (config) => {
    // Add auth token to requests if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🚀 Making ${config.method?.toUpperCase()} request to ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response received from ${response.config.url}:`, response.status, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('❌ Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('❌ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Questions API
export const createQuestion = async (data: any) => {
  const response = await api.post('/questions', data);
  return response.data;
};

export const getQuestions = async () => {
  const response = await api.get('/questions');
  return response.data;
};

export const getQuestion = async (id: string) => {
  const response = await api.get(`/questions/${id}`);
  return response.data;
};

export const updateQuestion = async (id: string, data: any) => {
  const response = await api.put(`/questions/${id}`, data);
  return response.data;
};

export const deleteQuestion = async (id: string) => {
  await api.delete(`/questions/${id}`);
};

// Tests API
export const createTest = async (data: any) => {
  const response = await api.post('/tests', data);
  return response.data;
};

export const getTests = async () => {
  try {
    const response = await api.get('/tests');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []; // Return empty array if no tests found or all expired
    }
    throw error;
  }
};

export const getTest = async (id: string) => {
  try {
    const response = await api.get(`/tests/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Test not found or has expired');
    }
    throw error;
  }
};

export const updateTest = async (id: string, data: any) => {
  const response = await api.put(`/tests/${id}`, data);
  return response.data;
};

export const deleteTest = async (id: string) => {
  await api.delete(`/tests/${id}`);
};

export const submitTest = async (testId: string, submission: {
  testId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  institution: string;
  department: string;
  answers: { questionId: string; answer: string }[];
}) => {
  try {
    // Validate required fields
    if (!submission.studentId || !submission.studentName || !submission.studentEmail) {
      // This validation is primarily for client-side feedback
      throw new Error('Missing required user information in submission payload');
    }

    if (!submission.answers || submission.answers.length === 0) {
      throw new Error('No answers provided in submission payload');
    }

    console.log('Submitting test with payload:', submission);
    const response = await api.post(`/tests/${testId}/submit`, submission);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('Submission API error response:', error.response.data);
      if (error.response.status === 404) {
        throw new Error('Cannot submit: Test not found or has expired');
      }
      if (error.response.status === 400) {
        // Use the specific error message from the backend if available
        throw new Error(`Submission failed: ${error.response.data.error || 'Invalid submission data'}`);
      }
    }
    console.error('Submission API general error:', error);
    throw new Error(`Submission failed: ${error.message || 'An unknown error occurred during submission.'}`);
  }
};

// New function to get a single test attempt by ID
export const getTestAttempt = async (attemptId: string) => {
  console.log('Fetching test attempt with ID:', attemptId);
  try {
    const response = await api.get(`/tests/attempts/${attemptId}`);
    console.log('Test attempt response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching test attempt:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// Users API
export const createUser = async (userData: any) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, userData: any) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};

// Challenges API
export const createChallenge = async (data: any) => {
  const response = await api.post('/challenges', data);
  return response.data;
};

export const getChallenges = async (params?: { difficulty?: string; category?: string }) => {
  const response = await api.get('/challenges', { params });
  return response.data;
};

export const getChallenge = async (id: string) => {
  const response = await api.get(`/challenges/${id}`);
  return response.data;
};

export const updateChallenge = async (id: string, data: any) => {
  const response = await api.put(`/challenges/${id}`, data);
  return response.data;
};

export const deleteChallenge = async (id: string) => {
  await api.delete(`/challenges/${id}`);
};

export const submitChallengeAttempt = async (id: string, data: any) => {
  const response = await api.post(`/challenges/${id}/submit`, data);
  return response.data;
};

export const getChallengeAttempts = async (id: string) => {
  const response = await api.get(`/challenges/${id}/attempts`);
  return response.data;
};

export const getUserChallengeAttempts = async (userId: string) => {
  const response = await api.get(`/challenges/user/${userId}/attempts`);
  return response.data;
};

// Auth API functions
export const login = async (credentials: { email: string; password: string }) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout', {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};