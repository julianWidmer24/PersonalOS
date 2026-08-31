import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface LightboxPhoto {
  src: string;
  /** Bold caption line, e.g. "Week 14". */
  label: string;
  /** Muted caption line, e.g. "Today" or a date. */
  meta?: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

/** Past this much horizontal travel (or this much flick speed) a swipe commits. */
const COMMIT_RATIO = 0.22;
const COMMIT_VELOCITY = 0.45; // px per ms

function NavBtn({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous photo' : 'Next photo'}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === 'prev' ? 'left-2 md:left-4' : 'right-2 md:right-4'}
        w-11 h-11 rounded-full grid place-items-center z-20
        bg-black/45 backdrop-blur-sm border border-white/15 text-white
        hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none transition-all`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={dir === 'prev' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function PhotoLightbox({ photos, index, onIndexChange, onClose }: PhotoLightboxProps) {
  const [drag, setDrag] = useState(0);            // live finger/mouse offset in px
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, t: 0, axis: '' as '' | 'x' | 'y' });
  const movedRef = useRef(false);  // a drag just happened → the trailing click isn't a tap
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const count = photos.length;
  const go = useCallback((i: number) => onIndexChange(Math.min(count - 1, Math.max(0, i))), [count, onIndexChange]);

  // Keyboard: arrows / home / end / escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(count - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, go, onClose]);

  // Lock the page behind the overlay while it's open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keep the active thumbnail in view as the carousel advances.
  useEffect(() => {
    thumbsRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  const width = () => trackRef.current?.clientWidth || window.innerWidth;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Never capture the pointer off the arrow buttons — capture retargets their click.
    if ((e.target as HTMLElement).closest('button')) return;
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), axis: '' };
    setDragging(true);
    setDrag(0);
    movedRef.current = false;
    trackRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // Lock to an axis on first meaningful movement so a vertical drag doesn't nudge the track.
    if (!startRef.current.axis && Math.hypot(dx, dy) > 6) {
      startRef.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (startRef.current.axis !== 'x') return;
    if (Math.abs(dx) > 4) movedRef.current = true;
    // Rubber-band when pulling past the first or last photo.
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
    setDrag(atEdge ? dx / 3.5 : dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    trackRef.current?.releasePointerCapture?.(e.pointerId);
    setDragging(false);
    const dx = drag;
    const elapsed = Math.max(1, performance.now() - startRef.current.t);
    const velocity = Math.abs(dx) / elapsed;
    const committed = Math.abs(dx) > width() * COMMIT_RATIO || velocity > COMMIT_VELOCITY;
    if (committed && Math.abs(dx) > 8) go(index + (dx < 0 ? 1 : -1));
    setDrag(0);
  };

  // Tapping the empty space around the photo closes; tapping the photo itself doesn't.
  const onTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movedRef.current) { movedRef.current = false; return; }
    if ((e.target as HTMLElement).tagName === 'IMG') return;
    onClose();
  };

  const photo = photos[index];
  const offset = `calc(${-index * 100}% + ${drag}px)`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Progress photos"
      className="fixed inset-0 z-[300] flex flex-col bg-black/[.92] backdrop-blur-md lightbox-in"
      style={{ fontFamily: '"Geist", system-ui, sans-serif' }}
      onClick={onClose}
    >
      {/* Top bar: caption + counter + close */}
      <div
        className="relative z-20 flex items-center gap-3 px-3 md:px-5 pt-3 pb-2 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-white/95 truncate">{photo?.label}</div>
          {photo?.meta && <div className="text-[11px] text-white/50 truncate">{photo.meta}</div>}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[11.5px] tnum text-white/60 tabular-nums" aria-live="polite">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="w-11 h-11 -mr-2 grid place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Swipeable track */}
      <div
        ref={trackRef}
        onClick={onTrackClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative flex-1 min-h-0 overflow-hidden select-none"
        style={{ touchAction: 'pan-y', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(${offset}, 0, 0)`,
            transition: dragging ? 'none' : 'transform 320ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          {photos.map((p, i) => (
            <div key={i} className="w-full h-full shrink-0 grid place-items-center px-3 md:px-14 pb-2">
              {/* Only the visible photo and its neighbours are mounted with a src. */}
              {Math.abs(i - index) <= 1 && (
                <img
                  src={p.src}
                  alt={p.label}
                  draggable={false}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              )}
            </div>
          ))}
        </div>
        <NavBtn dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
        <NavBtn dir="next" disabled={index === count - 1} onClick={() => go(index + 1)} />
      </div>

      {/* Thumbnail rail */}
      {count > 1 && (
        <div
          ref={thumbsRef}
          onClick={e => e.stopPropagation()}
          className="shrink-0 flex gap-1.5 justify-start md:justify-center overflow-x-auto pos-scroll px-3 md:px-5 py-3"
        >
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              data-active={i === index}
              onClick={() => go(i)}
              aria-label={`Go to ${p.label}`}
              aria-current={i === index}
              className={`relative shrink-0 rounded-md overflow-hidden border transition-all ${
                i === index
                  ? 'border-[var(--accent)] opacity-100 scale-[1.03]'
                  : 'border-white/15 opacity-45 hover:opacity-80'
              }`}
              style={{ width: 36, height: 48 }}
            >
              <img src={p.src} alt="" draggable={false} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
