import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { jwtDecode } from 'jwt-decode';

interface User {
	userId: string; // Use userId to match JWT payload
	id?: string; // Keep id as optional for potential backward compatibility or other uses
	email: string;
	fullName?: string; // Make fullName optional
	institution?: string; // Make institution optional
	department?: string; // Make department optional
	studentId: string;
	exp?: number;  // JWT expiration timestamp
	iat?: number;  // JWT issued at timestamp
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const checkAuth = () => {
		try {
			const token = localStorage.getItem('token');
			if (!token) {
				setUser(null);
				setError('Not authenticated');
				return;
			}

			// Decode the token
			const decoded = jwtDecode<User>(token);

			// Check if token is expired
			if (decoded.exp && decoded.exp * 1000 < Date.now()) {
				localStorage.removeItem('token');
				setUser(null);
				setError('Token expired');
				return;
			}

			// Map userId to id for consistency if backend sends userId
			const userWithId: User = {
				...decoded,
				id: decoded.userId // Use userId as the primary identifier
			};

			setUser(userWithId);
			setError(null);
		} catch (err) {
			localStorage.removeItem('token');
			setUser(null);
			setError('Invalid token');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		checkAuth();
	}, []);

	const login = async (email: string, password: string) => {
		try {
			setLoading(true);
			setError(null);
			const response = await api.post('/auth/login', { email, password });
			const { token, user } = response.data;

			// Store token in localStorage
			localStorage.setItem('token', token);

			// Set user from decoded token
			const decoded = jwtDecode<User>(token);
			setUser(decoded);
		} catch (err) {
			setError('Invalid email or password');
			throw err;
		} finally {
			setLoading(false);
		}
	};

	const logout = async () => {
		try {
			const token = localStorage.getItem('token');
			if (token) {
				await api.post('/auth/logout', {}, {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});
			}
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			// Always clear local storage and state, even if the API call fails
			localStorage.removeItem('token');
			setUser(null);
			setLoading(false);
		}
	};

	return (
		<AuthContext.Provider value={{ user, loading, error, login, logout, checkAuth }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
} 