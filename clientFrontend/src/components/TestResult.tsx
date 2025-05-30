import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { getTestAttempt, getTest } from "../api";
import {
	TestSubmission,
	Test,
	Question,
	MCQQuestion,
	CodingQuestion,
	Answer,
} from "../types";

// Type predicates
const isMCQQuestion = (question: Question): question is MCQQuestion =>
	question.type === "mcq";
const isCodingQuestion = (question: Question): question is CodingQuestion =>
	question.type === "coding";

const TestResult: React.FC = () => {
	const { attemptId } = useParams<{ attemptId: string }>();

	const {
		data: submission,
		isLoading: isLoadingSubmission,
		error: submissionError,
	} = useQuery<TestSubmission>(
		["testAttempt", attemptId],
		() => getTestAttempt(attemptId!),
		{
			enabled: !!attemptId,
		}
	);

	const {
		data: test,
		isLoading: isLoadingTest,
		error: testError,
	} = useQuery<Test>(
		["test", submission?.testId],
		() => getTest(submission!.testId),
		{
			enabled: !!submission?.testId,
		}
	);

	if (isLoadingSubmission || isLoadingTest) {
		return <div className="text-center">Loading results...</div>;
	}

	if (submissionError) {
		return (
			<div className="text-center text-red-500">
				Error loading submission:{" "}
				{(submissionError as Error).message ||
					"An unknown error occurred."}
			</div>
		);
	}

	if (testError) {
		return (
			<div className="text-center text-red-500">
				Error loading test details:{" "}
				{(testError as Error).message || "An unknown error occurred."}
			</div>
		);
	}

	if (!submission || !test) {
		return (
			<div className="text-center">
				Test attempt or test details not found.
			</div>
		);
	}

	// Function to find a question by its ID
	const findQuestionById = (questionId: string) => {
		return test.questions.find((q) => q.id === questionId);
	};

	// Function to render the answer and result for each question type
	const renderQuestionResult = (answer: Answer) => {
		const question = findQuestionById(answer.questionId);
		if (!question) {
			return <p>Question not found.</p>;
		}

		console.log("Processing answer:", {
			questionId: answer.questionId,
			answer: answer.answer,
			questionType: question.type,
			questionContent: question.content,
		});

		let resultDetails = <p>Answer: {answer.answer}</p>;
		let isCorrect = false;

		switch (question.type) {
			case "mcq":
				if (isMCQQuestion(question)) {
					console.log("MCQ question details:", {
						options: question.options,
						correctOption: question.correctOption,
						selectedAnswer: answer.answer,
					});
					// Parse the answer as a number since we store it as an index
					const selectedIndex = parseInt(answer.answer);
					const correctIndex = question.correctOption;
					isCorrect = selectedIndex === correctIndex;

					console.log("MCQ result:", {
						selectedIndex,
						correctIndex,
						isCorrect,
					});

					resultDetails = (
						<div className="space-y-4">
							<div className="p-4 bg-gray-50 rounded-lg">
								<p className="font-medium">Your Answer:</p>
								<p className="text-gray-700">
									{question.options[selectedIndex]}
								</p>
							</div>
							<div className="p-4 bg-gray-50 rounded-lg">
								<p className="font-medium">Correct Answer:</p>
								<p className="text-gray-700">
									{question.options[correctIndex]}
								</p>
							</div>
						</div>
					);
				}
				break;
			case "coding":
				if (isCodingQuestion(question)) {
					resultDetails = (
						<div>
							<p>Your Submitted Code:</p>
							<pre className="bg-gray-100 p-2 rounded">
								{answer.answer}
							</pre>
						</div>
					);
					isCorrect = false; // Cannot determine correctness client-side
				}
				break;
			case "subjective":
				resultDetails = (
					<div>
						<p>Your Answer:</p>
						<pre className="bg-gray-100 p-2 rounded">
							{answer.answer}
						</pre>
					</div>
				);
				isCorrect = false; // Cannot determine correctness client-side
				break;
			default:
				resultDetails = (
					<p>Unsupported question type for results display.</p>
				);
				isCorrect = false;
		}

		return (
			<div
				key={question.id}
				className={`border p-4 rounded mb-4 ${
					isCorrect
						? "border-green-500 bg-green-50"
						: question.type === "mcq"
						? "border-red-500 bg-red-50"
						: "border-gray-300"
				}`}
			>
				<h4 className="font-semibold mb-2">
					Question: {question.content}
				</h4>
				{resultDetails}
				{question.type === "mcq" && (
					<div className="mt-4">
						<p
							className={`font-semibold ${
								isCorrect ? "text-green-700" : "text-red-700"
							}`}
						>
							{isCorrect ? "✓ Correct" : "✗ Incorrect"}
						</p>
						<p className="text-sm text-gray-600 mt-1">
							Points: {isCorrect ? question.points : 0} /{" "}
							{question.points}
						</p>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="max-w-3xl mx-auto py-8">
			<h2 className="text-2xl font-bold mb-6">Test Results</h2>
			<p className="mb-4">Test: {test.title}</p>
			<p className="mb-4">
				Submitted At:{" "}
				{new Date(submission.submittedAt).toLocaleString()}
			</p>

			<div className="space-y-4">
				{submission.answers.map(renderQuestionResult)}
			</div>

			{/* Calculate and display total score */}
			<div className="mt-8 p-4 bg-gray-50 rounded-lg">
				<h3 className="text-lg font-semibold mb-2">Total Score</h3>
				<p className="text-2xl font-bold">
					{submission.answers.reduce((total, answer) => {
						const question = findQuestionById(answer.questionId);
						console.log("Question:", question);
						if (
							question?.type === "mcq" &&
							isMCQQuestion(question)
						) {
							const selectedIndex = parseInt(answer.answer);
							const isCorrect =
								selectedIndex === question.correctOption;
							return total + (isCorrect ? question.points : 0);
						}
						console.log("Total returned:", total);
						return total;
					}, 0)}{" "}
					/ {test.questions.reduce((total, q) => total + q.points, 0)}{" "}
					points
				</p>
			</div>
		</div>
	);
};

export default TestResult;
