interface IconBtnProps {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
}

export function IconBtn({ children, title, onClick }: IconBtnProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-6 h-6 rounded-md grid place-items-center text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors"
    >
      {children}
    </button>
  );
}
