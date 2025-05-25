import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TestAttempt from './components/TestAttempt';
import TestList from './components/TestList';
import ChallengesPage from './components/ChallengesPage';
import ChallengeAttempt from './components/ChallengeAttempt';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center">
                      <span className="text-xl font-bold text-indigo-600">Programming Platform</span>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                      <Link to="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Tests</Link>
                      <Link to="/challenges" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Challenges</Link>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
            <div className="py-8">
              <Routes>
                <Route path="/" element={<TestList />} />
                <Route path="/tests/:id" element={<ErrorBoundary><TestAttempt /></ErrorBoundary>} />
                <Route path="/challenges" element={<ChallengesPage />} />
                <Route path="/challenges/:id" element={<ChallengeAttempt />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;