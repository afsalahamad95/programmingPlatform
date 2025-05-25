import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getTest, submitTest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Test, Question, MCQQuestion, SubjectiveQuestion, CodingQuestion } from '../types';

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
    if (isMCQQuestion(question)) {
      return (
        <div>
          <p className="text-gray-700">{question.text}</p>
          <div className="mt-4 space-y-4">
            {question.options.map((option: string) => (
              <label
                key={option}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) =>
                    handleAnswerChange(question.id, e.target.value)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (isSubjectiveQuestion(question)) {
      return (
        <div>
          <p className="text-gray-700">{question.text}</p>
          <div className="mt-4">
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              maxLength={question.maxLength}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum {question.maxLength} characters
            </p>
          </div>
        </div>
      );
    }

    if (isCodingQuestion(question)) {
      return (
        <div>
          <p className="text-gray-700">{question.text}</p>
          <div className="mt-4">
            <textarea
              value={answers[question.id] || question.initialCode}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="mt-1 block w-full font-mono border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={10}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">
            Question {currentQuestionIndex + 1} of {test.questions.length}
          </h3>
          <div className="mt-4">
            {renderQuestion(currentQuestion)}
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
                    Are you sure you want to submit your test? You cannot change
                    your answers after submission.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
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