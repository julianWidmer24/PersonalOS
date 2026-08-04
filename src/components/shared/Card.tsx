import { useWidgetSize } from '../../context/WidgetSizeContext';

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  kicker?: string;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
  dense?: boolean;
  /** the card body manages its own scrolling — don't wrap it in one */
  ownScroll?: boolean;
}

export function Card({ title, action, kicker, children, className = '', noPad, dense, ownScroll }: CardProps) {
  // Inside a drag-resized Widget the card stretches to the box the user chose
  // and its body scrolls, instead of overflowing or leaving dead space.
  const fill = useWidgetSize()?.fixedHeight ?? false;

  return (
    <section
      className={`relative flex flex-col rounded-xl border border-[var(--line)] bg-[var(--bg-card)] hover:border-[var(--line-hi)] transition-colors ${
        fill ? 'h-full overflow-hidden' : ''
      } ${className}`}
    >
      {title && (
        <header className={`flex items-center justify-between gap-2 shrink-0 ${dense ? 'px-4 pt-3 pb-2' : 'px-5 pt-4 pb-3'}`}>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">{title}</h3>
            {kicker && <span className="text-[11px] text-[var(--t3)] tnum">{kicker}</span>}
          </div>
          {action && <div className="flex items-center gap-1 text-[var(--t2)] shrink-0">{action}</div>}
        </header>
      )}
      <div
        className={`${noPad ? '' : dense ? 'px-4 pb-4' : 'px-5 pb-5'} ${
          fill ? `flex-1 min-h-0 ${ownScroll ? 'flex flex-col' : 'overflow-y-auto pos-scroll'}` : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
}
