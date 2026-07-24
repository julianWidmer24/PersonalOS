interface ChipProps {
  children: React.ReactNode;
  fg?: string;
  bg?: string;
  dot?: boolean;
}

export function Chip({ children, fg, bg, dot }: ChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium tracking-tight"
      style={{ color: fg || 'var(--t2)', background: bg || 'var(--bg-elev)' }}
    >
      {dot && <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />}
      {children}
    </span>
  );
}
