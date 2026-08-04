import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { WidgetSizeContext } from '../../context/WidgetSizeContext';

// Grid geometry — must stay in sync with `.pos-grid` in index.css.
const ROW_PX = 8;
const GAP_PX = 16;
const MIN_HEIGHT = 140;
const LAYOUT_KEY = 'pos:widget-layout:v1';
const ORDER_KEY = 'pos:widget-order:v1';

interface StoredLayout {
  cols?: number;
  height?: number | null;
}

function loadLayout(): Record<string, StoredLayout> {
  try {
    const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (v && typeof v === 'object') return v;
  } catch { /* ignore */ }
  return {};
}

function persistLayout(id: string, entry: StoredLayout) {
  try {
    const all = loadLayout();
    all[id] = entry;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function loadOrder(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null');
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  } catch { /* ignore */ }
  return [];
}

function persistOrder(order: string[]) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

/** Saved order, minus widgets that no longer exist, plus new ones at the end. */
function mergeOrder(saved: string[], ids: string[]): string[] {
  const present = saved.filter(id => ids.includes(id));
  return [...present, ...ids.filter(id => !present.includes(id))];
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from === to) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// Columns available at the current breakpoint (mirrors the .pos-grid media queries).
function useGridCols() {
  const read = () =>
    typeof window === 'undefined' ? 3 : window.innerWidth >= 1280 ? 3 : window.innerWidth >= 768 ? 2 : 1;
  const [cols, setCols] = useState(read);
  useEffect(() => {
    const onResize = () => setCols(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

/* --------------------------------------------------------------- grid api */

interface DropOutline { left: number; top: number; width: number; height: number }

interface GridApi {
  registerTile: (id: string, el: HTMLDivElement | null) => void;
  beginDrag: (id: string, e: React.PointerEvent) => void;
  nudge: (id: string, dir: -1 | 1) => void;
  dragId: string | null;
}

const GridContext = createContext<GridApi | null>(null);

/** Document-space box, so page scrolling during a drag can't invalidate it. */
interface TileBox { id: string; left: number; top: number; right: number; bottom: number; width: number; height: number }

interface DragState {
  id: string;
  label: string;
  x: number;
  y: number;
  drop: DropOutline | null;
}

export function WidgetGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const items = useMemo(
    () => Children.toArray(children).filter(isValidElement) as ReactElement<{ id: string }>[],
    [children],
  );
  const ids = useMemo(() => items.map(i => i.props.id), [items]);

  const [savedOrder, setSavedOrder] = useState<string[]>(loadOrder);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Stable mutable map of mounted tiles (a ref would be read inside the
  // callbacks handed to context, which the compiler rightly flags).
  const [tiles] = useState(() => new Map<string, HTMLDivElement>());

  // Derived, so adding or removing a widget needs no sync effect.
  const order = useMemo(() => mergeOrder(savedOrder, ids), [savedOrder, ids]);

  const ordered = useMemo(() => {
    const pos = new Map(order.map((id, i) => [id, i]));
    return [...items].sort((a, b) => (pos.get(a.props.id) ?? 0) - (pos.get(b.props.id) ?? 0));
  }, [items, order]);

  const registerTile = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) tiles.set(id, el);
      else tiles.delete(id);
    },
    [tiles],
  );

  const moveTo = useCallback(
    (id: string, targetId: string) => {
      const from = order.indexOf(id);
      const to = order.indexOf(targetId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(order, from, to);
      persistOrder(next);
      setSavedOrder(next);
    },
    [order],
  );

  const nudge = useCallback(
    (id: string, dir: -1 | 1) => {
      const from = order.indexOf(id);
      if (from === -1) return;
      const next = arrayMove(order, from, clamp(from + dir, 0, order.length - 1));
      if (sameOrder(next, order)) return;
      persistOrder(next);
      setSavedOrder(next);
    },
    [order],
  );

  const beginDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const self = tiles.get(id);
      const gridEl = self?.parentElement;
      if (!gridEl || !self) return;
      e.preventDefault();
      e.stopPropagation();

      const sx = window.scrollX;
      const sy = window.scrollY;
      const gridRect = gridEl.getBoundingClientRect();
      const originX = gridRect.left + sx;
      const originY = gridRect.top + sy;
      const gridWidth = gridRect.width;

      const boxes: TileBox[] = order
        .filter(oid => tiles.has(oid))
        .map(oid => {
          const r = tiles.get(oid)!.getBoundingClientRect();
          return {
            id: oid,
            left: r.left + sx,
            top: r.top + sy,
            right: r.right + sx,
            bottom: r.bottom + sy,
            width: r.width,
            height: r.height,
          };
        });

      const sourceIdx = boxes.findIndex(b => b.id === id);
      if (sourceIdx === -1) return;
      const selfBox = boxes[sourceIdx];
      const label = self.querySelector('h3')?.textContent?.trim() || 'Widget';
      let targetId = id;

      setDrag({ id, label, x: e.clientX, y: e.clientY, drop: null });
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const onMove = (ev: PointerEvent) => {
        // Keep the drag usable on a long dashboard.
        if (ev.clientY < 90) window.scrollBy(0, -14);
        else if (ev.clientY > window.innerHeight - 90) window.scrollBy(0, 14);

        const px = ev.clientX + window.scrollX;
        const py = ev.clientY + window.scrollY;

        let idx = boxes.findIndex(b => px >= b.left && px <= b.right && py >= b.top && py <= b.bottom);
        if (idx === -1) {
          let best = Infinity;
          boxes.forEach((b, i) => {
            const dx = px - (b.left + b.width / 2);
            const dy = py - (b.top + b.height / 2);
            const d = dx * dx + dy * dy;
            if (d < best) { best = d; idx = i; }
          });
        }
        if (idx === -1) return;

        const t = boxes[idx];
        targetId = t.id;
        // Outline shows the dragged widget's own footprint at the target slot.
        const left = clamp(t.left - originX, 0, Math.max(0, gridWidth - selfBox.width));
        const drop = { left, top: t.top - originY, width: selfBox.width, height: selfBox.height };
        setDrag(d => (d ? { ...d, x: ev.clientX, y: ev.clientY, drop } : d));
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setDrag(null);
        if (targetId !== id) moveTo(id, targetId);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [order, tiles, moveTo],
  );

  return (
    <GridContext.Provider value={{ registerTile, beginDrag, nudge, dragId: drag?.id ?? null }}>
      <div className={`pos-grid relative ${className}`}>
        {ordered}
        {drag?.drop && (
          <div
            className="pos-drop-outline"
            style={{ left: drag.drop.left, top: drag.drop.top, width: drag.drop.width, height: drag.drop.height }}
          />
        )}
      </div>
      {drag &&
        createPortal(
          <div className="pos-drag-chip" style={{ left: drag.x + 14, top: drag.y + 14 }}>
            {drag.label}
          </div>,
          document.body,
        )}
    </GridContext.Provider>
  );
}

/* ----------------------------------------------------------------- widget */

interface WidgetProps {
  /** stable key used to persist this widget's size and position */
  id: string;
  children: React.ReactNode;
  defaultCols?: number;
}

/**
 * A dashboard tile the user can rearrange (grip on the left edge) and
 * drag-resize (corner handle). Horizontal resize snaps to whole grid columns,
 * vertical to 8px rows. Until it is resized the tile keeps its natural
 * height; once a height is set the card inside fills the box and scrolls.
 */
export function Widget({ id, children, defaultCols = 1 }: WidgetProps) {
  const maxCols = useGridCols();
  const grid = useContext(GridContext);

  // Single source of truth for the persisted box; `null` height = hug content.
  const [layout, setLayout] = useState<Required<StoredLayout>>(() => {
    const s = loadLayout()[id] ?? {};
    return { cols: s.cols ?? defaultCols, height: s.height ?? null };
  });
  const { cols, height } = layout;
  const setHeight = (h: number | null) => setLayout(l => ({ ...l, height: h }));

  const [autoHeight, setAutoHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const effCols = Math.min(cols, maxCols);
  const isMoving = grid?.dragId === id;

  // Track the content's natural height so the grid row span always fits it.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setAutoHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effHeight = height ?? autoHeight;
  const rowSpan = Math.max(1, Math.ceil((effHeight + GAP_PX) / (ROW_PX + GAP_PX)));

  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      outerRef.current = el;
      grid?.registerTile(id, el);
    },
    [grid, id],
  );

  const startResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const outer = outerRef.current;
    const gridEl = outer?.parentElement;
    if (!outer || !gridEl) return;

    const gridW = gridEl.getBoundingClientRect().width;
    const pitch = (gridW - GAP_PX * (maxCols - 1)) / maxCols + GAP_PX;
    const startX = e.clientX;
    const startY = e.clientY;
    const startH = outer.getBoundingClientRect().height;
    const startCols = effCols;
    const latest = { cols: startCols, height: startH as number | null };

    setDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';

    const onMove = (ev: PointerEvent) => {
      const nextH = Math.max(MIN_HEIGHT, Math.round((startH + ev.clientY - startY) / ROW_PX) * ROW_PX);
      const nextC = clamp(startCols + Math.round((ev.clientX - startX) / pitch), 1, maxCols);
      latest.height = nextH;
      latest.cols = nextC;
      setLayout({ cols: nextC, height: nextH });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDragging(false);
      persistLayout(id, latest);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const reset = () => {
    setLayout({ cols: defaultCols, height: null });
    persistLayout(id, { cols: defaultCols, height: null });
  };

  const onHandleKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 80 : 24;
    const base = height ?? autoHeight;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(MIN_HEIGHT, base + (e.key === 'ArrowDown' ? step : -step));
      setHeight(next);
      persistLayout(id, { cols: effCols, height: next });
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = clamp(effCols + (e.key === 'ArrowRight' ? 1 : -1), 1, maxCols);
      setLayout({ cols: next, height });
      persistLayout(id, { cols: next, height });
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      reset();
    }
  };

  const onGripKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); grid?.nudge(id, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); grid?.nudge(id, -1); }
  };

  const size = useMemo(
    () => ({ cols: effCols, maxCols, fixedHeight: height !== null, width, height: effHeight }),
    [effCols, maxCols, height, width, effHeight],
  );

  return (
    <div
      ref={attachRef}
      className={`pos-widget group/widget relative ${dragging ? 'pos-widget-dragging' : ''} ${
        isMoving ? 'pos-widget-ghost' : ''
      }`}
      style={{ gridColumn: `span ${effCols}`, gridRow: `span ${rowSpan}` }}
    >
      <div ref={contentRef} style={height !== null ? { height } : undefined}>
        <WidgetSizeContext.Provider value={size}>{children}</WidgetSizeContext.Provider>
      </div>

      {grid && (
        <button
          type="button"
          aria-label="Move widget (arrow keys to reposition)"
          title="Drag to reposition"
          onPointerDown={e => grid.beginDrag(id, e)}
          onKeyDown={onGripKey}
          className="pos-drag-handle"
        >
          <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true" fill="currentColor">
            <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
            <circle cx="2" cy="6" r="1" /><circle cx="6" cy="6" r="1" />
            <circle cx="2" cy="10" r="1" /><circle cx="6" cy="10" r="1" />
          </svg>
        </button>
      )}

      <button
        type="button"
        aria-label="Resize widget (arrow keys to resize, Escape to reset)"
        title="Drag to resize · double-click to reset"
        onPointerDown={startResize}
        onDoubleClick={reset}
        onKeyDown={onHandleKey}
        className={`pos-resize-handle ${dragging ? 'opacity-100' : ''}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {dragging && (
        <div className="absolute -top-2 right-2 z-30 rounded-md border border-[var(--line-hi)] bg-[var(--bg-elev)] px-2 py-0.5 text-[10.5px] tnum text-[var(--t2)] shadow-lg pointer-events-none">
          {effCols} col{effCols > 1 ? 's' : ''} · {Math.round(effHeight)}px
        </div>
      )}
    </div>
  );
}
