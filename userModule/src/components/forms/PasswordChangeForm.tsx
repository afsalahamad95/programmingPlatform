import { FormEvent } from 'react';

interface PasswordChangeFormProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export default function PasswordChangeForm({ onSubmit, onCancel }: PasswordChangeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-200">
          Current Password
        </label>
        <input
          type="password"
          name="currentPassword"
          required
          className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200">
          New Password
        </label>
        <input
          type="password"
          name="newPassword"
          required
          className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200">
          Confirm New Password
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          className="mt-1 block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-200 bg-white border border-white/20 rounded-md hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="text-sm font-medium text-white glass-button-primary"
        >
          Change Password
        </button>
      </div>
    </form>
  );
}