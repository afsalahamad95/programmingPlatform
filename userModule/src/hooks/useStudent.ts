import { useState, useEffect, useCallback } from "react";
import { Student } from "../types/student";
import { studentApi } from "../services/api";
import { getErrorMessage } from "../utils/errorHandling";
import { useNotification } from "../components/notifications/NotificationProvider";

export function useStudent(id: string) {
	const [student, setStudent] = useState<Student | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { showNotification } = useNotification();

	const fetchStudent = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await studentApi.getStudent(id);
			setStudent(data);
		} catch (err) {
			const errorMessage = getErrorMessage(err);
			setError(errorMessage);
			showNotification(
				"error",
				"Failed to load student data: " + errorMessage
			);
		} finally {
			setLoading(false);
		}
	}, [id, showNotification]);

	useEffect(() => {
		fetchStudent();
	}, [fetchStudent]);

	const updateStudent = async (
		updates: Partial<Student>
	): Promise<boolean> => {
		try {
			setLoading(true);
			setError(null);
			const updatedStudent = await studentApi.updateStudent(id, updates);
			setStudent(updatedStudent);
			showNotification("success", "Profile updated successfully");
			return true;
		} catch (err) {
			const errorMessage = getErrorMessage(err);
			setError(errorMessage);
			showNotification(
				"error",
				"Failed to update profile: " + errorMessage
			);
			return false;
		} finally {
			setLoading(false);
		}
	};

	const deleteStudentData = async (): Promise<boolean> => {
		try {
			setLoading(true);
			setError(null);
			await studentApi.deleteStudent(id);
			setStudent(null);
			showNotification("success", "Profile deleted successfully");
			return true;
		} catch (err) {
			const errorMessage = getErrorMessage(err);
			setError(errorMessage);
			showNotification(
				"error",
				"Failed to delete profile: " + errorMessage
			);
			return false;
		} finally {
			setLoading(false);
		}
	};

	return {
		student,
		loading,
		error,
		updateStudent,
		deleteStudentData,
		refetch: fetchStudent,
	};
}
