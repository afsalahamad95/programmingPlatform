import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import TestList from './TestList';
import TestAttempt from './TestAttempt';
import UserProfile from './UserProfile';
import { useQuery } from 'react-query';
import { getTests } from '../api';

const Layout: React.FC = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const { data: tests = [] } = useQuery('tests', getTests);

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error('Failed to logout:', error);
		}
	};

	return (
		<div className="min-h-screen bg-gray-100">
			<nav className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex">
							<div className="flex-shrink-0 flex items-center">
								<Link to="/" className="text-xl font-bold text-blue-600">
									QMS Platform
								</Link>
							</div>
							<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
								<Link
									to="/"
									className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
								>
									Tests
								</Link>
								<Link
									to="/profile"
									className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
								>
									Profile
								</Link>
							</div>
						</div>
						<div className="flex items-center">
							<span className="text-gray-700 mr-4">{user?.fullName}</span>
							<button
								onClick={handleLogout}
								className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
							>
								<LogOut className="w-5 h-5 mr-2" />
								Logout
							</button>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<Routes>
					<Route
						path="/"
						element={
							<TestList
								tests={tests}
								onViewTest={(test) => navigate(`/test/${test.id}`)}
								onBack={() => navigate('/')}
							/>
						}
					/>
					<Route path="/test/:id" element={<TestAttempt />} />
					<Route path="/profile" element={<UserProfile />} />
				</Routes>
			</main>
		</div>
	);
};

export default Layout; 