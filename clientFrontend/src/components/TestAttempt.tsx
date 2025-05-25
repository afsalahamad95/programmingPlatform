import React from 'react';
import { Timer, ChevronLeft, ChevronRight, Save, AlertTriangle } from 'lucide-react';
import { Test, Question, MCQQuestion, SubjectiveQuestion, CodingQuestion } from '../types';
import MCQQuestionComponent from './questions/MCQQuestion';
import SubjectiveQuestionComponent from './questions/SubjectiveQuestion';
import CodingQuestionComponent from './questions/CodingQuestion';
import QuestionNavigation from './QuestionNavigation';
import TestTimer from './TestTimer';
import TestHeader from './TestHeader';

interface TestAttemptProps {
  test: Test;
  onSubmit: (answers: Record<string, any>) => void;
}

export default function TestAttempt({ test, onSubmit }: TestAttemptProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [showConfirmSubmit, setShowConfirmSubmit] = React.useState(false);
  const [timeExpired, setTimeExpired] = React.useState(false);

  // Check if test has expired
  const now = new Date();
  if (now > test.endTime) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Expired</h2>
          <p className="text-gray-600 mb-4">
            This test has expired and can no longer be accessed.
          </p>
        </div>
      </div>
    );
  }

  // Check if test hasn't started yet
  if (now < test.startTime) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Not Started</h2>
          <p className="text-gray-600 mb-4">
            This test has not started yet. Please wait until the scheduled start time.
          </p>
        </div>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev: Record<string, any>) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const handleTimeExpired = () => {
    setTimeExpired(true);
    handleSubmit();
  };

  const currentQuestion = test.questions[currentQuestionIndex];

  const renderQuestion = (question: Question) => {
    const commonProps = {
      question,
      answer: answers[question.id],
      onChange: (value: any) => handleAnswerChange(question.id, value)
    };

    switch (question.type) {
      case 'mcq':
        return <MCQQuestionComponent {...commonProps} question={question as MCQQuestion} />;
      case 'subjective':
        return <SubjectiveQuestionComponent {...commonProps} question={question as SubjectiveQuestion} />;
      case 'coding':
        return <CodingQuestionComponent {...commonProps} question={question as CodingQuestion} />;
      default:
        return null;
    }
  };

  if (timeExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Time's Up!</h2>
          <p className="text-gray-600 mb-4">
            Your test has been automatically submitted as the allocated time has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TestHeader title={test.title} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Points: {currentQuestion.points}
                </p>
              </div>

              <TestTimer
                endTime={test.endTime}
                onTimeExpired={handleTimeExpired}
              />
            </div>

            {renderQuestion(currentQuestion)}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIndex((prev: number) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>

                <QuestionNavigation
                  questions={test.questions}
                  currentIndex={currentQuestionIndex}
                  answers={answers}
                  onQuestionSelect={setCurrentQuestionIndex}
                />

                {currentQuestionIndex === test.questions.length - 1 ? (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Submit Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev: number) => Math.min(test.questions.length - 1, prev + 1))}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Submission
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to submit your test? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}