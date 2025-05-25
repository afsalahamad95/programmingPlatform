import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import Login from './Login';

const AppContent: React.FC = () => {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (!user) {
		return <Login />;
	}

	return (
		<Router>
			<Layout />
		</Router>
	);
};

export default AppContent; 