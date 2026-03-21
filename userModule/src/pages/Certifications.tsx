import { useState } from 'react';
import { useStudent } from '../hooks/useStudent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { PlusCircle, Award, ExternalLink } from 'lucide-react';
import { Certification } from '../types/student';

// Temporary hardcoded ID - in a real app, this would come from auth
const STUDENT_ID = '65f0123456789abcdef12345';

export default function Certifications() {
  const { student, loading, error, updateStudent } = useStudent(STUDENT_ID);
  const [isAddingCertification, setIsAddingCertification] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!student) return <ErrorMessage message="No student data found" />;

  const handleAddCertification = async (certification: Omit<Certification, 'id'>) => {
    const newCertification = {
      ...certification,
      id: Date.now().toString(), // In a real app, this would be handled by the backend
    };
    
    await updateStudent({
      certifications: [...student.certifications, newCertification],
    });
    
    setIsAddingCertification(false);
  };

  const handleDeleteCertification = async (certificationId: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    
    const updatedCertifications = student.certifications.filter(
      cert => cert.id !== certificationId
    );
    
    await updateStudent({ certifications: updatedCertifications });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Certifications</h1>
        <button
          onClick={() => setIsAddingCertification(true)}
          className="flex items-center text-sm font-medium text-white glass-button-primary"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Certification
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {student.certifications.map((certification) => (
          <div key={certification.id} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <Award className="h-6 w-6 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-white">{certification.name}</h3>
              </div>
              <button
                onClick={() => handleDeleteCertification(certification.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">{certification.provider}</p>
            <div className="mt-2 text-sm text-gray-300">
              <p>Issued: {new Date(certification.issueDate).toLocaleDateString()}</p>
              {certification.expiryDate && (
                <p>Expires: {new Date(certification.expiryDate).toLocaleDateString()}</p>
              )}
            </div>
            {certification.credentialUrl && (
              <a
                href={certification.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
              >
                View Credential
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
          </div>
        ))}
      </div>

      {isAddingCertification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <h2 className="text-lg font-medium text-white mb-4">Add Certification</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddCertification({
                  name: formData.get('name') as string,
                  provider: formData.get('provider') as string,
                  issueDate: formData.get('issueDate') as string,
                  expiryDate: formData.get('expiryDate') as string || undefined,
                  credentialUrl: formData.get('credentialUrl') as string || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-200">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Provider</label>
                <input
                  type="text"
                  name="provider"
                  required
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Issue Date</label>
                <input
                  type="date"
                  name="issueDate"
                  required
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Credential URL</label>
                <input
                  type="url"
                  name="credentialUrl"
                  className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingCertification(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-200 bg-white border border-white/20 rounded-md hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm font-medium text-white glass-button-primary"
                >
                  Add Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}