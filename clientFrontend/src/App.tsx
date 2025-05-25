import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TestAttempt from './components/TestAttempt';
import TestList from './components/TestList';
import ChallengesPage from './components/ChallengesPage';
import ChallengeAttempt from './components/ChallengeAttempt';
import { useQuery } from 'react-query';
import { getTests, getQuestions } from './api';
import { Question, Test } from './types';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import AppContent from './components/AppContent';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function TestApp() {
  const [selectedTest, setSelectedTest] = React.useState<Test | null>(null);

  const { data: tests, isLoading: isLoadingTests, error: testsError } = useQuery('tests', getTests);
  const { data: questions, isLoading: isLoadingQuestions } = useQuery('questions', getQuestions);

  const handleSubmit = async (answers: Record<string, any>) => {
    if (selectedTest) {
      try {
        // Submit test answers
        console.log('Submitting answers:', answers);
        setSelectedTest(null); // Return to test list after submission
      } catch (error) {
        console.error('Error submitting test:', error);
      }
    }
  };

  if (isLoadingTests || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (testsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading tests</p>
          <p className="text-sm mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  if (selectedTest && questions) {
    const enhancedTest = {
      ...selectedTest,
      questions: Array.isArray(selectedTest.questions)
        ? selectedTest.questions
          .map(q =>
            typeof q === 'string'
              ? questions.find((question: Question) => question.id === q)
              : q // If already a Question object, just return it
          )
          .filter((q): q is Question => !!q)
        : []
    };

    // If no valid questions, show a message instead of TestAttempt
    if (enhancedTest.questions.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center text-red-600">
            <p className="text-lg font-semibold">No valid questions found for this test.</p>
          </div>
        </div>
      );
    }

    return <TestAttempt test={enhancedTest} onSubmit={handleSubmit} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TestList
          tests={tests || []}
          onViewTest={setSelectedTest}
          onBack={() => setSelectedTest(null)}
        />
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">Programming Platform</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Tests
                </Link>
                <Link
                  to="/challenges"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Challenges
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-8">
        <Routes>
          <Route path="/" element={<TestApp />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/challenges/:id" element={<ChallengeAttempt />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;