import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../api';

interface User {
	id: string;
	fullName: string;
	email: string;
	phone: string;
	institution: string;
	department: string;
	studentId?: string;
	bio: string;
}

interface UserContextType {
	user: User | null;
	setUser: (user: User | null) => void;
	loading: boolean;
	error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Check if user is stored in localStorage
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			try {
				setUser(JSON.parse(storedUser));
			} catch (err) {
				console.error('Error parsing stored user:', err);
				localStorage.removeItem('user');
			}
		}
		setLoading(false);
	}, []);

	const handleSetUser = (newUser: User | null) => {
		setUser(newUser);
		if (newUser) {
			localStorage.setItem('user', JSON.stringify(newUser));
		} else {
			localStorage.removeItem('user');
		}
	};

	return (
		<UserContext.Provider value={{ user, setUser: handleSetUser, loading, error }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
} 