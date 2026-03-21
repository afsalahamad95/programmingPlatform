import { useState } from 'react';
import { useStudent } from '../hooks/useStudent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { PlusCircle, Trophy } from 'lucide-react';
import { Achievement } from '../types/student';

// Temporary hardcoded ID - in a real app, this would come from auth
const STUDENT_ID = '65f0123456789abcdef12345';

export default function Achievements() {
  const { student, loading, error, updateStudent } = useStudent(STUDENT_ID);
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!student) return <ErrorMessage message="No student data found" />;

  const handleAddAchievement = async (achievement: Omit<Achievement, 'id'>) => {
    const newAchievement = {
      ...achievement,
      id: Date.now().toString(), // In a real app, this would be handled by the backend
    };
    
    await updateStudent({
      achievements: [...student.achievements, newAchievement],
    });
    
    setIsAddingAchievement(false);
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    
    const updatedAchievements = student.achievements.filter(
      achievement => achievement.id !== achievementId
    );
    
    await updateStudent({ achievements: updatedAchievements });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <button
          onClick={() => setIsAddingAchievement(true)}
          className="flex items-center text-sm font-medium text-white glass-button-primary"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {student.achievements.map((achievement) => (
          <div key={achievement.id} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <Trophy className="h-6 w-6 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-white">{achievement.title}</h3>
              </div>
              <button
                onClick={() => handleDeleteAchievement(achievement.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {new Date(achievement.date).toLocaleDateString()}
            </p>
            {achievement.description && (
              <p className="mt-2 text-sm text-gray-300">{achievement.description}</p>
            )}
          </div>
        ))}
      </div>

      {isAddingAchievement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <h2 className="text-lg font-medium text-white mb-4">Add Achievement</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddAchievement({
                  title: formData.get('title') as string,
                  date: formData.get('date') as string,
                  description: formData.get('description') as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-200">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingAchievement(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-200 bg-white border border-white/20 rounded-md hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm font-medium text-white glass-button-primary"
                >
                  Add Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}