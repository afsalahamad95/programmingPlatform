import React, { useEffect, useState } from 'react';
import { Timer, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import {
  Test,
  Question,
  MCQQuestion,
  SubjectiveQuestion,
  CodingQuestion,
} from '../types';
import type { MCQresult } from '../types';
import MCQResultComponent from './MCQResult';
import MCQQuestionComponent from './MCQQuestionComponent';
import SubjectiveQuestionComponent from './SubjectiveQuestionComponent';
import CodingQuestionComponent from './CodingQuestionComponent';

interface TestAttemptProps {
  test: Test;
  onSubmit: (answers: Record<string, any>) => void;
  onExit: () => void;
}

const QuestionRenderer: React.FC<{
  question: Question;
  selectedAnswer: any;
  onAnswerChange: (questionId: string, value: any) => void;
}> = ({ question, selectedAnswer, onAnswerChange }) => {
  switch (question.type) {
    case 'mcq':
      return (
        <MCQQuestionComponent
          question={question as MCQQuestion}
          selectedAnswer={selectedAnswer}
          onAnswerChange={(value) => onAnswerChange(question.id, value)}
        />
      );
    case 'subjective':
      return (
        <SubjectiveQuestionComponent
          question={question as SubjectiveQuestion}
          answer={selectedAnswer || ''}
          onAnswerChange={(value) => onAnswerChange(question.id, value)}
        />
      );
    case 'coding':
      return (
        <CodingQuestionComponent
          question={question as CodingQuestion}
          code={selectedAnswer || ''}
          onAnswerChange={(value) => onAnswerChange(question.id, value)}
        />
      );
    default:
      return (
        <div className="p-4 text-red-500">
          Unsupported question type: {question.type}
        </div>
      );
  }
};

export default function TestAttempt({ test, onSubmit, onExit }: TestAttemptProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(test.duration * 60);
  const [results, setResults] = useState<MCQresult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const calculateMCQResults = () => {
    return test.questions
      .filter((q): q is MCQQuestion => q.type === 'mcq')
      .map((question) => {
        const selectedOption = answers[question.id] as number;
        const isCorrect = selectedOption === question.correctOption;
        return {
          questionId: question.id,
          selectedOption,
          isCorrect,
          points: isCorrect ? question.points : 0,
        };
      });
  };

  const handleSubmit = () => {
    const mcqResults = calculateMCQResults();
    setResults(mcqResults);
    setShowResults(true);
    onSubmit(answers);
  };

  if (showResults) {
    const mcqQuestions = test.questions.filter(
      (q): q is MCQQuestion => q.type === 'mcq'
    );
    const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
    const maxPoints = mcqQuestions.reduce((sum, q) => sum + q.points, 0);

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Results</h2>
          <div className="mb-8 p-4 bg-indigo-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium text-gray-900">Total Score</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {totalPoints} / {maxPoints}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium text-gray-900">Percentage</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {Math.round((totalPoints / maxPoints) * 100)}%
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {mcqQuestions.map((question) => {
              const result = results.find((r) => r.questionId === question.id);
              if (!result) return null;

              return (
                <MCQResultComponent
                  key={question.id}
                  question={question}
                  result={result}
                />
              );
            })}
          </div>

          <button
            onClick={onExit}
            className="mt-8 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="p-4">No questions available</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Timer className="w-5 h-5" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Submit Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Points: {currentQuestion.points}
                  </span>
                </div>
              </div>

              <QuestionRenderer
                question={currentQuestion}
                selectedAnswer={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
              />

              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>

                <div className="flex gap-2">
                  {test.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 rounded-full ${
                        index === currentQuestionIndex
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-300 text-gray-800'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(test.questions.length - 1, prev + 1)
                    )
                  }
                  disabled={currentQuestionIndex === test.questions.length - 1}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
