import { FormEvent } from 'react';
import { Mail } from 'lucide-react';

interface EmailUpdateFormProps {
  defaultEmail: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function EmailUpdateForm({ defaultEmail, onSubmit }: EmailUpdateFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-200"
        >
          Email Address
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="email"
            name="email"
            id="email"
            defaultValue={defaultEmail}
            className="block w-full pl-10 rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white glass-button-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Update Email
        </button>
      </div>
    </form>
  );
}