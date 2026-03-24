export type QuestionType = "mcq" | "subjective" | "coding";

export interface TestCase {
	input: string;
	output: string;
	hidden?: boolean;
	description?: string;
}

export interface BaseQuestion {
	id: string;
	content: string;
	type: QuestionType;
	points: number;
	subject: string;
	createdAt?: string;
}

export interface MCQQuestion extends BaseQuestion {
	type: "mcq";
	options: string[];
	correctOption: number;
	points: number;
}

export interface SubjectiveQuestion extends BaseQuestion {
	type: "subjective";
	maxLength: number;
	expectedWordCount?: number;
}

export interface CodingQuestion extends BaseQuestion {
	type: "coding";
	starterCode: string;
	testCases: TestCase[];
}

export type Question = MCQQuestion | SubjectiveQuestion | CodingQuestion;

export interface Student {
	id: string;
	fullName: string;
	email: string;
	department?: string;
	targetRole: string;
	preferences: string[];
}

export interface Test {
	id: string;
	title: string;
	description: string;
	startTime: Date;
	endTime: Date;
	duration: number;
	questions: Question[];
	allowedStudents: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface TestSubmission {
	id: string;
	testId: string;
	studentId: string;
	submittedAt: Date;
	answers: Answer[];
}

export interface Answer {
	questionId: string;
	answer: string;
}

export interface User {
	id: string;
	email: string;
	fullName: string;
	institution: string;
	department: string;
	studentId: string;
	role: "student" | "admin";
	createdAt: Date;
	updatedAt: Date;
}

export interface Challenge {
	id: string;
	title: string;
	description: string;
	difficulty: "easy" | "medium" | "hard";
	category: string;
	points: number;
	starterCode?: string;
	language?: string;
	timeLimit?: number;
	testCases?: TestCase[];
	endTime?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface ValidationResult {
	passed: boolean;
	passedTests: number;
	totalTests: number;
	percentageScore: number;
	scoredPoints: number;
	totalPoints: number;
	feedback?: string;
	error?: string;
	testCases?: any[];
}
