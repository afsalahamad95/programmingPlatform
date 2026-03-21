import axios from 'axios';

const AI_API_URL = '/llm';

export interface CareerResponse {
  markdown_content: string;
}

export const generateResume = async (studentId: string): Promise<string> => {
  const response = await axios.post<CareerResponse>(`${AI_API_URL}/resume`, { student_id: studentId });
  return response.data.markdown_content;
};

export const generateRoadmap = async (studentId: string, targetRole: string): Promise<string> => {
  const response = await axios.post<CareerResponse>(`${AI_API_URL}/roadmap`, { student_id: studentId, target_role: targetRole });
  return response.data.markdown_content;
};
