import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getTest, submitTest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Test, Question, MCQQuestion, SubjectiveQuestion, CodingQuestion, BaseQuestion } from '../types';
import MCQQuestionComponent from './questions/MCQQuestion';
import SubjectiveQuestionComponent from './questions/SubjectiveQuestion';
import CodingQuestionComponent from './questions/CodingQuestion';

// Type predicates
const isMCQQuestion = (question: Question): question is MCQQuestion => question.type === 'mcq';
const isSubjectiveQuestion = (question: Question): question is SubjectiveQuestion => question.type === 'subjective';
const isCodingQuestion = (question: Question): question is CodingQuestion => question.type === 'coding';

const TestAttempt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: test, isLoading } = useQuery<Test>(
    ['test', id],
    () => getTest(id!),
    {
      enabled: !!id,
    }
  );

  const submitTestMutation = useMutation(
    (data: { testId: string; answers: Record<string, string> }) =>
      submitTest(data.testId, {
        testId: data.testId,
        studentId: user?.id,
        answers: data.answers,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tests');
        queryClient.invalidateQueries('testResults');
        navigate('/');
      },
      onError: (error) => {
        console.error('Failed to submit test:', error);
      },
    }
  );

  if (isLoading || !test) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('Test data received:', test);

  const currentQuestion = test.questions[currentQuestionIndex];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowConfirmation(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    submitTestMutation.mutate({
      testId: test.id,
      answers,
    });
  };

  const renderQuestion = (question: Question) => {
    if (!question) return null;

    console.log('Attempting to render question:', question);

    // Use dedicated question components for better separation of concerns
    switch (question.type) {
      case 'mcq':
        console.log('Attempting to render MCQ question');
        if (isMCQQuestion(question)) {
          console.log('MCQ type guard passed');
          // Additional check for expected properties
          if (!question.options || question.options.length === 0) {
            console.error('Error: MCQ question is missing options.', question);
            return <p>Error: MCQ question is missing options.</p>;
          }

          // Handle both index-based and string-based answers for backwards compatibility
          let answerIndex: number | undefined;
          const storedAnswer = answers[question.id];
          if (storedAnswer !== undefined) {
            // Try parsing as index first
            const parsedIndex = parseInt(storedAnswer);
            if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < question.options.length) {
              answerIndex = parsedIndex;
            } else {
              // If not a valid index, find the index of the option string
              answerIndex = question.options.findIndex(option => option === storedAnswer);
              if (answerIndex === -1) {
                answerIndex = undefined;
              }
            }
          }

          return (
            <MCQQuestionComponent
              question={question}
              answer={answerIndex}
              onChange={(value: number) => handleAnswerChange(question.id, value.toString())}
            />
          );
        } else {
          console.error('Type guard failed for MCQ question:', question);
          return <p>Error: MCQ question type string matched, but type guard failed.</p>;
        }

      case 'subjective':
        console.log('Attempting to render Subjective question');
        if (isSubjectiveQuestion(question)) {
          console.log('Subjective type guard passed');
          // Additional check for expected properties (subjective questions currently have no required unique properties beyond BaseQuestion)
          // If maxLength was strictly required, we would add a check here.
          // if (question.maxLength === undefined) {
          //    console.error('Error: Subjective question is missing maxLength.', question);
          //    return <p>Error: Subjective question is missing maxLength.</p>;
          // }
          return (
            <SubjectiveQuestionComponent
              question={question}
              answer={answers[question.id] || ''}
              onChange={(value: string) => handleAnswerChange(question.id, value)}
            />
          );
        } else {
          console.error('Type guard failed for Subjective question:', question);
          return <p>Error: Subjective question type string matched, but type guard failed.</p>;
        }

      case 'coding':
        console.log('Attempting to render Coding question');
        if (isCodingQuestion(question)) {
          console.log('Coding type guard passed');
          // Additional check for expected properties
          if (!question.starterCode) {
            console.error('Error: Coding question is missing starter code.', question);
            return <p>Error: Coding question is missing starter code.</p>;
          }
          if (!question.testCases || question.testCases.length === 0) {
            console.error('Error: Coding question is missing test cases.', question);
            return <p>Error: Coding question is missing test cases.</p>;
          }
          return (
            <CodingQuestionComponent
              question={question}
              answer={answers[question.id] || question.starterCode}
              onChange={(value: string) => handleAnswerChange(question.id, value)}
            />
          );
        } else {
          console.error('Type guard failed for Coding question:', question);
          return <p>Error: Coding question type string matched, but type guard failed.</p>;
        }

      default:
        // This case handles types not covered by the specific cases
        console.error('Unsupported question type received:', question);
        // We are casting to any here just to safely access the type for the error message
        return <p>Unsupported question type received: {(question as any).type}</p>;
    }

    // This fallback should ideally not be reached if the default case handles all unknown types
    // and the type guard failure cases within the switch return explicitly.
    console.error('Reached final fallback in renderQuestion. This should not happen with current logic.', question);
    return <p>Error: Unexpected error in renderQuestion.</p>;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Question {currentQuestionIndex + 1} of {test.questions.length}
            </h3>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Exit Test
            </button>
          </div>
          <div className="mt-4">
            {/* Render the current question */}
            {(() => {
              try {
                return renderQuestion(currentQuestion);
              } catch (error) {
                console.error('Error rendering question component:', error, currentQuestion);
                return <p>Error rendering question: An unexpected error occurred.</p>;
              }
            })()}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {currentQuestionIndex === test.questions.length - 1
                ? 'Review'
                : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium text-gray-900">
                  Submit Test
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to submit your test? You cannot change your answers after submission.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleSubmit}
              >
                Submit
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAttempt;