import React from 'react';
import {Plus, ListChecks, AlignLeft, Code, ClipboardList, UserCircle, LogOut} from 'lucide-react';
import {useQuery, useMutation, useQueryClient} from 'react-query';
import QuestionForm from './components/QuestionForm';
import TestScheduler from './components/TestScheduler';
import QuestionBank from './components/QuestionBank';
import TestList from './components/TestList';
import TestAttempt from './components/TestAttempt';
import UserProfile from './components/UserProfile';
import HealthCheck from './components/HealthCheck';
import Login from './components/Login';
import {UserProvider, useUser} from './contexts/UserContext';
import {WebSocketProvider} from './contexts/WebSocketProvider';
import * as api from './api';

function AppContent() {
  const queryClient = useQueryClient();
  const {user, setUser} = useUser();
  const [selectedType, setSelectedType] = React.useState(null);
  const [showScheduler, setShowScheduler] = React.useState(false);
  const [showTests, setShowTests] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [selectedTest, setSelectedTest] = React.useState(null);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // If user is not logged in, show login page
  if (!user) {
    return <Login onSuccess={() => {}} />;
  }

  const {data: questions = [], isLoading: isLoadingQuestions, error: questionsError} = useQuery(
    'questions',
    api.getQuestions,
    {
      initialData: [],
      retry: 3,
      onError: (error) => {
        console.error('Failed to fetch questions:', error);
      },
    }
  );

  const {data: tests = [], isLoading: isLoadingTests, error: testsError} = useQuery(
    'tests',
    api.getTests,
    {
      initialData: [],
      retry: 3,
      onError: (error) => {
        console.error('Failed to fetch tests:', error);
      },
    }
  );

  const createQuestionMutation = useMutation(api.createQuestion, {
    onSuccess: () => {
      queryClient.invalidateQueries('questions');
      setSelectedType(null);
    },
    onError: (error) => {
      console.error('Failed to create question:', error);
    },
  });

  const createTestMutation = useMutation(api.createTest, {
    onSuccess: () => {
      queryClient.invalidateQueries('tests');
      setShowScheduler(false);
    },
    onError: (error) => {
      console.error('Failed to create test:', error);
    },
  });

  const submitTestMutation = useMutation(
    (data) => api.submitTest(data.testId, {
      testId: data.testId,
      studentId: user.id,
      answers: data.answers,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tests');
        queryClient.invalidateQueries('testResults');
        setSelectedTest(null);
      },
      onError: (error) => {
        console.error('Failed to submit test:', error);
      },
    }
  );

  const createUserMutation = useMutation(api.createUser, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('users');
      setShowProfile(false);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });

  const handleQuestionSubmit = (data) => {
    createQuestionMutation.mutate(data);
  };

  const handleTestSchedule = (data) => {
    createTestMutation.mutate(data);
  };

  const handleTestSubmit = (answers) => {
    if (selectedTest && user) {
      submitTestMutation.mutate({
        testId: selectedTest.id,
        answers,
      });
    } else {
      console.error('Cannot submit test: No user logged in');
    }
  };

  const handleProfileSave = (data) => {
    createUserMutation.mutate(data);
  };

  const handleBack = () => {
    setSelectedType(null);
    setShowScheduler(false);
    setShowTests(false);
    setShowProfile(false);
    setSelectedTest(null);
  };

  if (selectedTest) {
    return (
      <TestAttempt
        test={selectedTest}
        onSubmit={handleTestSubmit}
        onExit={handleBack}
      />
    );
  }

  if (isLoadingQuestions || isLoadingTests) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (questionsError || testsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">Question Management System</h1>
              <HealthCheck />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowProfile(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserCircle className="w-5 h-5 mr-2" />
                Update Profile
              </button>
              <button
                onClick={() => setShowTests(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                View Tests
              </button>
              <button
                onClick={() => setShowScheduler(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={!Array.isArray(questions) || questions.length === 0}
              >
                <Plus className="w-5 h-5 mr-2" />
                Schedule Test
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {!selectedType && !showScheduler && !showTests && !showProfile && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Create New Question</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => setSelectedType('mcq')}
                      className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <ListChecks className="w-6 h-6 text-indigo-600" />
                      <span className="font-medium">Multiple Choice Question</span>
                    </button>
                    <button
                      onClick={() => setSelectedType('subjective')}
                      className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <AlignLeft className="w-6 h-6 text-indigo-600" />
                      <span className="font-medium">Subjective Question</span>
                    </button>
                    <button
                      onClick={() => setSelectedType('coding')}
                      className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <Code className="w-6 h-6 text-indigo-600" />
                      <span className="font-medium">Coding Question</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedType && (
                <QuestionForm
                  type={selectedType}
                  onSubmit={handleQuestionSubmit}
                  onBack={handleBack}
                />
              )}

              {showScheduler && (
                <TestScheduler
                  questions={questions}
                  onSubmit={handleTestSchedule}
                  onBack={handleBack}
                />
              )}

              {showTests && (
                <TestList
                  tests={tests}
                  onTestSelect={setSelectedTest}
                  onBack={handleBack}
                />
              )}

              {showProfile && (
                <UserProfile
                  onSave={handleProfileSave}
                  onBack={handleBack}
                />
              )}
            </div>

            {!selectedType && !showScheduler && !showTests && !showProfile && (
              <QuestionBank questions={questions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </UserProvider>
  );
}