export type QuestionType = "mcq" | "subjective" | "coding";

export interface TestCase {
	input: string;
	output: string;
	hidden?: boolean;
	description?: string;
}

export interface BaseQuestion {
	id: string;
	text: string;
	type: QuestionType;
	points: number;
}

export interface MCQQuestion extends BaseQuestion {
	type: "mcq";
	options: string[];
	correctAnswer: string;
}

export interface SubjectiveQuestion extends BaseQuestion {
	type: "subjective";
	maxLength: number;
}

export interface CodingQuestion extends BaseQuestion {
	type: "coding";
	initialCode: string;
	testCases: TestCase[];
}

export type Question = MCQQuestion | SubjectiveQuestion | CodingQuestion;

export interface Student {
	id: string;
	fullName: string;
	email: string;
	department: string;
}

export interface Test {
	id: string;
	title: string;
	description: string;
	questions: Question[];
	startTime: Date;
	endTime: Date;
	duration: number; // in minutes
}

export interface TestSubmission {
	id: string;
	testId: string;
	studentId: string;
	submittedAt: Date;
	answers: Record<string, string>;
}

export interface Answer {
	questionId: string;
	answerText: string;
}
