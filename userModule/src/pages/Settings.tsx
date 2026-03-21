import { useState } from 'react';
import { useStudent } from '../hooks/useStudent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { Lock, Bell } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmailUpdateForm from '../components/forms/EmailUpdateForm';
import PasswordChangeForm from '../components/forms/PasswordChangeForm';
import { validateEmail } from '../utils/validation';

const STUDENT_ID = '65f0123456789abcdef12345';

export default function Settings() {
  const { student, loading, error, updateStudent } = useStudent(STUDENT_ID);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!student) return <ErrorMessage message="No student data found" />;

  const handleUpdateEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (!validateEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    await updateStudent({
      basicInfo: {
        ...student.basicInfo,
        email,
      },
    });
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real app, this would make an API call to change the password
    setIsChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-medium text-white mb-4">Account Settings</h2>
        
        <div className="max-w-xl">
          <EmailUpdateForm
            defaultEmail={student.basicInfo.email}
            onSubmit={handleUpdateEmail}
          />

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Password</h3>
                <p className="text-sm text-gray-400">
                  Update your password to keep your account secure
                </p>
              </div>
              <Button
                variant="secondary"
                icon={Lock}
                onClick={() => setIsChangingPassword(true)}
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white mb-4">Notifications</h2>
        <div className="max-w-xl space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="interview"
                name="interview"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-indigo-600 border-white/20 rounded focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="interview" className="text-sm font-medium text-gray-200">
                Interview Reminders
              </label>
              <p className="text-sm text-gray-400">
                Get notified about upcoming mock interviews
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="achievements"
                name="achievements"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-indigo-600 border-white/20 rounded focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="achievements" className="text-sm font-medium text-gray-200">
                Achievement Updates
              </label>
              <p className="text-sm text-gray-400">
                Receive notifications about new achievements and certifications
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        title="Change Password"
        isOpen={isChangingPassword}
        onClose={() => setIsChangingPassword(false)}
      >
        <PasswordChangeForm
          onSubmit={handleChangePassword}
          onCancel={() => setIsChangingPassword(false)}
        />
      </Modal>
    </div>
  );
}