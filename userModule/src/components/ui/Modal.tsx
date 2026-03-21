interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-md w-full">
        <h2 className="text-lg font-medium text-white mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}