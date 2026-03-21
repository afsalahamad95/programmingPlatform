import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  label: string;
  type?: 'text' | 'email' | 'number';
}

export default function EditableField({
  value,
  onSave,
  isEditing,
  label,
  type = 'text'
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  if (!isEditing) {
    return <span className="text-white">{value}</span>;
  }

  return (
    <div className="flex items-center space-x-2">
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="block w-full rounded-md border-white/20 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        aria-label={label}
      />
      <button
        onClick={() => onSave(editValue)}
        className="inline-flex items-center p-1 text-green-600 hover:text-green-700"
        aria-label="Save"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={() => setEditValue(value)}
        className="inline-flex items-center p-1 text-red-600 hover:text-red-700"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}