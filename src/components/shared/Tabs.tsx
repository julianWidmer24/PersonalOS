interface TabsProps {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
  size?: 'sm' | 'md';
}

export function Tabs({ tabs, value, onChange, size = 'sm' }: TabsProps) {
  return (
    <div className="inline-flex items-center rounded-md bg-[var(--bg-elev)] p-0.5 border border-[var(--line)]">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 ${size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-xs'} rounded-[5px] font-medium tracking-tight transition-colors ${
            value === t
              ? 'bg-[var(--bg-card-hi)] text-[var(--t1)] shadow-[0_0_0_1px_var(--line-hi)]'
              : 'text-[var(--t3)] hover:text-[var(--t2)]'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
