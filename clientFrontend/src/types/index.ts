export type QuestionType = "mcq" | "subjective" | "coding";

export interface TestCase {
	input: string;
	output: string;
	hidden?: boolean;
	description?: string;
}

export interface Question {
	id: string;
	type: QuestionType;
	subject: string;
	content: string;
	points: number;
	createdAt: Date;
}

export interface MCQQuestion extends Question {
	type: "mcq";
	options: string[];
	correctOption: number;
}

export interface SubjectiveQuestion extends Question {
	type: "subjective";
	expectedWordCount?: number;
	modelAnswer?: string;
}

export interface CodingQuestion extends Question {
	type: "coding";
	starterCode?: string;
	testCases: TestCase[];
}

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
	startTime: Date;
	endTime: Date;
	duration: number;
	questions: string[];
	allowedStudents: string[];
}

export interface TestSubmission {
	id?: string;
	testId: string;
	studentId: string;
	submittedAt: Date;
	answers: Answer[];
}

export interface Answer {
	questionId: string;
	answerText: string;
}
