import { useState, useCallback } from "react";
import { useStudent } from "../hooks/useStudent";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ProfileHeader from "../components/ProfileHeader";
import UpdateFeedback from "../components/feedback/UpdateFeedback";
import EditableSkills from "../components/EditableSkills";
import Card from "../components/ui/Card";
import { Code, Award, Briefcase, Edit } from "lucide-react";
import Button from "../components/ui/Button";

const STUDENT_ID = "65f0123456789abcdef12345";

export default function Profile() {
	const { student, loading, error, updateStudent } = useStudent(STUDENT_ID);
	const [isEditing, setIsEditing] = useState(false);
	const [updateStatus, setUpdateStatus] = useState<{
		success: boolean;
		error: string | null;
	}>({ success: false, error: null });

	const handleUpdate = useCallback(
		async (updates: Partial<typeof student>) => {
			try {
				const success = await updateStudent(updates);
				setUpdateStatus({ success: true, error: null });
				setTimeout(
					() => setUpdateStatus({ success: false, error: null }),
					3000
				);
				return success;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to update";
				setUpdateStatus({ success: false, error: errorMessage });
				return false;
			}
		},
		[updateStudent]
	);

	const handleBasicInfoUpdate = useCallback(
		async (field: string, value: string) => {
			if (!student) return;

			const updates = {
				basicInfo: {
					...student.basicInfo,
					[field]: value,
				},
			};

			await handleUpdate(updates);
		},
		[student, handleUpdate]
	);

	const handleSkillsUpdate = useCallback(
		async (
			category: keyof typeof student.technicalSkills,
			skills: string[]
		) => {
			if (!student) return;

			const updates = {
				technicalSkills: {
					...student.technicalSkills,
					[category]: skills,
				},
			};

			await handleUpdate(updates);
		},
		[student, handleUpdate]
	);

	if (loading) return <LoadingSpinner />;
	if (error) return <ErrorMessage message={error} />;
	if (!student) return <ErrorMessage message="No student data found" />;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold text-gray-900">Profile</h1>
				<Button
					variant="secondary"
					icon={Edit}
					onClick={() => setIsEditing(!isEditing)}
				>
					{isEditing ? "Save Changes" : "Edit Profile"}
				</Button>
			</div>

			<ProfileHeader
				student={student}
				isEditing={isEditing}
				onUpdate={handleBasicInfoUpdate}
			/>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<h2 className="text-lg font-medium text-gray-900 mb-4">
						Technical Skills
					</h2>
					<div className="space-y-4">
						<div>
							<h3 className="text-sm font-medium text-gray-500">
								Programming Languages
							</h3>
							<EditableSkills
								skills={
									student.technicalSkills.programmingLanguages
								}
								onUpdate={(skills) =>
									handleSkillsUpdate(
										"programmingLanguages",
										skills
									)
								}
								isEditing={isEditing}
								category="Programming Language"
								className="mt-2"
							/>
						</div>
						<div>
							<h3 className="text-sm font-medium text-gray-500">
								Frameworks
							</h3>
							<EditableSkills
								skills={student.technicalSkills.frameworks}
								onUpdate={(skills) =>
									handleSkillsUpdate("frameworks", skills)
								}
								isEditing={isEditing}
								category="Framework"
								className="mt-2"
							/>
						</div>
						<div>
							<h3 className="text-sm font-medium text-gray-500">
								Tools
							</h3>
							<EditableSkills
								skills={student.technicalSkills.tools}
								onUpdate={(skills) =>
									handleSkillsUpdate("tools", skills)
								}
								isEditing={isEditing}
								category="Tool"
								className="mt-2"
							/>
						</div>
					</div>
				</Card>

				<Card>
					<h2 className="text-lg font-medium text-gray-900 mb-4">
						Overview
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="flex items-center space-x-3">
							<Code className="h-6 w-6 text-indigo-600" />
							<div>
								<p className="text-sm font-medium text-gray-500">
									Projects
								</p>
								<p className="text-lg font-semibold text-gray-900">
									{student.projects.length}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<Award className="h-6 w-6 text-indigo-600" />
							<div>
								<p className="text-sm font-medium text-gray-500">
									Achievements
								</p>
								<p className="text-lg font-semibold text-gray-900">
									{student.achievements.length}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<Briefcase className="h-6 w-6 text-indigo-600" />
							<div>
								<p className="text-sm font-medium text-gray-500">
									Certifications
								</p>
								<p className="text-lg font-semibold text-gray-900">
									{student.certifications.length}
								</p>
							</div>
						</div>
					</div>
				</Card>
			</div>

			<UpdateFeedback
				success={updateStatus.success}
				error={updateStatus.error}
			/>
		</div>
	);
}
