export type QuestionType = 'mcq' | 'subjective' | 'coding';

export interface TestCase {
  input: string;
  output: string;
  hidden: boolean;
}

// Type for a TestCase, similar to the Go struct
export interface TestCase {
  input: string;
  output: string;
  hidden: boolean;
}

// Updated Question interface to match the Go struct
export interface Question {
  id: string;
  type: QuestionType;
  subject: string;
  content: string;
  points: number;
  createdAt: string; // ISO 8601 string format
  options?: string[];
  starterCode?: string;
  testCases?: TestCase[];
}


export interface MCQQuestion extends Question {
  type: 'mcq';
  options: string[];
  correctOption: number;
}

export interface SubjectiveQuestion extends Question {
  type: 'subjective';
  expectedWordCount?: number;
  modelAnswer?: string;
}

export interface CodingQuestion extends Question {
  type: 'coding';
  starterCode?: string;
  testCases: TestCase[];
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  department: string;
}

export interface MCQresult {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  points: number;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  questions: Question[];
  totalPoints: number;
  status: 'scheduled' | 'in-progress' | 'completed';
  allowedStudents: Student[];
}

export interface ChallengeTestCase {
  input: string;
  expectedOutput: string;
  description: string;
  hidden: boolean;
}

export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  timeLimit: number;
  starterCode: string;
  language: string;
  testCases: ChallengeTestCase[];
  memoryLimitMB: number;
  timeoutSec: number;
  createdAt: string;
}