import React, { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { useAuth } from "../contexts/AuthContext";
import { updateUser } from "../api";

const UserProfile: React.FC = () => {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		fullName: user?.fullName || "",
		email: user?.email || "",
		institution: user?.institution || "",
		department: user?.department || "",
		studentId: user?.studentId || "",
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const updateUserMutation = useMutation(
		(data: typeof formData) => {
			if (!user?.id) {
				throw new Error("User not authenticated");
			}
			return updateUser(user.id, data);
		},
		{
			onSuccess: () => {
				queryClient.invalidateQueries("user");
				setSuccess(true);
				setError(null);
			},
			onError: (error: any) => {
				const errorMessage =
					error.response?.data?.error ||
					error.message ||
					"Failed to update profile";
				setError(errorMessage.toString());
				setSuccess(false);
				console.error("Failed to update profile:", error);
			},
		}
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			setError("Please enter a valid email address");
			return;
		}

		// Validate other required fields
		if (!formData.fullName.trim()) {
			setError("Full name is required");
			return;
		}

		try {
			await updateUserMutation.mutateAsync(formData);
		} catch (error) {
			// Error is already handled in the mutation
			console.error("Error updating profile:", error);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	return (
		<div className="max-w-3xl mx-auto">
			<div className="bg-white shadow sm:rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h3 className="text-lg font-medium text-gray-900">
						Profile
					</h3>
					<div className="mt-6">
						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label
									htmlFor="fullName"
									className="block text-sm font-medium text-gray-700"
								>
									Full Name
								</label>
								<input
									type="text"
									name="fullName"
									id="fullName"
									value={formData.fullName}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700"
								>
									Email
								</label>
								<input
									type="email"
									name="email"
									id="email"
									value={formData.email}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label
									htmlFor="institution"
									className="block text-sm font-medium text-gray-700"
								>
									Institution
								</label>
								<input
									type="text"
									name="institution"
									id="institution"
									value={formData.institution}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label
									htmlFor="department"
									className="block text-sm font-medium text-gray-700"
								>
									Department
								</label>
								<input
									type="text"
									name="department"
									id="department"
									value={formData.department}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label
									htmlFor="studentId"
									className="block text-sm font-medium text-gray-700"
								>
									Student ID
								</label>
								<input
									type="text"
									name="studentId"
									id="studentId"
									value={formData.studentId}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							{error && (
								<div className="text-red-500 text-sm">
									{error}
								</div>
							)}

							{success && (
								<div className="text-green-500 text-sm">
									Profile updated successfully
								</div>
							)}

							<div>
								<button
									type="submit"
									className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									Update Profile
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserProfile;
