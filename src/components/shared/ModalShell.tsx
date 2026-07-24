import { createPortal } from 'react-dom';

interface ModalShellProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalShell({ children, onClose }: ModalShellProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ fontFamily: '"Geist", system-ui, sans-serif' }}
    >
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--line-hi)] bg-[var(--bg-elev)] shadow-2xl">
        {children}
      </div>
    </div>,
    document.body
  );
}
