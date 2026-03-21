import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface EditableSkillsProps {
  skills: string[];
  onUpdate: (skills: string[]) => void;
  isEditing: boolean;
  category: string;
  className?: string;
}

export default function EditableSkills({
  skills,
  onUpdate,
  isEditing,
  category,
  className = ''
}: EditableSkillsProps) {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim()) {
      onUpdate([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onUpdate(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 shadow-sm"
          >
            {skill}
            {isEditing && (
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="ml-1.5 inline-flex items-center"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      
      {isEditing && (
        <form onSubmit={handleAddSkill} className="mt-2 flex items-center space-x-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder={`Add ${category}`}
            className="glass-input block w-full py-2 px-3 sm:text-sm transition-colors"
          />
          <button
            type="submit"
            className="inline-flex items-center p-2 text-purple-400 hover:text-purple-300 transition-colors"
            aria-label={`Add ${category}`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>
      )}
    </div>
  );
}