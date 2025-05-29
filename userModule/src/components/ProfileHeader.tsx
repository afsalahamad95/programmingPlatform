import { Student } from "../types/student";
import { Briefcase, GraduationCap, MapPin } from "lucide-react";
import EditableField from "./EditableField";

interface ProfileHeaderProps {
	student: Student;
	isEditing?: boolean;
	onUpdate?: (field: string, value: string) => void;
}

export default function ProfileHeader({
	student,
	isEditing = false,
	onUpdate,
}: ProfileHeaderProps) {
	const handleUpdate = (field: string) => (value: string) => {
		onUpdate?.(field, value);
	};

	return (
		<div className="bg-white shadow-sm rounded-lg p-6">
			<div className="flex items-start space-x-6">
				<img
					src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
					alt={student.basicInfo.name}
					className="h-24 w-24 rounded-full object-cover"
				/>
				<div className="flex-1">
					<h1 className="text-2xl font-bold text-gray-900">
						{isEditing ? (
							<EditableField
								value={student.basicInfo.name}
								onSave={handleUpdate("name")}
								isEditing={isEditing}
								label="Name"
							/>
						) : (
							student.basicInfo.name
						)}
					</h1>
					<div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
						<div className="mt-2 flex items-center text-sm text-gray-500">
							<GraduationCap className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
							{isEditing ? (
								<EditableField
									value={student.basicInfo.branch}
									onSave={handleUpdate("branch")}
									isEditing={isEditing}
									label="Branch"
								/>
							) : (
								student.basicInfo.branch
							)}
						</div>
						<div className="mt-2 flex items-center text-sm text-gray-500">
							<MapPin className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
							{isEditing ? (
								<EditableField
									value={student.basicInfo.university}
									onSave={handleUpdate("university")}
									isEditing={isEditing}
									label="University"
								/>
							) : (
								student.basicInfo.university
							)}
						</div>
						<div className="mt-2 flex items-center text-sm text-gray-500">
							<Briefcase className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
							Year{" "}
							{Math.ceil(student.basicInfo.currentSemester / 2)}
						</div>
					</div>
				</div>
				<div className="flex flex-col items-end">
					<div className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
						{student.basicInfo.points} Points
					</div>
					<p className="mt-1 text-sm text-gray-500">
						Graduation: {student.basicInfo.graduationYear}
					</p>
				</div>
			</div>
		</div>
	);
}
