import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getTestAttempt, getTest } from '../api';
import { TestSubmission, Test, Question, MCQQuestion, CodingQuestion, Answer } from '../types';

// Type predicates (can be imported if already defined elsewhere)
const isMCQQuestion = (question: Question): question is MCQQuestion => question.type === 'mcq';
const isCodingQuestion = (question: Question): question is CodingQuestion => question.type === 'coding';

const TestResult: React.FC = () => {
	const { attemptId } = useParams<{ attemptId: string }>();

	const { data: submission, isLoading: isLoadingSubmission, error: submissionError } = useQuery<TestSubmission>(
		['testAttempt', attemptId],
		() => getTestAttempt(attemptId!),
		{
			enabled: !!attemptId,
		}
	);

	const { data: test, isLoading: isLoadingTest, error: testError } = useQuery<Test>(
		['test', submission?.testId], // Fetch test details once submission is loaded
		() => getTest(submission!.testId),
		{
			enabled: !!submission?.testId,
		}
	);

	if (isLoadingSubmission || isLoadingTest) {
		return <div className="text-center">Loading results...</div>;
	}

	if (submissionError) {
		return <div className="text-center text-red-500">Error loading submission: {(submissionError as Error).message || 'An unknown error occurred.'}</div>;
	}

	if (testError) {
		return <div className="text-center text-red-500">Error loading test details: {(testError as Error).message || 'An unknown error occurred.'}</div>;
	}

	if (!submission || !test) {
		return <div className="text-center">Test attempt or test details not found.</div>;
	}

	// Function to find a question by its ID
	const findQuestionById = (questionId: string) => {
		return test.questions.find(q => q.id === questionId);
	};

	// Function to render the answer and result for each question type
	const renderQuestionResult = (answer: Answer) => {
		const question = findQuestionById(answer.questionId);
		if (!question) {
			return <p>Question not found.</p>;
		}

		let resultDetails = <p>Answer: {answer.answerText}</p>;
		let isCorrect = false; // Default to false, update based on question type

		switch (question.type) {
			case 'mcq':
				if (isMCQQuestion(question)) {
					// Compare submitted answer string with the correct answer string
					isCorrect = answer.answerText === question.correctAnswer;
					resultDetails = (
						<div>
							<p>Your Answer: {answer.answerText}</p>
							<p>Correct Answer: {question.correctAnswer}</p>
						</div>
					);
				}
				break;
			case 'coding':
				if (isCodingQuestion(question)) {
					// For coding questions, we might need more detailed results (test case by test case)
					// This would require the backend to provide that info in the submission, or re-running tests.
					// For now, just display the submitted code.
					resultDetails = (
						<div>
							<p>Your Submitted Code:</p>
							<pre className="bg-gray-100 p-2 rounded">{answer.answerText}</pre>
							{/* Add logic here to display test case results if available in submission */}
						</div>
					);
					// Determining correctness for coding questions requires backend evaluation, not just comparing submitted code.
					// Assuming correctness is not determined client-side without detailed test results.
					isCorrect = false; // Cannot determine correctness client-side from this data structure
				}
				break;
			case 'subjective':
				// For subjective questions, correctness/scoring is manual.
				resultDetails = (
					<div>
						<p>Your Answer:</p>
						<pre className="bg-gray-100 p-2 rounded">{answer.answerText}</pre>
						{/* Manual grading needed */}
					</div>
				);
				isCorrect = false; // Cannot determine correctness client-side
				break;
			default:
				resultDetails = <p>Unsupported question type for results display.</p>;
				isCorrect = false;
		}

		return (
			<div key={question.id} className={`border p-4 rounded mb-4 ${isCorrect ? 'border-green-500' : question.type === 'mcq' ? 'border-red-500' : 'border-gray-300'}`}>
				<h4 className="font-semibold">Question: {question.content}</h4>
				{resultDetails}
				{question.type === 'mcq' && (
					<p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>Status: {isCorrect ? 'Correct' : 'Incorrect'}</p>
				)}
				{/* Add scoring display here if points are available and calculated */}
			</div>
		);
	};

	return (
		<div className="max-w-3xl mx-auto py-8">
			<h2 className="text-2xl font-bold mb-6">Test Results</h2>
			<p className="mb-4">Test: {test.title}</p>
			<p className="mb-4">Submitted At: {(submission.submittedAt as Date).toLocaleString()}</p>

			<div className="space-y-4">
				{submission.answers.map(renderQuestionResult)}
			</div>

			{/* Add overall score calculation and display here if applicable */}
		</div>
	);
};

export default TestResult; 