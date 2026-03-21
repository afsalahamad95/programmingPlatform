import { useState } from 'react';
import { useStudent } from '../hooks/useStudent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ProjectCard from '../components/ProjectCard';
import ProjectForm from '../components/ProjectForm';
import { Project } from '../types/student';
import { PlusCircle } from 'lucide-react';

// Temporary hardcoded ID - in a real app, this would come from auth
const STUDENT_ID = '65f0123456789abcdef12345';

export default function Projects() {
  const { student, loading, error, updateStudent } = useStudent(STUDENT_ID);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!student) return <ErrorMessage message="No student data found" />;

  const handleAddProject = async (projectData: Omit<Project, 'id'>) => {
    const newProject = {
      ...projectData,
      id: Date.now().toString(), // In a real app, this would be handled by the backend
    };
    
    await updateStudent({
      projects: [...student.projects, newProject],
    });
    
    setIsAddingProject(false);
  };

  const handleUpdateProject = async (projectData: Omit<Project, 'id'>) => {
    if (!editingProject) return;
    
    const updatedProjects = student.projects.map(project =>
      project.id === editingProject.id
        ? { ...projectData, id: project.id }
        : project
    );
    
    await updateStudent({ projects: updatedProjects });
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    const updatedProjects = student.projects.filter(
      project => project.id !== projectId
    );
    
    await updateStudent({ projects: updatedProjects });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        {!isAddingProject && !editingProject && (
          <button
            onClick={() => setIsAddingProject(true)}
            className="flex items-center text-sm font-medium text-white glass-button-primary"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Project
          </button>
        )}
      </div>

      {(isAddingProject || editingProject) && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-medium text-white mb-4">
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h2>
          <ProjectForm
            project={editingProject || undefined}
            onSubmit={editingProject ? handleUpdateProject : handleAddProject}
            onCancel={() => {
              setIsAddingProject(false);
              setEditingProject(null);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {student.projects.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No projects added yet. Click the "Add Project" button to get started.
          </p>
        ) : (
          student.projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDelete={handleDeleteProject}
            />
          ))
        )}
      </div>
    </div>
  );
}