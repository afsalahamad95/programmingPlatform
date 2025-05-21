import axios, { AxiosError } from 'axios';
import { Student } from '../types/student';
import { initialStudentData } from './mockData';

const API_URL = 'http://localhost:3000/api';
const RETRY_DELAY = 2000;
const MAX_RETRIES = 3;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async (error: AxiosError, retryCount: number = 0): Promise<any> => {
  const shouldRetry = retryCount < MAX_RETRIES && 
    (!error.response || error.response.status >= 500);

  if (shouldRetry) {
    await sleep(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
    try {
      return await api.request(error.config!);
    } catch (retryError) {
      return retryRequest(retryError as AxiosError, retryCount + 1);
    }
  }
  throw error;
};

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response) {
      const responseData = error.response.data as { 
        error?: { message?: string };
        message?: string;
      };
      const message = responseData.error?.message || 
                     responseData.message || 
                     'Server error occurred';
      throw new Error(message);
    } else if (error.request) {
      try {
        return await retryRequest(error);
      } catch (retryError) {
        throw new Error('Unable to connect to server. Please check your connection and try again.');
      }
    }
    throw new Error('An unexpected error occurred');
  }
);

const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 5000
    });
    return response.data.status === 'ok' && response.data.database === 'connected';
  } catch {
    return false;
  }
};

export const studentApi = {
  getStudent: async (id: string): Promise<Student> => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      // If the server is not responding, return mock data during development
      console.warn('Server is not responding, using mock data');
      return initialStudentData;
    }
    
    try {
      const response = await api.get<Student>(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch student data, using mock data');
      return initialStudentData; // Fallback to mock data
    }
  },

  updateStudent: async (id: string, updates: Partial<Student>): Promise<Student> => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      throw new Error('Server is not responding. Please try again later.');
    }
    
    try {
      const response = await api.put<Student>(`/students/${id}`, updates);
      return response.data;
    } catch (error) {
      console.warn('Failed to update student, using mock data');
      // For development: merge updates with mock data and return
      return { 
        ...initialStudentData,
        ...updates
      };
    }
  },

  deleteStudent: async (id: string): Promise<void> => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      throw new Error('Server is not responding. Please try again later.');
    }
    
    try {
      await api.delete(`/students/${id}`);
    } catch (error) {
      console.warn('Failed to delete student, operation simulated in development mode');
      // In development, we just log and don't throw
    }
  },

  createStudent: async (studentData: Omit<Student, 'id'>): Promise<Student> => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      throw new Error('Server is not responding. Please try again later.');
    }
    
    try {
      const response = await api.post<Student>('/students', studentData);
      return response.data;
    } catch (error) {
      console.warn('Failed to create student, using mock data');
      // For development, return mock data with a random ID
      return {
        ...initialStudentData,
        ...studentData,
        id: Date.now().toString()
      } as Student;
    }
  },
};