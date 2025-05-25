export type QuestionType = "mcq" | "subjective" | "coding";

export interface TestCase {
	description?: string;
	input: string;
	output: string;
	hidden: boolean;
}

interface BaseQuestion {
	id: string;
	type: QuestionType;
	content: string;
	points: number;
	subject: string;
}

export interface MCQQuestion extends BaseQuestion {
	type: "mcq";
	options: string[];
	correctOption: number;
}

export interface SubjectiveQuestion extends BaseQuestion {
	type: "subjective";
	expectedWordCount?: number;
	modelAnswer?: string;
}

export interface CodingQuestion extends BaseQuestion {
	type: "coding";
	starterCode?: string;
	testCases: TestCase[];
}

export type Question = MCQQuestion | SubjectiveQuestion | CodingQuestion;

export interface Test {
	id: string;
	title: string;
	description: string;
	startTime: Date;
	endTime: Date;
	duration: number;
	questions: Question[];
	allowedStudents: string[];
}

export interface TestResult {
	passed: boolean;
	input: string;
	expectedOutput: string;
	actualOutput: string;
	description: string;
	hidden: boolean;
	stderr?: string;
	similarityScore?: number;
	pointsAvailable?: number;
	pointsScored?: number;
}

export interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	createdAt: string;
}

export interface CodingChallenge {
	id: string;
	title: string;
	description: string;
	difficulty: "Easy" | "Medium" | "Hard";
	category: string;
	timeLimit: number;
	starterCode: string;
	language: string;
	testCases: ChallengeTestCase[];
	memoryLimitMB: number;
	timeoutSec: number;
	createdAt: string;
	endTime?: string;
}

export interface ChallengeTestCase {
	input: string;
	expectedOutput: string;
	description: string;
	hidden: boolean;
}

export interface ValidationResult {
	passed: boolean;
	testCases: TestResult[];
	totalTests: number;
	passedTests: number;
	failedTests: number;
	totalPoints?: number;
	scoredPoints?: number;
	percentageScore?: number;
}

export interface ChallengeAttempt {
	id: string;
	userId: string;
	challengeId: string;
	code: string;
	language: string;
	status: "Submitted" | "Passed" | "Failed";
	result: ValidationResult;
	timeSpent: number;
	createdAt: string;
}
