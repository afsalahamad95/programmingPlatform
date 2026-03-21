import { Code, Calendar, Link as LinkIcon } from 'lucide-react';
import { Project } from '../types/student';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium text-white">{project.name}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(project)}
            className="text-sm text-gray-300 hover:text-indigo-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-sm text-gray-400">{project.role}</div>
      
      <p className="mt-3 text-gray-300">{project.description}</p>
      
      <div className="mt-4 flex items-center space-x-4">
        <div className="flex items-center text-sm text-gray-400">
          <Code className="h-4 w-4 mr-1" />
          {project.technologies.join(', ')}
        </div>
        <div className="flex items-center text-sm text-gray-400">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date(project.startDate).toLocaleDateString()} - 
          {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Present'}
        </div>
      </div>
      
      {(project.links?.github || project.links?.live) && (
        <div className="mt-4 flex space-x-4">
          {project.links.github && (
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              GitHub
            </a>
          )}
          {project.links.live && (
            <a
              href={project.links.live}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              Live Demo
            </a>
          )}
        </div>
      )}
    </div>
  );
}